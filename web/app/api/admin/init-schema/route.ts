import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";

/**
 * Cria as tabelas na base de dados se ainda não existirem. Protegido por um
 * segredo (MEGABRAIN_ENCRYPTION_KEY, já disponível no ambiente) passado no
 * header — chamar uma vez depois do primeiro deploy, não fica exposto a
 * ninguém sem o segredo.
 */
export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-init-secret");
  if (!provided || provided !== process.env.MEGABRAIN_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  return NextResponse.json({ ok: true });
}
