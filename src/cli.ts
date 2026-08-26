#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "./cache/semantic-cache.js";
import { route } from "./router/tier-router.js";
import { matchSkills } from "./skills/loader.js";
import { StatsTracker } from "./stats/tracker.js";
import { startProxy } from "./proxy/server.js";
import { loadEnvFile } from "./proxy/env.js";
import { startDashboard } from "./dashboard/server.js";

loadEnvFile();

const HOME = join(homedir(), ".megabrain");
const cache = new SemanticCache(join(HOME, "cache.json"));
const stats = new StatsTracker(join(HOME, "stats.json"));
const skillsDir = join(process.cwd(), "skills");

function printUsage(): void {
  console.log(`megabrain <comando>

Comandos:
  ask "<prompt>"        Verifica cache/skills/tier para um prompt (não chama nenhum LLM)
  remember "<prompt>" "<resposta>"   Guarda uma resposta no cache semântico
  stats                 Mostra estatísticas de poupança
  cache clear           Limpa o cache semântico
  proxy [porta]         Inicia o proxy compatível com OpenAI/Anthropic (default porta 8787)
  dashboard [porta]     Abre o dashboard visual de poupança (default porta 4321)
`);
}

function cmdAsk(prompt: string): void {
  const cached = cache.find(prompt);
  if (cached) {
    stats.recordCacheHit(Math.ceil(prompt.length / 4));
    console.log(`[cache hit] similaridade=${cached.similarity.toFixed(2)}`);
    console.log(cached.entry.response);
    return;
  }

  const decision = route(prompt);
  stats.recordRoute(decision.tier);
  console.log(`[cache miss] tier recomendado: ${decision.tier} (${decision.reason})`);
  console.log(`tokens estimados: ~${decision.estimatedTokens}`);

  const skills = matchSkills(skillsDir, prompt);
  if (skills.length > 0) {
    console.log(`skills relevantes: ${skills.map((s) => s.name).join(", ")}`);
  }
}

function cmdRemember(prompt: string, response: string): void {
  cache.store(prompt, response);
  console.log(`Guardado no cache. Total de entradas: ${cache.size}`);
}

function cmdStats(): void {
  console.log(JSON.stringify(stats.snapshot(), null, 2));
}

function cmdCacheClear(): void {
  cache.clear();
  console.log("Cache limpo.");
}

const [, , command, ...args] = process.argv;

switch (command) {
  case "ask":
    args[0] ? cmdAsk(args[0]) : printUsage();
    break;
  case "remember":
    args[0] && args[1] ? cmdRemember(args[0], args[1]) : printUsage();
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
  default:
    printUsage();
}
