import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface MemoryFact {
  text: string;
  createdAt: string;
}

const TOKEN_RE = /[a-zà-ú0-9]+/gi;

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).filter((t) => t.length > 2);
}

/**
 * Memória persistente de factos entre sessões — diferente do cache semântico
 * (que guarda respostas a perguntas). Aqui guardam-se factos que o agente ou
 * o utilizador querem que fiquem disponíveis em execuções futuras.
 */
export class MemoryStore {
  private facts: MemoryFact[] = [];
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    if (existsSync(filePath)) {
      this.facts = JSON.parse(readFileSync(filePath, "utf-8"));
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.facts, null, 2));
  }

  add(text: string): void {
    this.facts.push({ text, createdAt: new Date().toISOString() });
    this.persist();
  }

  list(): MemoryFact[] {
    return this.facts;
  }

  /** Devolve os factos cujo texto partilha pelo menos uma palavra relevante com a query. */
  search(query: string, limit = 5): MemoryFact[] {
    const queryTokens = new Set(tokenize(query));
    if (queryTokens.size === 0) return [];
    return this.facts
      .map((fact) => ({ fact, overlap: tokenize(fact.text).filter((t) => queryTokens.has(t)).length }))
      .filter((scored) => scored.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map((scored) => scored.fact);
  }

  clear(): void {
    this.facts = [];
    this.persist();
  }
}
