import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SemanticCache } from "../src/cache/semantic-cache.js";
import { getEmbedding } from "../src/cache/embeddings.js";

describe("SemanticCache with real embeddings (skipped if no embeddings server is reachable)", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("does not confuse two different prompts sharing a large boilerplate template", async () => {
    const embedding = await getEmbedding("ping");
    if (!embedding) {
      console.warn("skipping: no embeddings server reachable (MEGABRAIN_EMBEDDING_URL)");
      return;
    }

    dir = mkdtempSync(join(tmpdir(), "megabrain-embed-test-"));
    const cache = new SemanticCache(join(dir, "cache.json"));

    const wrap = (step: string) =>
      `Objetivo geral: escreve um plano\nExecuta apenas este passo e devolve o resultado, nada mais:\nPasso: ${step}`;

    await cache.store(wrap("Defina metas mensais claras."), "resposta do passo 1");
    const match = await cache.find(wrap("Ouça música de guitarra para desenvolver o seu estilo."));

    expect(match).toBeNull();
  });
});
