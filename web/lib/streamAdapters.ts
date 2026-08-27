/** Porta do que já foi validado no CLI (src/proxy/adapters.ts) para o runtime de Edge/Node do Next.js. */

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

/** Reencaminha o stream para o cliente byte a byte, e também acumula o texto para guardar no cache no fim. */
export function teeStream(
  upstreamBody: ReadableStream<Uint8Array>,
  extractDelta: (eventBlock: string) => string | null,
  onDone: (fullText: string) => void,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";
  let collected = "";

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) {
          const delta = extractDelta(block);
          if (delta) collected += delta;
        }
      }
      controller.close();
      onDone(collected);
    },
  });
}

export function buildOpenAIStreamCacheEvents(model: string, content: string): string {
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
  return chunk({ role: "assistant", content }) + chunk({}, "stop") + "data: [DONE]\n\n";
}

export function buildAnthropicStreamCacheEvents(model: string, content: string): string {
  const id = `megabrain-cache-${Date.now()}`;
  const event = (name: string, data: Record<string, unknown>) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  return (
    event("message_start", {
      type: "message_start",
      message: { id, type: "message", role: "assistant", model, content: [], usage: { input_tokens: 0, output_tokens: 0 } },
    }) +
    event("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }) +
    event("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: content } }) +
    event("content_block_stop", { type: "content_block_stop", index: 0 }) +
    event("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 0 } }) +
    event("message_stop", { type: "message_stop" })
  );
}
