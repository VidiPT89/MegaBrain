import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

/**
 * Cria as tabelas na base de dados se ainda não existirem. Protegido por um
 * segredo (MEGABRAIN_ENCRYPTION_KEY, já disponível no ambiente) passado no
 * header — chamar uma vez depois do primeiro deploy, não fica exposto a
 * ninguém sem o segredo.
 */
export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-init-secret")?.trim();
  const expected = process.env.MEGABRAIN_ENCRYPTION_KEY?.trim();
  // .trim() guards against a trailing newline/space baked into the stored env var value
  // (easy to introduce by pasting a key that had one) — the header never carries one.
  if (!provided || !expected || provided !== expected) {
    // TEMPORARY diagnostic — lengths only, never the values themselves — to find why
    // a byte-for-byte copy of the Vercel dashboard value still doesn't match. Remove
    // once resolved.
    return NextResponse.json(
      {
        error: "unauthorized",
        debug: { providedLength: provided?.length ?? 0, expectedLength: expected?.length ?? 0, expectedSet: expected !== undefined },
      },
      { status: 401 },
    );
  }
  await ensureSchema();
  return NextResponse.json({ ok: true });
}
