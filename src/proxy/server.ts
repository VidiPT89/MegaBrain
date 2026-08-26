import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { homedir } from "node:os";
import { SemanticCache } from "../cache/semantic-cache.js";
import { route } from "../router/tier-router.js";
import { StatsTracker } from "../stats/tracker.js";
import {
  extractOpenAIPrompt,
  extractAnthropicPrompt,
  buildOpenAICacheResponse,
  buildAnthropicCacheResponse,
  extractOpenAIResponseText,
  extractAnthropicResponseText,
  type OpenAIChatRequest,
  type AnthropicMessagesRequest,
} from "./adapters.js";

function getOpenAIBaseUrl(): string {
  return process.env.MEGABRAIN_OPENAI_BASE_URL ?? "https://api.openai.com";
}

function getAnthropicBaseUrl(): string {
  return process.env.MEGABRAIN_ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

export interface ProxyOptions {
  port: number;
  cacheThreshold?: number;
}

export function startProxy(options: ProxyOptions) {
  const home = join(homedir(), ".megabrain");
  const cache = new SemanticCache(join(home, "cache.json"), options.cacheThreshold ?? 0.85);
  const stats = new StatsTracker(join(home, "stats.json"));

  const server = createServer(async (req, res) => {
    if (req.method !== "POST") {
      sendJson(res, 404, { error: "not found" });
      return;
    }

    try {
      if (req.url === "/v1/chat/completions") {
        await handleOpenAI(req, res);
      } else if (req.url === "/v1/messages") {
        await handleAnthropic(req, res);
      } else {
        sendJson(res, 404, { error: "not found" });
      }
    } catch (err) {
      sendJson(res, 502, { error: "megabrain proxy error", detail: (err as Error).message });
    }
  });

  async function handleOpenAI(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const raw = await readBody(req);
    const body = JSON.parse(raw) as OpenAIChatRequest;
    const prompt = extractOpenAIPrompt(body);

    const cached = cache.find(prompt);
    if (cached) {
      stats.recordCacheHit(Math.ceil(prompt.length / 4));
      sendJson(res, 200, buildOpenAICacheResponse(body.model, cached.entry.response));
      return;
    }

    const decision = route(prompt);
    stats.recordRoute(decision.tier);

    const apiKey = req.headers.authorization ?? `Bearer ${process.env.OPENAI_API_KEY ?? ""}`;
    const upstream = await fetch(`${getOpenAIBaseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey as string },
      body: raw,
    });
    const payload = await upstream.json();
    const text = extractOpenAIResponseText(payload);
    if (text) cache.store(prompt, text);
    sendJson(res, upstream.status, { ...payload, megabrain: { cache_hit: false, tier: decision.tier } });
  }

  async function handleAnthropic(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const raw = await readBody(req);
    const body = JSON.parse(raw) as AnthropicMessagesRequest;
    const prompt = extractAnthropicPrompt(body);

    const cached = cache.find(prompt);
    if (cached) {
      stats.recordCacheHit(Math.ceil(prompt.length / 4));
      sendJson(res, 200, buildAnthropicCacheResponse(body.model, cached.entry.response));
      return;
    }

    const decision = route(prompt);
    stats.recordRoute(decision.tier);

    const apiKey = (req.headers["x-api-key"] as string) ?? process.env.ANTHROPIC_API_KEY ?? "";
    const version = (req.headers["anthropic-version"] as string) ?? "2023-06-01";
    const upstream = await fetch(`${getAnthropicBaseUrl()}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": version },
      body: raw,
    });
    const payload = await upstream.json();
    const text = extractAnthropicResponseText(payload);
    if (text) cache.store(prompt, text);
    sendJson(res, upstream.status, { ...payload, megabrain: { cache_hit: false, tier: decision.tier } });
  }

  server.listen(options.port, () => {
    console.log(`MegaBrain proxy a correr em http://localhost:${options.port}`);
    console.log(`  OpenAI:    POST /v1/chat/completions  -> ${getOpenAIBaseUrl()}`);
    console.log(`  Anthropic: POST /v1/messages          -> ${getAnthropicBaseUrl()}`);
  });

  return server;
}
