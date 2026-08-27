import { sql } from "./db";

export interface RequestLogEntry {
  endpoint: string;
  provider: string;
  model?: string;
  tier?: string;
  cacheHit: boolean;
  tokensEstimate: number;
}

export async function logRequest(userId: string, entry: RequestLogEntry): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO request_log (user_id, endpoint, provider, model, tier, cache_hit, tokens_estimate)
    VALUES (${userId}, ${entry.endpoint}, ${entry.provider}, ${entry.model ?? null}, ${entry.tier ?? null}, ${entry.cacheHit}, ${entry.tokensEstimate})
  `;
}

export async function listRecentRequests(userId: string, limit = 50) {
  const db = sql();
  return (await db`
    SELECT endpoint, provider, model, tier, cache_hit, tokens_estimate, created_at
    FROM request_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as {
    endpoint: string;
    provider: string;
    model: string | null;
    tier: string | null;
    cache_hit: boolean;
    tokens_estimate: number;
    created_at: string;
  }[];
}

export interface DailyPoint {
  day: string;
  requests: number;
  cacheHits: number;
  tokensSaved: number;
}

/** Agrega os pedidos dos últimos N dias, um ponto por dia, para o gráfico do dashboard. */
export async function getDailyStats(userId: string, days = 14): Promise<DailyPoint[]> {
  const db = sql();
  const rows = (await db`
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
      count(*)::int AS requests,
      count(*) FILTER (WHERE cache_hit)::int AS cache_hits,
      coalesce(sum(tokens_estimate) FILTER (WHERE cache_hit), 0)::int AS tokens_saved
    FROM request_log
    WHERE user_id = ${userId} AND created_at >= now() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  `) as { day: string; requests: number; cache_hits: number; tokens_saved: number }[];

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);
    points.push({
      day: key,
      requests: row?.requests ?? 0,
      cacheHits: row?.cache_hits ?? 0,
      tokensSaved: row?.tokens_saved ?? 0,
    });
  }
  return points;
}
