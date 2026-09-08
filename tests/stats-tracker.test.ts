import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StatsTracker } from "../src/stats/tracker.js";

let dir: string;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("StatsTracker", () => {
  it("records provider counts", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-stats-"));
    const tracker = new StatsTracker(join(dir, "stats.json"));
    tracker.recordProvider("ollama");
    tracker.recordProvider("ollama");
    tracker.recordProvider("groq");
    expect(tracker.snapshot().providerCounts).toEqual({ ollama: 2, groq: 1 });
  });

  it("loads a stats.json written before providerCounts existed without crashing", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-stats-"));
    const filePath = join(dir, "stats.json");
    writeFileSync(
      filePath,
      JSON.stringify({ totalRequests: 3, cacheHits: 1, tierCounts: { local: 2, mid: 1, premium: 0 }, tokensSavedEstimate: 10 }),
    );
    const tracker = new StatsTracker(filePath);
    tracker.recordProvider("openai");
    expect(tracker.snapshot().providerCounts).toEqual({ openai: 1 });
    expect(tracker.snapshot().totalRequests).toBe(3);
  });
});
