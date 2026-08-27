function getBaseUrl(): string {
  return process.env.MEGABRAIN_EMBEDDING_URL ?? "http://localhost:11434";
}

function getModel(): string {
  return process.env.MEGABRAIN_EMBEDDING_MODEL ?? "nomic-embed-text";
}

/**
 * Pede um embedding real a um servidor compatível com a API do Ollama.
 * Devolve null em caso de falha (timeout, servidor em baixo, modelo em falta)
 * para o chamador poder recuar para o fallback term-frequency sem quebrar.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: getModel(), prompt: text }),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

export function cosineSimilarityArray(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
