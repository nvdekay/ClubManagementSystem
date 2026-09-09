# Constitution

Version 1.3.0 · Status: ACTIVE (amendable — see §Amendment)

**Principle: a rule without a machine check is a suggestion.** Every rule below names
its check. Machine checks live in `scripts/check-constitution.sh` and `.github/workflows/ci.yml`;
`review` means a human gate in PR review — listed explicitly so reviewers know what CI does NOT cover.

---

## Layer 1 — Security & data

### SEC-01 · Passwords
Hash with bcrypt (cost ≥ 12) or argon2id. Plaintext never stored, logged, or echoed.
**Check:** dormant until the auth feature exists. The auth PR MUST add a test asserting the
stored value verifies against the input and does not equal it, plus the SEC-02 route-walk test.

### SEC-02 · Authentication on mutating endpoints
Every POST/PUT/PATCH/DELETE route requires auth middleware, except routes listed in an
explicit `PUBLIC_ROUTES` allowlist (auth flows only: login, register, refresh).
**Rule and check are DORMANT until the auth feature ships** — the template's demo routes
are public by design until then. The auth PR activates the rule and MUST add a test that
walks the Express router and asserts every mutating route has auth middleware or is in
`PUBLIC_ROUTES`.

### SEC-03 · Input validation (NoSQL injection)
All client input passes a zod schema or a domain factory before use. Never pass raw
`req.body` / `req.query` / `req.params` objects into a Mongoose query — operator injection
(`{"$gt": ""}`) is the MERN attack, not SQL concatenation.
**Check:** grep forbids `req.*` anywhere in a Mongoose query call's arguments, and mongoose is
importable only in `server/src/infra/` (+ `main.ts` for connect) — so routes and usecases can't
reach a model at all, aliased or not. Rest is review.

### SEC-04 · Secrets
`.env` is never committed; `.env.example` stays current. In application source (`server/src`),
`process.env` is read only in `server/src/infra/config/`; test files may read env for wiring
(e.g. `MONGO_URI` skip guards). Agents never print, log, or commit secret values.
**Check:** grep (`.gitignore` must ignore `.env`; `process.env` and `process[...]` bypasses
confined) + gitleaks in CI. Agent clause: review.

### DATA-01 · Deletes
Hard delete is the default. Soft delete only for entities whose feature needs restore/history,
and then via `mongoose-delete` plugin (automatic query scoping) — never a hand-rolled
`deletedAt` filter that every query must remember.
**Check:** review.

### LOG-01 · Observability
Every request is logged as one JSON line with duration (`requestLogger` middleware).
Stack traces and internal error details go to server logs only; clients get the ARCH-02 error
envelope with a generic message on 500 and on framework 4xx (which are logged server-side —
`err.message` can echo raw request bytes).
**Check:** grep asserts `requestLogger` and `errorHandler` are mounted in `server.ts`; rest is review.

---

## Layer 2 — Architecture

### ARCH-01 · Layer boundaries
`interface → usecase → domain ← infra`. Domain imports nothing from other layers and owns
the repository ports. Usecases receive repositories as arguments — no DI container.
`interface/` and `infra/` never import each other; mongoose lives only in `infra/`,
express only in `interface/`; domain never logs.
**Check:** grep (static, barrel, and dynamic imports; both directions; framework confinement;
`console.*` in domain) in `check-constitution.sh`.

### ARCH-02 · Response contract & error handling
Every response goes through one of two envelopes, built by `interface/http/response.ts` —
handlers never call `res.json()` directly:
- Success (`ok()`): `{ statusCode, message, data, timestamp }`.
- Error (`fail()`): `{ statusCode, error, message, details?, timestamp, path }`.

