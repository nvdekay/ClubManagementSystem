# ADR-001: 4-layer clean architecture in server/src

Date: 2026-08-08 · Status: accepted

## Decision
Split `server/src` into `domain/`, `usecase/`, `interface/`, `infra/`. Dependency arrows
point at domain. Repository interfaces (ports) live in domain; Mongo implementations in infra.

## Why
- 5-person team + AI agents working in parallel need hard boundaries greps can enforce.
- Domain/usecase test without mocks (in-memory repo) → fast unit loop.
- Swapping Mongo, adding gRPC, etc. touch one layer each.

## Trade-offs
- More files than a flat `routes/ + models/` Express app. Accepted: the boundary checks
  are what keep parallel work from tangling.
- No DI container — dependencies passed as function arguments. Revisit only if wiring
  in main.ts outgrows a screen.
