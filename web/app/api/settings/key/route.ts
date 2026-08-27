import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { provider, apiKey } = (await req.json()) as { provider?: string; apiKey?: string };
  if (provider !== "openai" && provider !== "anthropic") {
    return NextResponse.json({ error: "provider deve ser 'openai' ou 'anthropic'" }, { status: 400 });
  }
  if (!apiKey || apiKey.length < 8) {
    return NextResponse.json({ error: "apiKey inválida" }, { status: 400 });
  }

  const db = sql();
  await db`
    INSERT INTO api_keys (user_id, provider, encrypted_key)
    VALUES (${userId}, ${provider}, ${encryptSecret(apiKey)})
    ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_key = ${encryptSecret(apiKey)}, updated_at = now()
  `;

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const db = sql();
  const rows = (await db`SELECT provider, updated_at FROM api_keys WHERE user_id = ${userId}`) as {
    provider: string;
    updated_at: string;
  }[];
  return NextResponse.json({ keys: rows });
}
