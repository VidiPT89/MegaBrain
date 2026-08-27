import { homedir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "../cache/semantic-cache.js";
import { route } from "../router/tier-router.js";
import { matchSkills } from "../skills/loader.js";
import { loadRules } from "../rules/loader.js";
import { MemoryStore } from "../memory/store.js";
import { builtinTools, describeTools, findTool, type Tool } from "../tools/registry.js";
import { connectConfiguredMcpServers, type McpClient } from "../mcp/client.js";

function getBaseUrl(): string {
  return process.env.MEGABRAIN_OPENAI_BASE_URL ?? "https://api.openai.com";
}

function getModel(): string {
  return process.env.MEGABRAIN_AGENT_MODEL ?? "qwen2.5-coder:7b";
}

function getApiKey(): string {
  return process.env.OPENAI_API_KEY ?? "";
}

async function callModelRaw(prompt: string): Promise<string> {
  const res = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getApiKey()}` },
    body: JSON.stringify({ model: getModel(), messages: [{ role: "user", content: prompt }] }),
  });

  if (!res.ok) {
    throw new Error(`Modelo respondeu ${res.status}: ${await res.text()}`);
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return payload.choices?.[0]?.message?.content ?? "";
}

interface ParsedStep {
  thought?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  finalAnswer?: string;
}

function parseModelStep(text: string): ParsedStep {
  const thoughtMatch = text.match(/Thought:\s*(.+)/i);
  const finalMatch = text.match(/Final Answer:\s*([\s\S]+)/i);
  if (finalMatch) return { thought: thoughtMatch?.[1]?.trim(), finalAnswer: finalMatch[1].trim() };

  const actionMatch = text.match(/Action:\s*(\w+)/i);
  const inputMatch = text.match(/Action Input:\s*(\{[\s\S]*\})/i);
  let actionInput: Record<string, unknown> = {};
  if (inputMatch) {
    try {
      actionInput = JSON.parse(inputMatch[1]);
    } catch {
      // input mal formado — o loop mostra o erro ao modelo na próxima observação
    }
  }
  return { thought: thoughtMatch?.[1]?.trim(), action: actionMatch?.[1], actionInput };
}

const MAX_ITERATIONS = 6;

/**
 * Agente com ciclo ReAct real: o modelo escolhe entre usar uma ferramenta
 * (built-in ou de um servidor MCP configurado) ou dar a resposta final.
 * Aplica sempre as regras em `rules/`, injeta memórias relevantes e skills
 * cujos triggers batam com o objetivo, e reaproveita o cache semântico e o
 * tier router já existentes no MegaBrain.
 */
export async function runAgent(goal: string): Promise<void> {
  const home = join(homedir(), ".megabrain");
  const cache = new SemanticCache(join(home, "cache.json"));
  const memory = new MemoryStore(join(home, "memory.json"));
  const skillsDir = join(process.cwd(), "skills");
  const rulesDir = join(process.cwd(), "rules");

  const decision = route(goal);
  console.log(`Objetivo: ${goal}`);
  console.log(`Tier estimado: ${decision.tier} (${decision.reason})\n`);

  const cachedFinal = await cache.find(goal);
  if (cachedFinal) {
    console.log(`[cache hit] Este objetivo já foi resolvido antes.\n`);
    console.log(`=== Resposta final ===\n${cachedFinal.entry.response}`);
    return;
  }

  const rules = loadRules(rulesDir);
  const relevantMemories = memory.search(goal);
  const skills = matchSkills(skillsDir, goal);

  let mcpConnections: { name: string; client: McpClient }[] = [];
  try {
    mcpConnections = await connectConfiguredMcpServers();
  } catch {
    mcpConnections = [];
  }

  const tools: Tool[] = [...builtinTools()];
  for (const { name, client } of mcpConnections) {
    try {
      const mcpTools = await client.listTools();
      for (const mcpTool of mcpTools) {
        tools.push({
          name: `${name}_${mcpTool.name}`,
          description: `[MCP:${name}] ${mcpTool.description ?? mcpTool.name}`,
          run: (args) => client.callTool(mcpTool.name, args),
        });
      }
    } catch (err) {
      console.warn(`MCP "${name}": falha ao listar ferramentas — ${(err as Error).message}`);
    }
  }

  if (rules.length > 0) console.log(`Regras ativas: ${rules.length}`);
  if (relevantMemories.length > 0) console.log(`Memórias relevantes: ${relevantMemories.map((m) => m.text).join(" | ")}`);
  if (skills.length > 0) console.log(`Skills relevantes: ${skills.map((s) => s.name).join(", ")}`);
  if (tools.length > 0) console.log(`Ferramentas disponíveis: ${tools.map((t) => t.name).join(", ")}\n`);

  const systemContext = [
    rules.length > 0 ? `Regras a cumprir sempre:\n${rules.join("\n")}` : "",
    relevantMemories.length > 0 ? `Memórias relevantes:\n${relevantMemories.map((m) => `- ${m.text}`).join("\n")}` : "",
    skills.length > 0 ? `Skills relevantes:\n${skills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n")}` : "",
    `Ferramentas disponíveis:\n${describeTools(tools)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const instructions = `Respondes sempre neste formato exato, um bloco por vez:
Thought: <o teu raciocínio>
Action: <nome de uma ferramenta da lista>
Action Input: <JSON com os argumentos>

Ou, quando já tens a resposta final:
Thought: <o teu raciocínio>
Final Answer: <resposta final completa>`;

  let transcript = `${systemContext}\n\n${instructions}\n\nObjetivo: ${goal}`;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Sem cache aqui de propósito: o transcript cresce a cada iteração e a
      // diferença entre duas versões é pequena face ao texto acumulado, o
      // que causava falsos positivos de cache mesmo sem repetição real.
      const raw = await callModelRaw(transcript);
      const step = parseModelStep(raw);

      if (step.thought) console.log(`Thought: ${step.thought}`);

      if (step.finalAnswer) {
        console.log(`\n=== Resposta final ===\n${step.finalAnswer}`);
        await cache.store(goal, step.finalAnswer);
        return;
      }

      if (!step.action) {
        console.log("\nO modelo não indicou uma ação nem uma resposta final. Resposta bruta:");
        console.log(raw);
        return;
      }

      const tool = findTool(tools, step.action);
      let observation: string;
      if (!tool) {
        observation = `Ferramenta "${step.action}" não existe. Ferramentas válidas: ${tools.map((t) => t.name).join(", ")}`;
      } else {
        console.log(`Action: ${step.action}(${JSON.stringify(step.actionInput)})`);
        try {
          observation = await tool.run(step.actionInput ?? {});
        } catch (err) {
          observation = `Erro ao correr "${step.action}": ${(err as Error).message}`;
        }
        console.log(`Observation: ${observation}\n`);
      }

      transcript += `\n\nThought: ${step.thought ?? ""}\nAction: ${step.action}\nAction Input: ${JSON.stringify(step.actionInput)}\nObservation: ${observation}`;
    }

    console.log("\nNúmero máximo de passos atingido sem resposta final.");
  } finally {
    for (const { client } of mcpConnections) client.close();
  }
}
