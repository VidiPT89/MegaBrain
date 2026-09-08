import { describe, it, expect } from "vitest";
import { isMultiTurn } from "../src/proxy/adapters.js";

describe("isMultiTurn", () => {
  it("treats a single user message as single-turn (cacheable)", () => {
    expect(isMultiTurn([{ role: "user" }])).toBe(false);
  });

  it("ignores a system message when deciding turn count", () => {
    expect(isMultiTurn([{ role: "system" }, { role: "user" }])).toBe(false);
  });

  it("treats a user+assistant+user history as multi-turn (not cacheable)", () => {
    expect(isMultiTurn([{ role: "user" }, { role: "assistant" }, { role: "user" }])).toBe(true);
  });
});
