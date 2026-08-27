import { neon } from "@neondatabase/serverless";

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não está definido");
  return neon(process.env.DATABASE_URL);
}

/** Cria as tabelas necessárias se ainda não existirem. Chamar uma vez no arranque/deploy. */
export async function ensureSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_login TEXT NOT NULL,
      name TEXT,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS api_keys (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, provider)
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS cache_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      vector JSONB NOT NULL,
      response TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS cache_entries_user_id_idx ON cache_entries(user_id)`;
  await db`
    CREATE TABLE IF NOT EXISTS usage_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_requests INTEGER NOT NULL DEFAULT 0,
      cache_hits INTEGER NOT NULL DEFAULT 0,
      tier_local INTEGER NOT NULL DEFAULT 0,
      tier_mid INTEGER NOT NULL DEFAULT 0,
      tier_premium INTEGER NOT NULL DEFAULT 0,
      tokens_saved_estimate INTEGER NOT NULL DEFAULT 0
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS request_log (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT,
      tier TEXT,
      cache_hit BOOLEAN NOT NULL,
      tokens_estimate INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS request_log_user_id_created_at_idx ON request_log(user_id, created_at DESC)`;
}
