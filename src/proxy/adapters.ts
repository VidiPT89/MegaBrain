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

/** Constrói os eventos SSE de um cache hit, formato OpenAI streaming. */
export function buildOpenAIStreamCacheEvents(model: string, content: string): string[] {
  const id = `megabrain-cache-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const chunk = (delta: Record<string, unknown>, finishReason: string | null = null) =>
    `data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
      megabrain: { cache_hit: true },
    })}\n\n`;
  return [
    chunk({ role: "assistant", content }),
    chunk({}, "stop"),
    "data: [DONE]\n\n",
  ];
}

/** Constrói os eventos SSE de um cache hit, formato Anthropic streaming. */
export function buildAnthropicStreamCacheEvents(model: string, content: string): string[] {
  const id = `megabrain-cache-${Date.now()}`;
  const event = (name: string, data: Record<string, unknown>) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  return [
    event("message_start", {
      type: "message_start",
      message: { id, type: "message", role: "assistant", model, content: [], usage: { input_tokens: 0, output_tokens: 0 } },
    }),
    event("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }),
    event("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: content } }),
    event("content_block_stop", { type: "content_block_stop", index: 0 }),
    event("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 0 } }),
    event("message_stop", { type: "message_stop" }),
  ];
}

/** Acumula texto de um stream SSE (OpenAI ou Anthropic) enquanto o reencaminha para o cliente. */
export async function pipeAndCollectText(
  upstreamBody: ReadableStream<Uint8Array>,
  onChunk: (raw: string) => void,
  extractDelta: (eventBlock: string) => string | null,
): Promise<string> {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let collected = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const raw = decoder.decode(value, { stream: true });
    onChunk(raw);
    buffer += raw;

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const block of parts) {
      const delta = extractDelta(block);
      if (delta) collected += delta;
    }
  }

  return collected;
}

export function extractOpenAIStreamDelta(eventBlock: string): string | null {
  const line = eventBlock.split("\n").find((l) => l.startsWith("data: "));
  if (!line) return null;
  const data = line.slice(6).trim();
  if (data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    return parsed?.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
}

export function extractAnthropicStreamDelta(eventBlock: string): string | null {
  const line = eventBlock.split("\n").find((l) => l.startsWith("data: "));
  if (!line) return null;
  try {
    const parsed = JSON.parse(line.slice(6).trim());
    if (parsed?.type === "content_block_delta" && parsed?.delta?.type === "text_delta") {
      return parsed.delta.text ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