Business failures throw `DomainError(message, kind, details?)`; middleware maps the kind to a
status: `validation` → 400 (default), `conflict` → 409, `not_found` → 404, `error` set to the
kind, `message` to the domain message, `details` to whatever the domain attached (e.g. zod
issues). Framework 4xx (body parser etc.) keep their status but clients get the generic reason
phrase, never `err.message`. Everything else → 500 with a generic message. No stack traces to
clients (see LOG-01).
**Check:** the mapping lives in one place (`interface/http/middleware.ts`) with unit tests;
review confirms new code throws `DomainError` instead of ad-hoc status codes and uses
`ok()`/`fail()` instead of `res.json()`.

### ARCH-03 · API contract
Any endpoint change updates the API contract (`server/src/interface/http/openapi.ts`, served
at `/docs`) **in the same PR**, reviewed like code.
**Check:** a unit test walks the mounted Express routes and fails when spec and app disagree;
the User wire schema is type-linked (`satisfies`) to the domain entity, so field drift fails
`tsc`. Response details beyond that: review (PR checklist item).

---

## Layer 3 — Engineering standards

### STD-01 · TypeScript
Strict mode pinned in both workspaces. No `any` (use `unknown` + narrowing).
Named functions are declarations (`function foo()`), never arrow consts — declarations hoist
(main logic reads top-down) and Mongoose hooks/methods require `function` for `this`.
Inline callbacks stay arrows.
**Check:** grep pins `"strict": true` in both tsconfigs; grep forbids `: any` / `as any`;
`tsc --noEmit` runs in CI for both workspaces; ESLint `func-style` enforces declarations.

### STD-02 · Testing
- `tests/unit/` — domain + usecase, no DB, no network, in-memory repos.
- `tests/integration/` — infra against real Mongo (docker compose / CI service).
- One e2e happy-path script once the demo UI stabilizes.
- No coverage percentage. A coverage bar makes teams write coverage-chasing tests;
  the gate is: every acceptance criterion in a SPEC has a test.

**Check:** CI runs unit tests in a job with NO Mongo service and no `MONGO_URI` — a "unit"
test that touches the DB fails there by construction. Integration runs in a separate job.
Definition of Done = `npm run check` green.

### STD-03 · Git
Branches: `spec/{name}` (spec discussion), `agent/{name}` (agent implementation), `fix/{issue}`.
Conventional Commits (`feat|fix|docs|spec|chore`). PRs: minimum 1 reviewer, no self-approval,
CI green before merge.
**Check:** GitHub branch protection on `main` (required checks + 1 approval — configure once
in repo settings; self-approval is impossible natively). Branch names: review.

---

## Process

### Review gates
| Gate | What | Who |
|------|------|-----|
| L1 | Tests + typecheck pass | CI |
| L2 | Code matches its SPEC acceptance criteria | reviewer |
| L3 | Constitution: SEC/ARCH/STD machine rules | CI (`check-constitution.sh`) |
| L4 | Review-only rules (SEC-03 rest, DATA-01, ARCH-02/03) + short demo | reviewer |

CI does not check L2 and L4 — claiming otherwise trains reviewers to skip them.

### Deployment
Local: `docker compose up -d` + `npm run dev`. No CD ships with the template — the demo
instance is deployed manually (add a workflow when the team picks a host).
Freeze `main` before a release or demo day; emergencies go through `git revert`, not hotfixes.

### Demo readiness
- `npm run seed` rebuilds a demo database in one command, on any machine. Keep it working.
- **No agent-written PR merges unless the merging human can explain every line.**

### Amendment
This file changes by PR with majority team approval, and **every new rule ships its machine
check in the same PR** (or is explicitly labeled `review`). The team lead arbitrates
day-to-day disputes.

---

## AI Agent Policy

**Allowed without asking:** read/write `server/src`, `client/src`, `tests`, `docs`, `.sdd/specs`;
run npm scripts, vitest, tsc; commit on `agent/*` branches.

**Human confirmation required:** deleting files; editing this file; pushing to `main`;
adding dependencies (`package.json`); schema changes (`server/src/infra/db/**`); anything touching `.env*`.

**Must:** never print or commit secret values; report edge cases not covered by the SPEC
instead of guessing; update the feature's `TASKS.md` as tasks complete.
