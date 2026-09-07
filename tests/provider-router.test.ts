import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveProvider } from "../src/router/provider-router.js";

const ENV_KEYS = [
  "MEGABRAIN_LOCAL_BASE_URL",
  "MEGABRAIN_LOCAL_MODEL",
  "MEGABRAIN_GROQ_API_KEY",
  "MEGABRAIN_GROQ_BASE_URL",
  "MEGABRAIN_GROQ_MODEL",
  "MEGABRAIN_GEMINI_API_KEY",
  "MEGABRAIN_GEMINI_BASE_URL",
  "MEGABRAIN_GEMINI_MODEL",
  "MEGABRAIN_OPENAI_BASE_URL",
  "OPENAI_API_KEY",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("provider-router", () => {
  it("routes the local tier to Ollama by default, no key required", () => {
    const target = resolveProvider("local");
    expect(target.provider).toBe("ollama");
    expect(target.baseUrl).toBe("http://localhost:11434");
  });

  it("prefers Groq over Gemini for the mid tier when both are configured", () => {
    process.env.MEGABRAIN_GROQ_API_KEY = "groq-key";
    process.env.MEGABRAIN_GEMINI_API_KEY = "gemini-key";
    const target = resolveProvider("mid");
    expect(target.provider).toBe("groq");
  });

  it("falls back to Gemini for the mid tier when Groq isn't configured", () => {
    process.env.MEGABRAIN_GEMINI_API_KEY = "gemini-key";
    const target = resolveProvider("mid");
    expect(target.provider).toBe("gemini");
    expect(target.model).toBe("gemini-1.5-flash");
  });

  it("falls back to the premium provider for the mid tier when nothing free is configured", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const target = resolveProvider("mid");
    expect(target.provider).toBe("openai");
  });

  it("routes the premium tier to OpenAI using OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const target = resolveProvider("premium");
    expect(target.provider).toBe("openai");
    expect(target.apiKey).toBe("sk-test");
  });
});
