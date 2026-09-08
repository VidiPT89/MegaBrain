import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface StatsSnapshot {
  totalRequests: number;
  cacheHits: number;
  tierCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  tokensSavedEstimate: number;
  /** Tokens que a própria Anthropic serviu a partir do prompt cache dela (usage.cache_read_input_tokens), não do nosso cache. */
  providerCacheReadTokens: number;
}

const EMPTY: StatsSnapshot = {
  totalRequests: 0,
  cacheHits: 0,
  tierCounts: { local: 0, mid: 0, premium: 0 },
  providerCounts: {},
  tokensSavedEstimate: 0,
  providerCacheReadTokens: 0,
};

export class StatsTracker {
  private readonly filePath: string;
  private data: StatsSnapshot;

  constructor(filePath: string) {
    this.filePath = filePath;
    const loaded = existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf-8")) : {};
    // Merge onto EMPTY so files written before a field existed (ex. providerCounts) still load cleanly.
    this.data = {
      ...EMPTY,
      ...loaded,
      tierCounts: { ...EMPTY.tierCounts, ...loaded.tierCounts },
      providerCounts: { ...EMPTY.providerCounts, ...loaded.providerCounts },
    };
  }

  recordCacheHit(estimatedTokens: number): void {
    this.data.totalRequests += 1;
    this.data.cacheHits += 1;
    this.data.tokensSavedEstimate += estimatedTokens;
    this.persist();
  }

  recordRoute(tier: string): void {
    this.data.totalRequests += 1;
    this.data.tierCounts[tier] = (this.data.tierCounts[tier] ?? 0) + 1;
    this.persist();
  }

  recordProvider(provider: string): void {
    this.data.providerCounts[provider] = (this.data.providerCounts[provider] ?? 0) + 1;
    this.persist();
  }

  recordProviderCacheRead(tokens: number): void {
    this.data.providerCacheReadTokens += tokens;
    this.persist();
  }

  snapshot(): StatsSnapshot {
    return this.data;
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
