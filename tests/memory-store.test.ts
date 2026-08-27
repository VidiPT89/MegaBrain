import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryStore } from "../src/memory/store.js";

describe("MemoryStore", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("lists no facts on an empty store", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-memory-test-"));
    const store = new MemoryStore(join(dir, "memory.json"));
    expect(store.list()).toEqual([]);
  });

  it("finds facts that share a keyword with the query", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-memory-test-"));
    const store = new MemoryStore(join(dir, "memory.json"));
    store.add("O Vidi prefere respostas curtas e diretas");
    store.add("O projeto MegaBrain usa Ollama local por defeito");

    const results = store.search("respostas curtas");
    expect(results).toHaveLength(1);
    expect(results[0].text).toContain("respostas curtas");
  });

  it("returns nothing for an unrelated query", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-memory-test-"));
    const store = new MemoryStore(join(dir, "memory.json"));
    store.add("O Vidi prefere respostas curtas e diretas");
    expect(store.search("bolo de chocolate")).toEqual([]);
  });

  it("clear empties the store", () => {
    dir = mkdtempSync(join(tmpdir(), "megabrain-memory-test-"));
    const store = new MemoryStore(join(dir, "memory.json"));
    store.add("olá");
    store.clear();
    expect(store.list()).toEqual([]);
  });
});
