import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface CacheEntry {
  prompt: string;
  vector: Record<string, number>;
  response: string;
  createdAt: string;
  hits: number;
}

export interface CacheMatch {
  entry: CacheEntry;
  similarity: number;
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
 * Cache semântico baseado em similaridade de vetores term-frequency.
 * Suficiente como baseline sem dependências externas; pode ser trocado
 * por embeddings reais (ex. via API) mantendo a mesma interface.
 */
export class SemanticCache {
  private entries: CacheEntry[] = [];
  private readonly filePath: string;
  private readonly threshold: number;

  constructor(filePath: string, threshold = 0.85) {
    this.filePath = filePath;
    this.threshold = threshold;
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

  find(prompt: string): CacheMatch | null {
    const vector = toVector(prompt);
    let best: CacheMatch | null = null;
    for (const entry of this.entries) {
      const similarity = cosineSimilarity(vector, entry.vector);
      if (similarity >= this.threshold && (!best || similarity > best.similarity)) {
        best = { entry, similarity };
      }
    }
    if (best) {
      best.entry.hits += 1;
      this.persist();
    }
    return best;
  }

  store(prompt: string, response: string): void {
    this.entries.push({
      prompt,
      vector: toVector(prompt),
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
