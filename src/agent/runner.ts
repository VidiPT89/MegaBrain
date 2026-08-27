import { homedir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "../cache/semantic-cache.js";
import { route } from "../router/tier-router.js";
import { matchSkills } from "../skills/loader.js";

function getBaseUrl(): string {
  return process.env.MEGABRAIN_OPENAI_BASE_URL ?? "https://api.openai.com";
}

function getModel(): string {
  return process.env.MEGABRAIN_AGENT_MODEL ?? "qwen2.5-coder:7b";
}

function getApiKey(): string {
  return process.env.OPENAI_API_KEY ?? "";
}

/**
 * Chama o modelo configurado (Ollama local ou API compatível com OpenAI),
 * passando primeiro pelo cache semântico partilhado do MegaBrain — passos
 * repetidos entre execuções do agente não voltam a gastar tokens.
 */
async function callModel(cache: SemanticCache, prompt: string): Promise<string> {
  const cached = await cache.find(prompt);
  if (cached) return cached.entry.response;

  const res = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getApiKey()}` },
    body: JSON.stringify({ model: getModel(), messages: [{ role: "user", content: prompt }] }),
  });

  if (!res.ok) {
    throw new Error(`Modelo respondeu ${res.status}: ${await res.text()}`);
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (text) await cache.store(prompt, text);
  return text;
}

function parseSteps(planText: string): string[] {
  return planText
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*])\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Agente simples: divide um objetivo em passos com o modelo local, executa
 * cada passo (também via modelo), e imprime um resumo final. Reaproveita o
 * cache semântico e o tier router já existentes no MegaBrain.
 */
export async function runAgent(goal: string): Promise<void> {
  const cache = new SemanticCache(join(homedir(), ".megabrain", "cache.json"));
  const skillsDir = join(process.cwd(), "skills");

  const decision = route(goal);
  console.log(`Objetivo: ${goal}`);
  console.log(`Tier estimado: ${decision.tier} (${decision.reason})\n`);

  const skills = matchSkills(skillsDir, goal);
  const skillHint = skills.length > 0 ? `\n\nSkills relevantes disponíveis: ${skills.map((s) => s.name).join(", ")}.` : "";

  console.log("A planear passos...");
  const planPrompt = `Divide o seguinte objetivo em, no máximo, 5 passos curtos e numerados, um por linha, sem explicações extra.${skillHint}\n\nObjetivo: ${goal}`;
  const planText = await callModel(cache, planPrompt);
  const steps = parseSteps(planText);

  if (steps.length === 0) {
    console.log("Não consegui gerar um plano. Resposta do modelo:");
    console.log(planText);
    return;
  }

  console.log(`Plano (${steps.length} passos):`);
  steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log("");

  const results: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`--- Passo ${i + 1}/${steps.length}: ${step} ---`);
    const stepPrompt = `Objetivo geral: ${goal}\nExecuta apenas este passo e devolve o resultado, nada mais:\nPasso: ${step}`;
    const result = await callModel(cache, stepPrompt);
    console.log(result.trim());
    console.log("");
    results.push(result.trim());
  }

  console.log("=== Resumo final ===");
  console.log(results.join("\n\n"));
}
