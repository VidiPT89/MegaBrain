import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserApiKey } from "@/lib/keys";
import { findCached, storeCache } from "@/lib/cache";
import { route } from "@/lib/router";
import { recordCacheHit, recordRoute } from "@/lib/stats";
import { logRequest } from "@/lib/requestLog";

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

  const openaiKey = await getUserApiKey(userId, "openai");
  const geminiKey = openaiKey ? null : await getUserApiKey(userId, "gemini");
  const apiKey = openaiKey ?? geminiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Sem chave OpenAI ou Gemini configurada. Adiciona uma em /settings." },
      { status: 400 },
    );
  }
  // A API do Gemini expõe um endpoint compatível com o formato OpenAI, por isso
  // basta trocar o base_url — o resto do pedido/resposta fica igual.
  const baseUrl = openaiKey
    ? "https://api.openai.com/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

  const body = (await req.json()) as OpenAIRequest;
  const prompt = extractPrompt(body);

  const provider = openaiKey ? "openai" : "gemini";

  const cached = await findCached(userId, prompt);
  if (cached) {
    const tokensEstimate = Math.ceil(prompt.length / 4);
    await recordCacheHit(userId, tokensEstimate);
    await logRequest(userId, { endpoint: "chat/completions", provider, model: body.model, cacheHit: true, tokensEstimate });
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
  await logRequest(userId, {
    endpoint: "chat/completions",
    provider,
    model: body.model,
    tier: decision.tier,
    cacheHit: false,
    tokensEstimate: Math.ceil(prompt.length / 4),
  });

  const upstream = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const payload = await upstream.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (text) await storeCache(userId, prompt, text);

  return NextResponse.json({ ...payload, megabrain: { cache_hit: false, tier: decision.tier } }, { status: upstream.status });
}
