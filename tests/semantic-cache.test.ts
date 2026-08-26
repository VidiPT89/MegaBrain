import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "../src/cache/semantic-cache.js";

describe("SemanticCache", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns no match on an empty cache", () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    expect(cache.find("qual a capital de Portugal")).toBeNull();
  });

  it("hits on a reworded but semantically similar prompt", () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    cache.store("qual a capital de Portugal", "Lisboa");
    const match = cache.find("qual é a capital de Portugal");
    expect(match?.entry.response).toBe("Lisboa");
  });

  it("misses on an unrelated prompt", () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    cache.store("qual a capital de Portugal", "Lisboa");
    expect(cache.find("como faço um bolo de chocolate")).toBeNull();
  });

  it("clear empties the cache", () => {
    const cache = new SemanticCache(join(dir, "cache.json"));
    cache.store("olá", "mundo");
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
