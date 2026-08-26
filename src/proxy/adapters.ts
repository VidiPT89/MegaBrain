export interface OpenAIChatRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  [key: string]: unknown;
}

export interface AnthropicMessagesRequest {
  model: string;
  messages: { role: string; content: string | { type: string; text?: string }[] }[];
  stream?: boolean;
  max_tokens: number;
  [key: string]: unknown;
}

/** Extrai o texto da última mensagem do utilizador, formato OpenAI. */
export function extractOpenAIPrompt(body: OpenAIChatRequest): string {
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  return lastUser?.content ?? "";
}

/** Extrai o texto da última mensagem do utilizador, formato Anthropic. */
export function extractAnthropicPrompt(body: AnthropicMessagesRequest): string {
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  if (typeof lastUser.content === "string") return lastUser.content;
  return lastUser.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
}

export function buildOpenAICacheResponse(model: string, content: string) {
  return {
    id: `megabrain-cache-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    megabrain: { cache_hit: true },
  };
}

export function buildAnthropicCacheResponse(model: string, content: string) {
  return {
    id: `megabrain-cache-${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: content }],
    stop_reason: "end_turn",
    usage: { input_tokens: 0, output_tokens: 0 },
    megabrain: { cache_hit: true },
  };
}

/** Extrai o texto de resposta de um payload OpenAI, para guardar no cache. */
export function extractOpenAIResponseText(payload: any): string | null {
  return payload?.choices?.[0]?.message?.content ?? null;
}

/** Extrai o texto de resposta de um payload Anthropic, para guardar no cache. */
export function extractAnthropicResponseText(payload: any): string | null {
  const block = payload?.content?.find((b: any) => b.type === "text");
  return block?.text ?? null;
}
