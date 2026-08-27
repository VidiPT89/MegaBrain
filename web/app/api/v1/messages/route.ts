import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserApiKey } from "@/lib/keys";
import { findCached, storeCache } from "@/lib/cache";
import { route } from "@/lib/router";
import { recordCacheHit, recordRoute } from "@/lib/stats";
import { logRequest } from "@/lib/requestLog";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

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

  const payload = await upstream.json();
  const text = payload?.content?.find((b: { type: string; text?: string }) => b.type === "text")?.text;
  if (text) await storeCache(userId, prompt, text);

  return NextResponse.json({ ...payload, megabrain: { cache_hit: false, tier: decision.tier } }, { status: upstream.status });
}
