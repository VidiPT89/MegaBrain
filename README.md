# MegaBrain

CLI que poupa tokens de IA em vez de só rotear entre modelos. Três peças, cada uma opcional e composável:

- **Cache semântico** (`src/cache`): antes de chamar qualquer modelo, verifica se uma pergunta semelhante já foi respondida (similaridade de vetores term-frequency, sem depender de nenhuma API externa).
- **Roteamento por tier** (`src/router`): classifica a complexidade do prompt (`local` / `mid` / `premium`) por heurística, para o chamador decidir que modelo usar em cada caso, em vez de mandar tudo para o modelo mais caro.
- **Skills lazy-loaded** (`src/skills`): ficheiros markdown com `triggers` no frontmatter; só o corpo da skill selecionada é carregado, nunca todas de uma vez.
- **Stats** (`src/stats`): regista cache hits, distribuição por tier e tokens poupados estimados.

- **Proxy drop-in** (`src/proxy`): servidor HTTP compatível com os formatos `POST /v1/chat/completions` (OpenAI) e `POST /v1/messages` (Anthropic). Basta trocar o `base_url` do teu SDK/app para `http://localhost:8787` — sem mudar nenhum código — e o MegaBrain intercepta cada pedido: se já respondeu a algo semelhante, devolve do cache sem gastar um único token; caso contrário reencaminha para o provider real e guarda a resposta para a próxima vez.

## Uso — CLI standalone

```bash
npm install
npm run build

megabrain ask "traduz este texto para inglês: bom dia"
megabrain remember "qual a capital de Portugal" "Lisboa"
megabrain stats
megabrain cache clear
```

## Uso — Proxy (fricção zero, recomendado)

```bash
export OPENAI_API_KEY=sk-...       # ou ANTHROPIC_API_KEY, conforme o provider
megabrain proxy 8787
```

Depois, na tua app, troca só o `base_url`:

```bash
# antes: https://api.openai.com
# depois:
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"olá"}]}'
```

Também suporta `POST /v1/messages` no formato Anthropic (`x-api-key` + `anthropic-version` nos headers, tal como a API oficial). Podes definir `MEGABRAIN_OPENAI_BASE_URL` / `MEGABRAIN_ANTHROPIC_BASE_URL` num `.env` para apontar a outro provider compatível.

Cada resposta inclui um campo `megabrain: { cache_hit, tier }` para saberes exatamente o que aconteceu, e `megabrain stats` acumula o histórico de poupança.

## Estado

MVP em desenvolvimento. Próximos passos:
- Trocar o cache de term-frequency por embeddings reais (opcional, mantendo a mesma interface).
- Compressão/sumarização automática de histórico de conversa.
- Suporte a streaming (`stream: true`) no proxy — hoje só funciona em modo não-streaming.
- Dashboard local com contador de tokens/€ poupados em tempo real.
