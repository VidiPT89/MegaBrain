# MegaBrain

CLI que poupa tokens de IA em vez de só rotear entre modelos. Três peças, cada uma opcional e composável:

- **Cache semântico** (`src/cache`): antes de chamar qualquer modelo, verifica se uma pergunta semelhante já foi respondida (similaridade de vetores term-frequency, sem depender de nenhuma API externa).
- **Roteamento por tier** (`src/router`): classifica a complexidade do prompt (`local` / `mid` / `premium`) por heurística, para o chamador decidir que modelo usar em cada caso, em vez de mandar tudo para o modelo mais caro.
- **Skills lazy-loaded** (`src/skills`): ficheiros markdown com `triggers` no frontmatter; só o corpo da skill selecionada é carregado, nunca todas de uma vez.
- **Stats** (`src/stats`): regista cache hits, distribuição por tier e tokens poupados estimados.

O MegaBrain não chama nenhum LLM diretamente — é a camada de decisão que fica *antes* da chamada. Integra-se com qualquer app que já fale com um modelo (Claude, GPT, etc.), decidindo se vale a pena chamar, e qual tier usar.

## Uso

```bash
npm install
npm run build

megabrain ask "traduz este texto para inglês: bom dia"
megabrain remember "qual a capital de Portugal" "Lisboa"
megabrain stats
megabrain cache clear
```

## Estado

MVP em desenvolvimento. Próximos passos:
- Trocar o cache de term-frequency por embeddings reais (opcional, mantendo a mesma interface).
- Compressão/sumarização automática de histórico de conversa.
- Integração de exemplo com uma chamada real a um LLM (Claude/OpenAI) para validar a poupança end-to-end.
