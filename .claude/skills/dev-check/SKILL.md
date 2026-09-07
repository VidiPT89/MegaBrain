---
name: dev-check
description: Build, test and sanity-check the MegaBrain CLI/proxy before calling a change done. Use after any edit to src/ in this repo.
---

# MegaBrain dev check

Run in order, from the repo root:

```bash
npm run build
npm test
```

Both must pass before reporting a task as finished. If a change touches `src/router/` or `src/proxy/`, also do a quick manual smoke check:

```bash
node dist/cli.js proxy 8799 &
sleep 1
kill %1
```

Confirm the startup log lists the expected tier → provider mapping (local → ollama, mid/premium → whatever `.env` configures).

Never report "done" for this repo without build + tests passing — see `conhecimento/preferencias/tarefa-so-esta-feita-apos-deploy.md` in SecondBrain for what "done" actually means here (commit + push, and for the CLI, `npm publish` when the goal is real distribution).
