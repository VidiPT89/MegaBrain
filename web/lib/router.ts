export type Tier = "local" | "mid" | "premium";

export interface RouteDecision {
  tier: Tier;
  reason: string;
}

const COMPLEX_KEYWORDS = ["arquitetura", "architecture", "refactor", "design", "porque", "compara", "analisa", "trade-off"];
const SIMPLE_KEYWORDS = ["traduz", "translate", "resume", "summarize", "formata", "lista", "converte"];

/**
 * Uma conversa com mais de uma mensagem não pode ser cacheada com segurança
 * pela última mensagem isolada: duas conversas diferentes do mesmo
 * utilizador podem terminar com a mesma frase curta ("continua", "sim") e
 * receber a resposta uma da outra. Cachear a conversa completa também não
 * resolve — um prefixo grande partilhado (system prompt/template) domina a
 * similaridade e mascara a pergunta real. Porta direta de
 * src/proxy/adapters.ts#isMultiTurn no CLI.
 */
export function isMultiTurn(messages: { role: string }[]): boolean {
  return messages.filter((m) => m.role === "user" || m.role === "assistant").length > 1;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  cache_control?: unknown;
  [key: string]: unknown;
}

type AnthropicContent = string | AnthropicContentBlock[];

function withCacheControl(content: AnthropicContent): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = typeof content === "string" ? [{ type: "text", text: content }] : [...content];
  if (blocks.length === 0) return blocks;
  const lastIndex = blocks.length - 1;
  if (blocks[lastIndex].cache_control) return blocks;
  blocks[lastIndex] = { ...blocks[lastIndex], cache_control: { type: "ephemeral" } };
  return blocks;
}

/**
 * Marca breakpoints de "prompt caching" nativo da Anthropic no system prompt
 * e no fim do turno anterior, para o próprio provider cachear esse prefixo
 * (~90% de desconto nesses tokens nas chamadas seguintes que o repitam).
 * Porta direta de src/proxy/adapters.ts#injectAnthropicPromptCaching no CLI.
 */
export function injectAnthropicPromptCaching<
  T extends { system?: AnthropicContent; messages: { role: string; content: AnthropicContent }[] },
>(body: T): T {
  const next: T = { ...body };

  if (typeof body.system === "string" || Array.isArray(body.system)) {
    next.system = withCacheControl(body.system);
  }

  if (Array.isArray(body.messages) && body.messages.length > 1) {
    const messages = [...body.messages];
    const previousTurnIndex = messages.length - 2;
    const target = messages[previousTurnIndex];
    messages[previousTurnIndex] = { ...target, content: withCacheControl(target.content) };
    next.messages = messages;
  }

  return next;
}

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
