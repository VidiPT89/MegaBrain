import type { Tier } from "./tier-router.js";

export interface ProviderTarget {
  /** Nome do provider escolhido, só para logging/dashboard. */
  provider: string;
  baseUrl: string;
  apiKey: string;
  /** Se definido, substitui o `model` pedido pelo cliente antes de reencaminhar. */
  model?: string;
}

interface TierEnvConfig {
  provider: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
  modelEnv: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
  /** Se true, a apiKey pode estar vazia (ex: Ollama local não precisa de chave real). */
  keyOptional?: boolean;
}

// Candidatos por tier, por ordem de preferência (mais barato/capaz primeiro).
// O primeiro cujo par (baseUrl, apiKey) esteja configurado é escolhido.
const TIER_CANDIDATES: Record<Tier, TierEnvConfig[]> = {
  local: [
    {
      provider: "ollama",
      baseUrlEnv: "MEGABRAIN_LOCAL_BASE_URL",
      apiKeyEnv: "MEGABRAIN_LOCAL_API_KEY",
      modelEnv: "MEGABRAIN_LOCAL_MODEL",
      defaultBaseUrl: "http://localhost:11434",
      defaultModel: "qwen2.5-coder:7b",
      keyOptional: true,
    },
  ],
  mid: [
    {
      provider: "groq",
      baseUrlEnv: "MEGABRAIN_GROQ_BASE_URL",
      apiKeyEnv: "MEGABRAIN_GROQ_API_KEY",
      modelEnv: "MEGABRAIN_GROQ_MODEL",
      defaultBaseUrl: "https://api.groq.com/openai/v1",
      defaultModel: "llama-3.1-8b-instant",
    },
    {
      provider: "gemini",
      baseUrlEnv: "MEGABRAIN_GEMINI_BASE_URL",
      apiKeyEnv: "MEGABRAIN_GEMINI_API_KEY",
      modelEnv: "MEGABRAIN_GEMINI_MODEL",
      defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      defaultModel: "gemini-1.5-flash",
    },
  ],
  premium: [
    {
      provider: "openai",
      baseUrlEnv: "MEGABRAIN_OPENAI_BASE_URL",
      apiKeyEnv: "OPENAI_API_KEY",
      modelEnv: "MEGABRAIN_PREMIUM_MODEL",
    },
  ],
};

function readTierConfig(config: TierEnvConfig): ProviderTarget | null {
  const apiKey = process.env[config.apiKeyEnv] ?? "";
  if (!apiKey && !config.keyOptional) return null;

  const baseUrl = process.env[config.baseUrlEnv] ?? config.defaultBaseUrl;
  if (!baseUrl) return null;

  const model = process.env[config.modelEnv] ?? config.defaultModel;
  return { provider: config.provider, baseUrl, apiKey: apiKey || "ollama", model };
}

/**
 * Escolhe o provider mais barato capaz para o tier recomendado pelo router,
 * consultando as chaves configuradas em .env (Groq/Gemini free tier antes de premium pago,
 * Ollama local para o tier "local"). Cai para o provider "premium" (OpenAI/Anthropic pago)
 * sempre que nenhum candidato mais barato do tier esteja configurado.
 */
export function resolveProvider(tier: Tier): ProviderTarget {
  for (const config of TIER_CANDIDATES[tier]) {
    const target = readTierConfig(config);
    if (target) return target;
  }

  // Sem candidato configurado para este tier: cai para o provider premium (comportamento antigo).
  for (const config of TIER_CANDIDATES.premium) {
    const target = readTierConfig(config);
    if (target) return target;
  }

  return {
    provider: "openai",
    baseUrl: process.env.MEGABRAIN_OPENAI_BASE_URL ?? "https://api.openai.com",
    apiKey: process.env.OPENAI_API_KEY ?? "",
  };
}
