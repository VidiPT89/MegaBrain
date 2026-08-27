import { sql } from "./db";
import type { Tier } from "./router";

async function ensureRow(userId: string): Promise<void> {
  const db = sql();
  await db`INSERT INTO usage_stats (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
}

export async function recordCacheHit(userId: string, tokensSaved: number): Promise<void> {
  await ensureRow(userId);
  const db = sql();
  await db`
    UPDATE usage_stats
    SET total_requests = total_requests + 1,
        cache_hits = cache_hits + 1,
        tokens_saved_estimate = tokens_saved_estimate + ${tokensSaved}
    WHERE user_id = ${userId}
  `;
}

export async function recordRoute(userId: string, tier: Tier): Promise<void> {
  await ensureRow(userId);
  const db = sql();
  // Coluna escolhida por switch (não interpolada de input do utilizador) — evita
  // montar SQL dinâmico com nomes de coluna vindos de fora.
  if (tier === "local") {
    await db`UPDATE usage_stats SET total_requests = total_requests + 1, tier_local = tier_local + 1 WHERE user_id = ${userId}`;
  } else if (tier === "mid") {
    await db`UPDATE usage_stats SET total_requests = total_requests + 1, tier_mid = tier_mid + 1 WHERE user_id = ${userId}`;
  } else {
    await db`UPDATE usage_stats SET total_requests = total_requests + 1, tier_premium = tier_premium + 1 WHERE user_id = ${userId}`;
  }
}

export async function getStats(userId: string) {
  const db = sql();
  const rows = (await db`SELECT * FROM usage_stats WHERE user_id = ${userId}`) as Record<string, number>[];
  const row = rows[0];
  return {
    totalRequests: row?.total_requests ?? 0,
    cacheHits: row?.cache_hits ?? 0,
    tierCounts: { local: row?.tier_local ?? 0, mid: row?.tier_mid ?? 0, premium: row?.tier_premium ?? 0 },
    tokensSavedEstimate: row?.tokens_saved_estimate ?? 0,
  };
}
