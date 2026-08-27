import { sql } from "./db";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 30;

/** Limite simples por utilizador: no máximo N pedidos por minuto, baseado no request_log. */
export async function isRateLimited(userId: string): Promise<boolean> {
  const db = sql();
  const rows = (await db`
    SELECT count(*)::int AS count FROM request_log
    WHERE user_id = ${userId} AND created_at >= now() - (${WINDOW_SECONDS} || ' seconds')::interval
  `) as { count: number }[];
  return (rows[0]?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW;
}

export const RATE_LIMIT_MESSAGE = `Demasiados pedidos — o limite é ${MAX_REQUESTS_PER_WINDOW} por minuto. Espera um pouco e tenta outra vez.`;
