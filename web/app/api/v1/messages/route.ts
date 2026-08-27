import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserApiKey } from "@/lib/keys";
import { findCached, storeCache } from "@/lib/cache";
import { route } from "@/lib/router";
import { recordCacheHit, recordRoute } from "@/lib/stats";
import { logRequest } from "@/lib/requestLog";
import { isRateLimited, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import { friendlyUpstreamError } from "@/lib/friendlyError";
import { extractAnthropicStreamDelta, teeStream, buildAnthropicStreamCacheEvents } from "@/lib/streamAdapters";

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: { role: string; content: string | { type: string; text?: string }[] }[];
  stream?: boolean;
}

function extractPrompt(body: AnthropicRequest): string {
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  if (typeof lastUser.content === "string") return lastUser.content;
  return lastUser.content.filter((b) => b.type === "text" && b.text).map((b) => b.text).join("\n");
}

const SSE_HEADERS = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" };

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  if (await isRateLimited(userId)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const apiKey = await getUserApiKey(userId, "anthropic");
  if (!apiKey) {
    return NextResponse.json({ error: "Sem chave Anthropic configurada. Adiciona uma em /settings." }, { status: 400 });
  }

  const body = (await req.json()) as AnthropicRequest;
  const prompt = extractPrompt(body);

  const cached = await findCached(userId, prompt);
  if (cached) {
    const tokensEstimate = Math.ceil(prompt.length / 4);
    await recordCacheHit(userId, tokensEstimate);
    await logRequest(userId, { endpoint: "messages", provider: "anthropic", model: body.model, cacheHit: true, tokensEstimate });

    if (body.stream) {
      return new NextResponse(buildAnthropicStreamCacheEvents(body.model, cached.response), { headers: SSE_HEADERS });
    }
    return NextResponse.json({
      id: `megabrain-cache-${Date.now()}`,
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: cached.response }],
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
      megabrain: { cache_hit: true },
    });
  }

  const decision = route(prompt);
  await recordRoute(userId, decision.tier);
  await logRequest(userId, {
    endpoint: "messages",
    provider: "anthropic",
    model: body.model,
    tier: decision.tier,
    cacheHit: false,
    tokensEstimate: Math.ceil(prompt.length / 4),
  });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });

  if (body.stream && upstream.ok && upstream.body) {
    const stream = teeStream(upstream.body, extractAnthropicStreamDelta, (text) => {
      if (text) storeCache(userId, prompt, text);
    });
    return new NextResponse(stream, { headers: SSE_HEADERS });
  }

  const payload = await upstream.json();
  if (!upstream.ok) {
    const friendly = friendlyUpstreamError(upstream.status, payload);
    return NextResponse.json({ error: friendly ?? "Erro do provider.", detail: payload }, { status: upstream.status });
  }

  const text = payload?.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text;
  if (text) await storeCache(userId, prompt, text);

  return NextResponse.json({ ...payload, megabrain: { cache_hit: false, tier: decision.tier } }, { status: upstream.status });
}
