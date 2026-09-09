# Architecture

Express 5 + Mongoose + React 19 (Vite) + TypeScript, npm workspaces (`server/`, `client/`).

The server follows **clean architecture** with 4 layers. All arrows point at `domain`:

```
interface → usecase → domain ← infra
```

A request flows like this:

```
HTTP request
  → interface/http   (route parses/validates input, calls a usecase)
    → usecase        (business flow, talks to a repository *interface*)
      → domain       (entities, validation rules, repository ports)
    ← infra          (Mongo repository *implements* the domain port; wired in main.ts)
  ← interface/http   (maps result or DomainError to an HTTP response)
```

---

## `server/src/domain/`

**What?** The core of the app: entities (`User`), business validation (`newUser` factory), business errors (`DomainError`), and **ports** — interfaces like `UserRepository` that describe what the app needs from the outside world without saying how it's done. It imports nothing from the other layers: no Express, no Mongoose, no `process.env`, no logging.

**Why?** Business rules are the part of the app that must not silently change when you swap a framework or database. Keeping them dependency-free means they can be read, tested, and trusted in isolation. The port lives here (not in infra) so the domain owns the contract and infra has to conform to it — that is what makes the arrows point inward.

**When?** Add code here when a rule is true regardless of HTTP or Mongo: "an email must look like X", "a name is 1–100 chars", "this operation needs a way to find a user by email". If a rule mentions a status code, a collection name, or an env var, it belongs in another layer.

## `server/src/usecase/`

**What?** Business flows — one function per operation (`registerUser`, `listUsers`). Each takes its dependencies (repositories) as arguments and orchestrates domain objects: build the entity, check business conditions, persist, return.

**Why?** Routes should not contain business logic (untestable without HTTP) and the domain should not contain flows (it would need to know about persistence). Usecases are the seam in between: because repos are passed in as interfaces, a unit test can hand in an in-memory fake and run the whole flow with no DB and no network.

**When?** Add a usecase for every new operation the app performs ("register a user", "deactivate an account"). If the logic is a pure data rule with no orchestration, push it down into domain; if it's just translating HTTP, keep it up in interface.

## `server/src/interface/http/`

**What?** The Express edge: `server.ts` (app assembly), `user-routes.ts` (endpoints under `/api/v1`), `middleware.ts` (request logging + error handling), `openapi.ts` (API docs served at `/docs`). It translates HTTP ↔ usecase calls and nothing more.

**Why?** HTTP is a delivery detail. By keeping this layer thin, the choice of Express (or its version, or REST itself) stays replaceable, and the error-handling middleware gives one consistent contract: `DomainError` → 400/409/404 by kind, anything unexpected → 500 — no per-route error juggling. Validating input here (zod / domain factory) before it reaches a Mongoose query is also the NoSQL-injection boundary.

**When?** Touch this layer when the *outside contract* changes: a new endpoint, a new status code, request/response shape, headers, logging. The route body should stay ~5 lines: parse input, call usecase, send response. If it grows past that, business logic is leaking in — move it to a usecase.

## `server/src/infra/`

**What?** Implementations of the outside world:

- `config/` — the **only** place allowed to read `process.env`. A zod schema validates env at boot; invalid env → `process.exit(1)`. Everything else receives a typed `Config`.
- `db/` — `mongo-user-repository.ts` implements the domain's `UserRepository` port with Mongoose; `seed.ts` for local data.

**Why?** Config: fail-fast at boot beats a `undefined` connection string exploding at 3am, and a single choke-point for env (CI-enforced) means the rest of the code is deterministic and testable. Repositories: because Mongo hides behind a domain interface, the DB is swappable and — more importantly day-to-day — fakeable in tests.

**When?** Add code here when integrating anything external: a new collection, a mail sender, an HTTP client to another service, a new env var. Pattern: declare the port in `domain/`, implement it here, wire it in `main.ts`.

## `server/src/main.ts`

**What?** The composition root: load config → connect Mongo → build concrete repositories → inject them into the app → listen.

**Why?** Somebody has to pick real implementations for the ports. Doing it in exactly one file means every other file stays wired by interfaces, and the boot order (config first, fail fast) is explicit.

**When?** Only when adding a new dependency to wire (new repo, new external client) or changing boot order. It should stay ~15 lines.

## `server/tests/`

**What?** `unit/` — usecases and domain tested with in-memory repos; no DB, no network (CI runs them in a job with no Mongo). `integration/` — real Mongo repository tests, skipped when `MONGO_URI` is not set.

**Why?** The layer split exists precisely so most logic is testable without infrastructure — unit tests stay fast and run anywhere. Integration tests cover the one thing fakes can't: that the Mongo implementation actually honors the port's contract.

**When?** New usecase or domain rule → unit test. New or changed repository implementation → integration test. If a unit test needs a DB, the code under test is in the wrong layer.

## `client/`

**What?** React 19 + Vite SPA. In dev it runs on `:5173` and proxies `/api` to the server on `:3000`.

**Why?** A separate workspace keeps frontend and backend dependencies, builds, and type-checking independent while sharing one repo. The dev proxy avoids CORS setup in development.

**When?** All UI work. It talks to the server only through `/api/v1/*` — it never imports server code.

## `.rules/`

**What?** Every rule in the project, in one folder: `backend.md` (the constitution — some rules CI-checked by `scripts/check-constitution.sh`, some review gates), `frontend.md` (React stack + component/fetch/styling/theme/locale rules), `architecture.md` (this file).

**Why?** Rules that live only in heads or chat history don't survive contributors — or AI agents. One folder means an agent (or a new hire) reads one place instead of hunting four; everything else in the repo only points here.

**When?** Before writing code in a layer you haven't touched. `npm run check` runs the mechanical subset on every verify.

## `.sdd/`

**What?** Process artifacts: `specs/feat-*/` (SPEC + TASKS written before coding; `feat-users/` is the worked example), `rfcs/ADR-*.md` (architecture decisions, write-once).

**Why?** Specs force "what are we building" before "how"; ADRs preserve *why* a decision was made after everyone forgot.

**When?** New feature → copy `specs/_template.md` first. Architecture decision → new ADR (never edit an old one).

## Supporting files

| Item | What / Why / When |
|---|---|
| `docker-compose.yml` | Local MongoDB. So "clone → run" needs no installed Mongo. `docker compose up -d` before dev. |
| `.env.example` / `.env` | Documented env contract / your local values. Server fail-fasts without `.env`; `.env` stays git-ignored. Copy once per clone, edit when config changes. |
| `scripts/` | `check-constitution.sh` — greps for layer/env violations. Runs in `npm run check` and CI. |

---

## Rules of thumb

- Dependencies only point inward: `domain` imports nothing; `usecase` imports only `domain`; `interface` and `infra` never import each other.
- `process.env` only in `infra/config/`. `DomainError` for business failures (kind → 400/409/404), everything else → 500.
- Never pass raw `req.body`/`req.query` into a Mongoose query — validate first.
- Deciding where code goes? Ask: "would this line survive swapping Express for Fastify and Mongo for Postgres?" Yes → `domain`/`usecase`. No → `interface`/`infra`.
