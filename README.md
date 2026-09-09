# MERN Template

Express 5 + Mongoose + React 19 (Vite) + TypeScript, one npm workspace.
Clean architecture on both sides, CI-enforced layer rules.

## Quickstart

Requires Node >= 22.9 (scripts use `--env-file`).

```bash
cp .env.example .env     # required — the server fail-fasts without it
docker compose up -d     # Mongo (bound to 127.0.0.1)
npm install
npm run dev              # API :3000 (routes under /api/v1, OpenAPI docs at /docs), client :5173
npm run seed             # optional — demo data (3 users)
```

## Verify

```bash
npm run check            # constitution + lint + typecheck + tests — Definition of Done
```

## Layout

```
server/       Express API — clean architecture (domain / usecase / interface / infra)
client/       React + Vite — pages, components, hooks, services, i18n
.rules/       all project rules — architecture, backend, frontend
.sdd/         specs, ADRs
```

Every folder carries a `README.md` saying what belongs in it.

Rules — for contributors and coding agents alike — live in one folder: **[.rules/](.rules/README.md)**.
`CLAUDE.md` and `AGENTS.md` are pointers to it, nothing more.

## License

[MIT](LICENSE)
