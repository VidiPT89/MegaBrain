#!/usr/bin/env node
import { homedir, platform } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { SemanticCache } from "./cache/semantic-cache.js";
import { route } from "./router/tier-router.js";
import { StatsTracker } from "./stats/tracker.js";
import { startProxy } from "./proxy/server.js";
import { loadEnvFile } from "./proxy/env.js";
import { startDashboard } from "./dashboard/server.js";

loadEnvFile();

const HOME = join(homedir(), ".megabrain");
const cache = new SemanticCache(join(HOME, "cache.json"));
const stats = new StatsTracker(join(HOME, "stats.json"));

function printUsage(): void {
  console.log(`megabrain <comando>

Comandos:
  ask "<prompt>"        Verifica cache/tier para um prompt (não chama nenhum LLM)
  remember "<prompt>" "<resposta>"   Guarda uma resposta no cache semântico
  stats                 Mostra estatísticas de poupança
  cache clear           Limpa o cache semântico
  proxy [porta]         Inicia o proxy compatível com OpenAI/Anthropic (default porta 8787)
  dashboard [porta]     Abre o dashboard visual de poupança (default porta 4321)
  init                   Configura o .env (deteta Ollama) e mostra a primeira poupança
  start                 Liga tudo de uma vez: Ollama (se preciso), proxy e dashboard
`);
}

async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/version", { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

function openBrowser(url: string): void {
  const command = platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  spawn(command, [url], { detached: true, stdio: "ignore" }).unref();
}

async function cmdInit(): Promise<void> {
  const envPath = join(process.cwd(), ".env");
  const ollamaUp = await isOllamaRunning();

  if (!existsSync(envPath)) {
    const lines = ollamaUp
      ? [
          "# MegaBrain: Ollama local detetado, a usar por omissão (grátis, sem chave)",
          "MEGABRAIN_OPENAI_BASE_URL=http://localhost:11434",
          "OPENAI_API_KEY=ollama",
        ]
      : [
          "# MegaBrain: Ollama não detetado. Instala com `brew install ollama` ou preenche uma chave paga abaixo.",
          "# OPENAI_API_KEY=sk-...",
          "# ANTHROPIC_API_KEY=sk-ant-...",
          "# Tiers mid mais baratos (opcional): MEGABRAIN_GROQ_API_KEY / MEGABRAIN_GEMINI_API_KEY",
        ];
    writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
    console.log(`.env criado em ${envPath}`);
  } else {
    console.log(`.env já existe em ${envPath} — não foi alterado.`);
  }

  console.log(ollamaUp ? "Ollama local: a correr ✅" : "Ollama local: não detetado (opcional, mas free)");

  const sample = "resume isto: o MegaBrain acabou de ser configurado";
  const decision = route(sample);
  console.log(`\nTeste com um pedido de exemplo: "${sample}"`);
  console.log(`  tier recomendado: ${decision.tier} (${decision.reason})`);
  console.log(`  tokens estimados: ~${decision.estimatedTokens}`);
  console.log(`\nPróximo passo: \`megabrain start\` liga o proxy + dashboard e mostra a poupança ao vivo.`);
}

async function cmdStart(): Promise<void> {
  const usingLocalOllama = (process.env.MEGABRAIN_OPENAI_BASE_URL ?? "").includes("localhost:11434");

  if (usingLocalOllama && !(await isOllamaRunning())) {
    console.log("A ligar o Ollama local...");
    spawn("ollama", ["serve"], { detached: true, stdio: "ignore" }).unref();
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  startProxy({ port: 8787 });
  startDashboard(4321);

  console.log("\nMegaBrain está pronto:");
  console.log("  Proxy:     http://localhost:8787");
  console.log("  Dashboard: http://localhost:4321\n");

  openBrowser("http://localhost:4321");
}

async function cmdAsk(prompt: string): Promise<void> {
  const cached = await cache.find(prompt);
  if (cached) {
    stats.recordCacheHit(Math.ceil(prompt.length / 4));
    console.log(`[cache hit via ${cached.method}] similaridade=${cached.similarity.toFixed(2)}`);
    console.log(cached.entry.response);
    return;
  }

  const decision = route(prompt);
  stats.recordRoute(decision.tier);
  console.log(`[cache miss] tier recomendado: ${decision.tier} (${decision.reason})`);
  console.log(`tokens estimados: ~${decision.estimatedTokens}`);
}

async function cmdRemember(prompt: string, response: string): Promise<void> {
  await cache.store(prompt, response);
  console.log(`Guardado no cache. Total de entradas: ${cache.size}`);
}

function cmdStats(): void {
  console.log(JSON.stringify(stats.snapshot(), null, 2));
}

function cmdCacheClear(): void {
  cache.clear();
  console.log("Cache limpo.");
}

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "ask":
      args[0] ? await cmdAsk(args[0]) : printUsage();
      break;
    case "remember":
      args[0] && args[1] ? await cmdRemember(args[0], args[1]) : printUsage();
      break;
    case "stats":
      cmdStats();
      break;
    case "cache":
      args[0] === "clear" ? cmdCacheClear() : printUsage();
      break;
    case "proxy":
      startProxy({ port: args[0] ? Number(args[0]) : 8787 });
      break;
    case "dashboard":
      startDashboard(args[0] ? Number(args[0]) : 4321);
      break;
    case "init":
      await cmdInit();
      break;
    case "start":
      await cmdStart();
      break;
    default:
      printUsage();
  }
}

main();
