# Rules — start here

Single source of truth for this project. Every agent config file in this repo
(`CLAUDE.md`, `AGENTS.md`, …) is a pointer to this folder and holds no rules of its own —
if you were sent here, read this page, then the file for the layer you're touching.

Express 5 + Mongoose + React 19 (Vite) + TypeScript, npm workspaces (`server/`, `client/`).
Setup and commands: root [`README.md`](../README.md). Definition of Done: `npm run check` green.

## Read before writing code

| Read this | Before |
|---|---|
| [architecture.md](architecture.md) | deciding *where* code goes — the 4 layers, what/why/when per folder |
| [backend.md](backend.md) | any `server/` work — security, layer boundaries, response contract, TypeScript/testing/git standards, review gates, AI agent policy |
| [frontend.md](frontend.md) | any `client/` work — React stack, folder structure, component/fetch/styling rules, theme & locale safety, pre-implementation checklist |

Plus the target folder's own `README.md` — see below.

## Rules that apply everywhere

1. **Read the target folder's `README.md` before writing a file into it.** It states what
   belongs there; every folder under `client/src/`, `server/src/`, and `server/tests/` has
   one. If what you're writing doesn't match the description, the code is in the wrong
   folder — relocate it (`architecture.md` for the server, the decision tree in
   `frontend.md` for the client) instead of widening the README to fit. A new folder ships
   its `README.md` in the same PR.
2. **Ambiguity goes to the user, never to a guess.** Requirements, scope, which rule
   applies — ask directly.
3. **New feature:** copy `.sdd/specs/_template.md` into `.sdd/specs/feat-{name}/SPEC.md` +
   `TASKS.md` before coding (`feat-users/` is the worked example). Update `TASKS.md` as
   tasks complete.
4. **Architecture decisions** go in `.sdd/rfcs/ADR-NNN-*.md` — write-once, never edit history.
5. **English only** in code, comments, docs, commits, configs, errors, and tests.

What an agent may do without asking, and what needs a human first, is in
[backend.md §AI Agent Policy](backend.md#ai-agent-policy).

## Amending

`backend.md` changes by PR with team approval, and every new mechanical rule ships its check
in `scripts/check-constitution.sh` in the same PR — a rule without a machine check is a
suggestion (see backend.md §Amendment). Rules that can only be reviewed by a human say so.
