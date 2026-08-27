export type Tier = "local" | "mid" | "premium";

export interface RouteDecision {
  tier: Tier;
  reason: string;
}

const COMPLEX_KEYWORDS = ["arquitetura", "architecture", "refactor", "design", "porque", "compara", "analisa", "trade-off"];
const SIMPLE_KEYWORDS = ["traduz", "translate", "resume", "summarize", "formata", "lista", "converte"];

/** Roteamento heurístico por tier de custo — porta direta do CLI (src/router/tier-router.ts). */
export function route(prompt: string): RouteDecision {
  const text = prompt.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasCode = /```|function |const |class |def |import /.test(prompt);
  const hasComplexKeyword = COMPLEX_KEYWORDS.some((k) => text.includes(k));
  const hasSimpleKeyword = SIMPLE_KEYWORDS.some((k) => text.includes(k));

  if (hasSimpleKeyword && wordCount < 60 && !hasCode) return { tier: "local", reason: "tarefa simples e curta" };
  if (hasComplexKeyword || hasCode || wordCount > 200) return { tier: "premium", reason: "raciocínio complexo ou código extenso" };
  if (wordCount < 40) return { tier: "local", reason: "pergunta curta e direta" };
  return { tier: "mid", reason: "complexidade intermédia" };
}
