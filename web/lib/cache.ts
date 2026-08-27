import { sql } from "./db";

const TOKEN_RE = /[a-zà-ú0-9]+/gi;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).filter((t) => t.length > 1);
}

function toVector(text: string): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const token of tokenize(text)) vector[token] = (vector[token] ?? 0) + 1;
  return vector;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key in a) {
    dot += a[key] * (b[key] ?? 0);
    normA += a[key] ** 2;
  }
  for (const key in b) normB += b[key] ** 2;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface CacheMatch {
  response: string;
  similarity: number;
}

const THRESHOLD = 0.85;

/**
 * Cache semântico por utilizador, guardado em Postgres (sem disco local —
 * necessário num ambiente serverless). Usa term-frequency, tal como o
 * fallback do CLI; sem embeddings reais aqui porque não há um servidor
 * Ollama acessível em produção sem custo.
 */
export async function findCached(userId: string, prompt: string): Promise<CacheMatch | null> {
  const db = sql();
  const rows = (await db`
    SELECT id, vector, response FROM cache_entries WHERE user_id = ${userId}
  `) as { id: number; vector: Record<string, number>; response: string }[];

  const queryVector = toVector(prompt);
  let best: { id: number; response: string; similarity: number } | null = null;
  for (const row of rows) {
    const similarity = cosineSimilarity(queryVector, row.vector);
    if (similarity >= THRESHOLD && (!best || similarity > best.similarity)) {
      best = { id: row.id, response: row.response, similarity };
    }
  }

  if (best) {
    await db`UPDATE cache_entries SET hits = hits + 1 WHERE id = ${best.id}`;
    return { response: best.response, similarity: best.similarity };
  }
  return null;
}

export async function storeCache(userId: string, prompt: string, response: string): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO cache_entries (user_id, prompt, vector, response)
    VALUES (${userId}, ${prompt}, ${JSON.stringify(toVector(prompt))}, ${response})
  `;
}
