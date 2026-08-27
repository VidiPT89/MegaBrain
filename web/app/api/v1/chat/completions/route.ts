import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserApiKey } from "@/lib/keys";
import { findCached, storeCache } from "@/lib/cache";
import { route } from "@/lib/router";
import { recordCacheHit, recordRoute } from "@/lib/stats";

interface OpenAIRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
}

function extractPrompt(body: OpenAIRequest): string {
  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  return lastUser?.content ?? "";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const apiKey = await getUserApiKey(userId, "openai");
  if (!apiKey) {
    return NextResponse.json({ error: "Sem chave OpenAI configurada. Adiciona uma em /settings." }, { status: 400 });
  }

  const body = (await req.json()) as OpenAIRequest;
  const prompt = extractPrompt(body);

  const cached = await findCached(userId, prompt);
  if (cached) {
    await recordCacheHit(userId, Math.ceil(prompt.length / 4));
    return NextResponse.json({
      id: `megabrain-cache-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content: cached.response }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      megabrain: { cache_hit: true },
    });
  }

  const decision = route(prompt);
  await recordRoute(userId, decision.tier);

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (text) await storeCache(userId, prompt, text);

  return NextResponse.json({ ...payload, megabrain: { cache_hit: false, tier: decision.tier } }, { status: upstream.status });
}
