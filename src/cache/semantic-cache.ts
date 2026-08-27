import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getEmbedding, cosineSimilarityArray } from "./embeddings.js";

export interface CacheEntry {
  prompt: string;
  vector: Record<string, number>;
  embedding?: number[];
  response: string;
  createdAt: string;
  hits: number;
}

export interface CacheMatch {
  entry: CacheEntry;
  similarity: number;
  method: "embedding" | "term-frequency";
}

const TOKEN_RE = /[a-zà-ú0-9]+/gi;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).filter((t) => t.length > 1);
}

function toVector(text: string): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const token of tokenize(text)) {
    vector[token] = (vector[token] ?? 0) + 1;
  }
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
  for (const key in b) {
    normB += b[key] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Cache semântico. Usa embeddings reais (ex. Ollama nomic-embed-text) quando
 * disponíveis, para apanhar paráfrases distantes; recua automaticamente para
 * similaridade term-frequency (sem rede) quando o serviço de embeddings não
 * responde. Uma vez indisponível, deixa de tentar nessa instância (evita
 * repetir timeouts em cada pedido).
 */
export class SemanticCache {
  private entries: CacheEntry[] = [];
  private readonly filePath: string;
  private readonly threshold: number;
  private readonly embeddingThreshold: number;
  private embeddingAvailable: boolean | null = null;

  constructor(filePath: string, threshold = 0.85, embeddingThreshold = 0.93) {
    this.filePath = filePath;
    this.threshold = threshold;
    this.embeddingThreshold = embeddingThreshold;
    this.load();
  }

  private load(): void {
    if (existsSync(this.filePath)) {
      this.entries = JSON.parse(readFileSync(this.filePath, "utf-8"));
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
  }

  private async tryGetEmbedding(text: string): Promise<number[] | null> {
    if (this.embeddingAvailable === false) return null;
    const embedding = await getEmbedding(text);
    this.embeddingAvailable = embedding !== null;
    return embedding;
  }

  async find(prompt: string): Promise<CacheMatch | null> {
    const queryEmbedding = await this.tryGetEmbedding(prompt);
    const queryVector = toVector(prompt);

    let best: CacheMatch | null = null;
    for (const entry of this.entries) {
      let similarity: number;
      let method: CacheMatch["method"];
      if (queryEmbedding && entry.embedding) {
        similarity = cosineSimilarityArray(queryEmbedding, entry.embedding);
        method = "embedding";
      } else {
        similarity = cosineSimilarity(queryVector, entry.vector);
        method = "term-frequency";
      }
      const threshold = method === "embedding" ? this.embeddingThreshold : this.threshold;
      if (similarity >= threshold && (!best || similarity > best.similarity)) {
        best = { entry, similarity, method };
      }
    }
    if (best) {
      best.entry.hits += 1;
      this.persist();
    }
    return best;
  }

  async store(prompt: string, response: string): Promise<void> {
    const embedding = await this.tryGetEmbedding(prompt);
    this.entries.push({
      prompt,
      vector: toVector(prompt),
      embedding: embedding ?? undefined,
      response,
      createdAt: new Date().toISOString(),
      hits: 0,
    });
    this.persist();
  }

  clear(): void {
    this.entries = [];
    this.persist();
  }

  get size(): number {
    return this.entries.length;
  }
}
