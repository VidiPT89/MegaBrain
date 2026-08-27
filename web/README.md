# MegaBrain — hosted app

Multi-tenant version of MegaBrain: sign in with GitHub, add your own Gemini, OpenAI or Anthropic key, and get a hosted drop-in proxy plus a live savings dashboard. Gemini has a free tier with no credit card required. Each user's key is encrypted at rest and their cache/stats are isolated by account. Streaming, a per-user rate limit, request history and a "Try it" console are built in. Next.js on Vercel, Postgres on Neon.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon project → Connection string |
| `AUTH_SECRET` | Generate with `npx auth secret` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Callback URL: `http://localhost:3000/api/auth/callback/github` (or your deployed domain) |
| `MEGABRAIN_ENCRYPTION_KEY` | Any long random string — used to encrypt stored API keys |

The database schema (`users`, `api_keys`, `cache_entries`, `usage_stats`, `request_log`) is created automatically the first time `ensureSchema()` runs — call it once from a setup script or the first deploy.

## Deploy (Vercel + Neon)

1. Create a Neon project, copy its connection string into `DATABASE_URL`.
2. Create a GitHub OAuth App for your production domain, add its callback URL.
3. Import this repo into Vercel, set the root directory to `web/`, and add all four environment variables above.
4. Deploy. Then create the tables once:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/admin/init-schema \
     -H "x-init-secret: <your MEGABRAIN_ENCRYPTION_KEY value>"
   ```

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat/completions` | OpenAI-compatible proxy (streaming supported); uses the signed-in user's OpenAI key, or falls back to their Gemini key via Google's OpenAI-compatible endpoint |
| POST | `/api/v1/messages` | Anthropic-compatible proxy (streaming supported), uses the signed-in user's stored key |
| GET | `/api/stats` | Signed-in user's savings stats |
| GET | `/api/stats/timeseries` | Daily requests/cache-hits/tokens-saved for the last 14 days, powers the dashboard chart |
| GET | `/api/requests` | Signed-in user's most recent 50 requests (endpoint, provider, model, tier, hit/miss) |
| POST | `/api/settings/key` | Save an encrypted API key for the signed-in user |
| GET | `/api/settings/key` | List the signed-in user's stored providers |
| DELETE | `/api/settings/key` | Remove a stored key for a given provider |
