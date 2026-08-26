# 🧠 MegaBrain

> Drop-in OpenAI/Anthropic-compatible proxy, CLI and live dashboard that cut LLM token spend, painted in the ividi.dev palette (black, burnt orange, amber).

[🐞 Report Bug](https://github.com/VidiPT89/MegaBrain/issues) · [✨ Request Feature](https://github.com/VidiPT89/MegaBrain/issues)

MegaBrain sits between your app and your LLM provider. Point your OpenAI or Anthropic SDK at it, no code changes, and it decides if a call is even worth making before spending a single token: a semantic cache answers repeated questions instantly, a tier router flags how complex each prompt really is, and a live dashboard shows exactly how much you saved. It works just as well with a fully local, free backend like Ollama.

## ✨ Main Features

- ✅ **Drop-in proxy** — `/v1/chat/completions` (OpenAI) and `/v1/messages` (Anthropic), same request/response shape
- ✅ **Semantic cache** — cosine similarity over term-frequency vectors catches reworded duplicate questions, zero external dependencies
- ✅ **Tier router** — heuristic `local` / `mid` / `premium` classification so you know when a cheap model is enough
- ✅ **Lazy-loaded skills** — Markdown files with frontmatter triggers, only the matched skill's body is read
- ✅ **Live dashboard** — animated stats: total requests, cache hit rate, tokens saved, tier distribution
- ✅ **PT / EN toggle** — remembered in `localStorage`
- ✅ **Dark / light** — dark by default, same burnt orange and amber, cream paper in light mode
- ✅ **Works fully offline and free** — point it at a local Ollama instance instead of a paid API
- ✅ **CLI standalone mode** — `ask`, `remember`, `stats`, `cache clear` without running a server

## 🛠️ Technologies

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2-6E9F18?style=flat&logo=vitest&logoColor=white)

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js (`node:http`) | Proxy and dashboard servers, no framework dependency |
| **Language** | TypeScript | CLI, proxy, cache, router, dashboard |
| **Cache** | Term-frequency + cosine similarity | Semantic matching without an embeddings API |
| **Dashboard** | Vanilla HTML/CSS/JS | Animated stats, PT/EN and dark/light toggles |
| **Tests** | Vitest | Tier router and semantic cache coverage |

## 🧱 Project Structure

```text
MegaBrain/
├── src/
│   ├── cache/        # Semantic cache
│   ├── router/        # Tier router
│   ├── skills/         # Lazy-loaded Markdown skills
│   ├── stats/          # Savings tracker
│   ├── proxy/          # OpenAI/Anthropic-compatible drop-in proxy
│   ├── dashboard/    # Live stats dashboard (PT/EN, dark/light)
│   ├── cli.ts
│   └── index.ts
├── skills/
├── tests/
├── LICENSE
└── README.md
```

## ▶️ How to Run

### Prerequisites

- **Node.js** 18+
- An OpenAI or Anthropic API key, **or** [Ollama](https://ollama.com) running locally for a fully free setup

### Installation

```bash
git clone https://github.com/VidiPT89/MegaBrain.git
cd MegaBrain
npm install
npm run build
npm test
```

### Running with a paid provider

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run build && node dist/cli.js proxy 8787
```

### Running for free with Ollama

```bash
ollama serve
ollama pull qwen2.5-coder:7b

echo "MEGABRAIN_OPENAI_BASE_URL=http://localhost:11434" > .env
echo "OPENAI_API_KEY=ollama" >> .env

npm run build && node dist/cli.js proxy 8787
```

Then open the dashboard:

```bash
node dist/cli.js dashboard 4321
```

Open [http://localhost:4321](http://localhost:4321).

## 📖 Usage

1. Start `megabrain proxy` and point your app's `base_url` at `http://localhost:8787` instead of the real provider — no other code changes.
2. Every request is checked against the semantic cache first; a hit returns instantly with `usage: 0` and `megabrain.cache_hit: true`.
3. On a miss, the request is classified into a tier (`local` / `mid` / `premium`) and forwarded to the real provider; the response is cached for next time.
4. Open `megabrain dashboard` to watch requests, cache hit rate, tokens saved and tier distribution update live. Toggle **PT/EN** and **Dark/Light** in the header.
5. Or skip the server entirely: `megabrain ask "<prompt>"`, `megabrain remember "<prompt>" "<response>"`, `megabrain stats`.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat/completions` | OpenAI-compatible chat proxy with cache + tier routing |
| POST | `/v1/messages` | Anthropic-compatible messages proxy with cache + tier routing |
| GET | `/api/stats` | JSON savings snapshot, used by the dashboard |
| GET | `/` | Live dashboard UI |

## 🧪 Testing

```bash
npm test
```

Vitest covers tier classification (local/mid/premium) and semantic cache behavior (hit on reworded prompts, miss on unrelated ones, clear).

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.

---

Developed by **David Arsénio Martins**
🌐 [ividi.dev](https://ividi.dev/) · 💻 [github.com/VidiPT89](https://github.com/VidiPT89/)
