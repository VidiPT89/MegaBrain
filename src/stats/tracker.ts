import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface StatsSnapshot {
  totalRequests: number;
  cacheHits: number;
  tierCounts: Record<string, number>;
  tokensSavedEstimate: number;
}

const EMPTY: StatsSnapshot = {
  totalRequests: 0,
  cacheHits: 0,
  tierCounts: { local: 0, mid: 0, premium: 0 },
  tokensSavedEstimate: 0,
};

export class StatsTracker {
  private readonly filePath: string;
  private data: StatsSnapshot;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = existsSync(filePath)
      ? JSON.parse(readFileSync(filePath, "utf-8"))
      : { ...EMPTY, tierCounts: { ...EMPTY.tierCounts } };
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

  snapshot(): StatsSnapshot {
    return this.data;
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
