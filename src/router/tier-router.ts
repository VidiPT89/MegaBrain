export type Tier = "local" | "mid" | "premium";

export interface RouteDecision {
  tier: Tier;
  reason: string;
  estimatedTokens: number;
}

const COMPLEX_KEYWORDS = [
  "arquitetura",
  "arquitecture",
  "refactor",
  "design",
  "porque",
  "compara",
  "analisa",
  "estratégia",
  "estrategia",
  "trade-off",
  "tradeoff",
];

const SIMPLE_KEYWORDS = [
  "traduz",
  "resume",
  "formata",
  "lista",
  "converte",
  "corrige ortografia",
];

/**
 * Roteamento heurístico por tier de custo. Não chama nenhum modelo;
 * apenas recomenda qual tier usar, para o chamador decidir o modelo real.
 */
export function route(prompt: string): RouteDecision {
  const text = prompt.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasCode = /```|function |const |class |def |import /.test(prompt);
  const hasComplexKeyword = COMPLEX_KEYWORDS.some((k) => text.includes(k));
  const hasSimpleKeyword = SIMPLE_KEYWORDS.some((k) => text.includes(k));

  const estimatedTokens = Math.ceil(prompt.length / 4);

  if (hasSimpleKeyword && wordCount < 60 && !hasCode) {
    return { tier: "local", reason: "tarefa simples e curta (tradução/formatação/lista)", estimatedTokens };
  }

  if (hasComplexKeyword || hasCode || wordCount > 200) {
    return { tier: "premium", reason: "raciocínio complexo, código extenso ou pedido de arquitetura", estimatedTokens };
  }

  if (wordCount < 40) {
    return { tier: "local", reason: "pergunta curta e direta", estimatedTokens };
  }

  return { tier: "mid", reason: "complexidade intermédia", estimatedTokens };
}
