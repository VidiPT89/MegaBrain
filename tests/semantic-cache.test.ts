import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "../src/cache/semantic-cache.js";

describe("SemanticCache", () => {
  let dir: string;
  const originalEmbeddingUrl = process.env.MEGABRAIN_EMBEDDING_URL;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-test-"));
    // Force the term-frequency fallback so these tests are deterministic
    // regardless of whether a real embeddings server is running locally.
    process.env.MEGABRAIN_EMBEDDING_URL = "http://localhost:1";
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    process.env.MEGABRAIN_EMBEDDING_URL = originalEmbeddingUrl;
  });

  it("returns no match on an empty cache", async () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    expect(await cache.find("qual a capital de Portugal")).toBeNull();
  });

  it("hits on a reworded but semantically similar prompt", async () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    await cache.store("qual a capital de Portugal", "Lisboa");
    const match = await cache.find("qual é a capital de Portugal");
    expect(match?.entry.response).toBe("Lisboa");
    expect(match?.method).toBe("term-frequency");
  });

  it("misses on an unrelated prompt", async () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    await cache.store("qual a capital de Portugal", "Lisboa");
    expect(await cache.find("como faço um bolo de chocolate")).toBeNull();
  });

  it("clear empties the cache", async () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    await cache.store("olá", "mundo");
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
