# 🧠 MegaBrain

> A drop-in OpenAI/Anthropic-compatible proxy that cuts LLM token spend before a single token is spent — semantic cache, cost-tier routing to the cheapest capable provider, native prompt caching, and a live savings dashboard.

[Report Bug](https://github.com/VidiPT89/MegaBrain/issues) · [Request Feature](https://github.com/VidiPT89/MegaBrain/issues)

**Hosted version:** a multi-tenant web app (sign in with GitHub, bring your own key) lives in [`web/`](web/) — see [web/README.md](web/README.md) to run or deploy it.

![MegaBrain dashboard](docs/dashboard.jpg)

Point an OpenAI or Anthropic SDK's `base_url` at MegaBrain instead of the real provider, no other code change. Every request is checked against a semantic cache first; a miss gets classified into a cost tier and routed to the cheapest provider that can serve it — a local Ollama model, a free tier (Groq, Gemini), or a paid one, whichever is configured and cheapest. A live dashboard shows exactly how much that saved, in real time.

## 📦 What's Inside

- 🔌 Drop-in proxy — `/v1/chat/completions` (OpenAI) and `/v1/messages` (Anthropic), same request/response shape, streaming included
- 🧠 Semantic cache — real embeddings (Ollama `nomic-embed-text`) when available, term-frequency cosine similarity fallback otherwise, applied only to single-turn requests
- 🎯 Cost-tier router — classifies each prompt as `local` / `mid` / `premium`, then auto-picks the cheapest configured provider for that tier (Ollama → Groq/Gemini free tier → paid fallback)
- ⚡ Native Anthropic prompt caching — tags the system prompt and the end of the previous turn with `cache_control`, so the provider itself caches that prefix on multi-turn conversations (coding agents, chat UIs) at roughly 90% less cost, safely — no similarity heuristic involved
- 📊 Live dashboard — animated stats: total requests, cache hit rate, tokens saved, tier and provider distribution, real prompt-cache read tokens from the provider's own response
- 🌗 PT / EN and dark / light toggles, remembered per browser
- 💻 CLI standalone mode — `ask`, `remember`, `stats`, `cache clear` without running a server
- 🆓 Works fully offline and free against a local Ollama instance — no API key needed at all
- ▶️ One command to start everything — boots Ollama if needed, the proxy and the dashboard, and opens the browser

## 🛠️ Tech Stack

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2-6E9F18?style=flat&logo=vitest&logoColor=white)

| Category | Technology |
|---|---|
| Runtime | Node.js, plain `node:http` — no framework dependency |
| Language | TypeScript |
| Cache | Term-frequency cosine similarity, real embeddings when Ollama is reachable |
| Dashboard | Vanilla HTML/CSS/JS, animated stats, PT/EN and dark/light toggles |
| Tests | Vitest |

## 🏗️ Architecture

```
MegaBrain/
├── src/
│   ├── proxy/          # OpenAI/Anthropic-compatible drop-in proxy
│   ├── cache/           # Semantic cache
│   ├── router/          # Cost-tier classification + cheapest-provider selection
│   ├── stats/            # Savings tracker
│   ├── dashboard/      # Live stats dashboard
│   ├── cli.ts
│   └── index.ts
├── web/                  # Hosted multi-tenant version (Next.js on Vercel, Postgres on Neon)
├── docs/
├── tests/
├── LICENSE
└── README.md
```

### Why these choices

- **Cheapest-capable provider per tier, not just classification**: routing a prompt to `local`/`mid`/`premium` is only half the problem — the router also tries the cheapest provider that can actually serve that tier (Ollama for `local`, Groq then Gemini's free tier for `mid`) before ever falling back to a paid one, so the tier decision translates directly into money saved, not just a label.
- **Semantic cache only on single-turn requests**: caching by the last message alone breaks on multi-turn conversations — two different conversations can end on the same short reply ("continue", "yes") and collide. Caching the full transcript doesn't fix it either, since a shared boilerplate prefix dominates the similarity score. The safe line is to skip the cache entirely once there's more than one turn, and let tier/provider routing do the saving instead.
- **Native provider prompt caching for multi-turn instead**: Anthropic's own server-side cache (`cache_control`) solves exactly the case the semantic cache opts out of, safely — the provider matches on an exact prefix, not a heuristic, so there's no risk of serving one conversation's cached reply to another.
- **`node:http` over a framework**: the proxy is a thin pass-through with a handful of routes; a framework would add a dependency and startup cost for no real benefit here.

## 🌐 API

```
POST /v1/chat/completions   — OpenAI-compatible chat proxy, cache + tier + provider routing
POST /v1/messages           — Anthropic-compatible messages proxy, cache + tier routing + native prompt caching
GET  /api/stats             — JSON savings snapshot, used by the dashboard
GET  /                      — live dashboard UI
```

## 🚀 How to Run

**Prerequisites:** Node.js 18+, and either an OpenAI/Anthropic API key or [Ollama](https://ollama.com) running locally for a fully free setup.

```bash
git clone https://github.com/VidiPT89/MegaBrain.git
cd MegaBrain
npm install
npm run build
npm test
```

**Fully free, one command** (requires Ollama with a model pulled, e.g. `ollama pull qwen2.5-coder:7b`):

```bash
echo "MEGABRAIN_OPENAI_BASE_URL=http://localhost:11434" > .env
echo "OPENAI_API_KEY=ollama" >> .env
npm run start
```

Boots Ollama if it isn't already running, then the proxy and the dashboard, and opens `http://localhost:4321`.

**With a paid provider:**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
node dist/cli.js proxy 8787
node dist/cli.js dashboard 4321
```

**Or install the CLI globally:**

```bash
npm install -g megabrain-cli
megabrain init     # detects Ollama, writes a working .env
megabrain start    # proxy + dashboard, opens the browser
```

Point your app's `base_url` at `http://localhost:8787` instead of the real provider — no other code change. Free-tier providers for the `mid` cost tier: set `MEGABRAIN_GROQ_API_KEY` and/or `MEGABRAIN_GEMINI_API_KEY` to have MegaBrain try them before falling back to a paid one.

## ✅ Tests

```bash
npm test
```

Vitest covers cost-tier classification, cheapest-provider selection per tier, multi-turn cache-skip logic, native prompt-caching tag placement, and semantic cache behavior — including a regression test (when a real embeddings server is reachable) ensuring two different prompts sharing a large boilerplate template aren't confused as duplicates.

## 📄 License

MIT — see [LICENSE](LICENSE).

---

Developed by **David Arsénio Martins**
🌐 [ividi.dev](https://ividi.dev/) · 💻 [github.com/VidiPT89](https://github.com/VidiPT89/)
