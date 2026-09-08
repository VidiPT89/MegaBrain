import { describe, it, expect } from "vitest";
import { isMultiTurn, injectAnthropicPromptCaching, type AnthropicMessagesRequest } from "../src/proxy/adapters.js";

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

describe("injectAnthropicPromptCaching", () => {
  function base(): AnthropicMessagesRequest {
    return { model: "claude-sonnet-5", max_tokens: 100, messages: [{ role: "user", content: "olá" }] };
  }

  it("wraps a string system prompt into a cache_control-tagged block", () => {
    const body = { ...base(), system: "és um assistente útil" };
    const result = injectAnthropicPromptCaching(body);
    expect(result.system).toEqual([{ type: "text", text: "és um assistente útil", cache_control: { type: "ephemeral" } }]);
  });

  it("only tags the last block of an array system prompt", () => {
    const body = { ...base(), system: [{ type: "text", text: "a" }, { type: "text", text: "b" }] };
    const result = injectAnthropicPromptCaching(body) as AnthropicMessagesRequest & {
      system: { text: string; cache_control?: unknown }[];
    };
    expect(result.system[0].cache_control).toBeUndefined();
    expect(result.system[1].cache_control).toEqual({ type: "ephemeral" });
  });

  it("does not touch an already-tagged block", () => {
    const body = { ...base(), system: [{ type: "text", text: "a", cache_control: { type: "custom" } }] };
    const result = injectAnthropicPromptCaching(body) as AnthropicMessagesRequest & {
      system: { cache_control?: unknown }[];
    };
    expect(result.system[0].cache_control).toEqual({ type: "custom" });
  });

  it("tags the end of the previous turn, not the new final message, in a multi-turn conversation", () => {
    const body: AnthropicMessagesRequest = {
      ...base(),
      messages: [
        { role: "user", content: "primeira pergunta" },
        { role: "assistant", content: "primeira resposta" },
        { role: "user", content: "segunda pergunta" },
      ],
    };
    const result = injectAnthropicPromptCaching(body);
    const messages = result.messages as { content: { cache_control?: unknown }[] | string }[];
    expect(messages[1].content).toEqual([{ type: "text", text: "primeira resposta", cache_control: { type: "ephemeral" } }]);
    expect(messages[2].content).toBe("segunda pergunta"); // última mensagem fica intocada — é sempre nova
  });

  it("leaves a single-turn request's messages untouched", () => {
    const body = base();
    const result = injectAnthropicPromptCaching(body);
    expect(result.messages).toEqual(body.messages);
  });

  it("does nothing when there is no system prompt and only one message", () => {
    const body = base();
    const result = injectAnthropicPromptCaching(body);
    expect(result.system).toBeUndefined();
  });
});
