import { describe, it, expect } from "vitest";
import { route } from "../src/router/tier-router.js";

describe("tier-router", () => {
  it("routes short simple requests to the local tier", () => {
    expect(route("traduz: bom dia").tier).toBe("local");
  });

  it("routes architecture/complex requests to the premium tier", () => {
    expect(route("explica a arquitetura de microserviços com trade-offs de latência").tier).toBe("premium");
  });

  it("routes code snippets to the premium tier", () => {
    expect(route("corrige este código:\n```js\nfunction f() {}\n```").tier).toBe("premium");
  });
});
