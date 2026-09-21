# UCMS — High-Level Design

Status: draft · Date: 2026-09-21 · Scope: the 12 modules of
[`UCMS_Business_System_Analysis_EN.md`](UCMS_Business_System_Analysis_EN.md) built on this repo.

This document says **how the system is shaped**. It does not repeat the layer rules —
those live in [`.rules/architecture.md`](../.rules/architecture.md) (server layers),
[`.rules/frontend.md`](../.rules/frontend.md) (client) and
[`ADR-001`](../.sdd/rfcs/ADR-001-clean-architecture-layers.md) /
[`ADR-002`](../.sdd/rfcs/ADR-002-client-architecture.md). Everything here either maps the
business modules onto those rules, or names a decision the rules do not yet cover.

---

## 1. Context

```text
        Student ─┐
   Club Board (CMB) ─┼──HTTPS──► UCMS SPA ──/api/v1──► UCMS API ──► MongoDB
      ICPDP Officer ─┘                                    │
                                                          ├──► Google OAuth   (sign-in)
                                                          └──► Google SMTP    (email notifications)
```

Three human actors, one system, two external dependencies. No other integration is in
scope (section 5.2 of the analysis).

## 2. Containers

| Container | Tech | Responsibility |
|---|---|---|
| `client/` | React 19 + Vite SPA, static build | All UI. Talks only to `/api/v1/*`. |
| `server/` | Express 5 + Mongoose, single Node process | API, business rules, OAuth callback, scheduler. |
| MongoDB | replica-set-capable single instance | All persistent state, including the notification outbox and audit log. |

**Decision D1 — one deployable, not services.** 57 use cases, one team, one database,
one transaction boundary. Modules are folders, not processes. The 4-layer split already
gives the seams a split into services would give, without the operational cost. Revisit
only if a module needs independent scaling (none does: load is a few hundred students).

**Decision D2 — the scheduler runs in the API process.** Deadline reminders, escalation
and the email outbox drain are timer jobs, not a queue system. They ship as an in-process
interval guarded by a Mongo lease document so a second instance cannot double-send.
Extract to a worker container when the API is scaled past one instance.

## 3. Module → code map

A module is a **vertical slice across the existing four layers** — never a new top-level
folder. M05 Event & Activity, for example:

```text
server/src/domain/event/            entities (Event, EventProposalVersion), state machine,
                                    business errors, ports (EventRepository, ApprovalPort)
server/src/usecase/event/           submitProposal, approveEvent, publishEvent, …  one file per flow
server/src/interface/http/event-routes.ts   /api/v1/events*  — parse, call usecase, respond
server/src/infra/db/mongo-event-repository.ts
client/src/services/events.ts       typed fetch per endpoint
client/src/hooks/useEvents.ts       React Query keys
client/src/pages/events/            screens
```

Module ownership of data (analysis §6) is the rule for **who may write**: a usecase writes
only its own module's aggregates and reads others through their repository ports. Cross-module
writes go through the owning module's usecase, not its repository.

| Module | Aggregates it owns | MVP |
|---|---|---|
| M01 Identity & RBAC | User, StudentProfile, Role, Permission | ✅ |
| M02 Club Lifecycle | Club, ClubApplication(+Version) | ✅ |
| M03 Leadership & Term | ClubTerm, ClubPosition(+Assignment) | partial (UC09–10) |
| M04 Recruitment & Membership | RecruitmentCampaign, RecruitmentApplication, ClubMembership | ✅ |
| M05 Event & Activity | Event, EventProposalVersion, PostEventReport | ✅ |
| M06 Registration & Attendance | EventRegistration, Attendance | ✅ |
| M07 Finance & Budget | BudgetRequest(+Version), Expense, FinancialEvidence, Reconciliation | ✅ |
| M08 Reporting & Compliance | PeriodicReport, Violation, CorrectiveAction | partial |
| M09 Performance Evaluation | Evaluation, EvaluationScheme/Dimension | ❌ v2 |
| M10 Workflow / Notification / Audit | ApprovalTask, ApprovalDecision, Notification, EmailDeliveryLog, AuditLog | ✅ (cross-cutting) |
| M11 Property & Booking | Property, PropertyBooking | ✅ |
| M12 Feedback & Complaint | EventFeedback, Complaint | ✅ |

## 4. Cross-cutting design (M10)

These three are what make the 12 modules one system; each is a **domain port with one infra
implementation**, injected in `main.ts` like any repository.

### 4.1 Approval workflow

Six business objects go through submit → review → revise → decide (club application, event
proposal, budget request, property booking, complaint, suspension). They share **one**
`ApprovalTask` aggregate: `{ entityType, entityId, state, assignee, decisions[] }`.

The module keeps its own entity state (`Event.status`), the approval task keeps the
*review* state. A usecase calls `approval.open(entityType, entityId, …)`; the decision
callback flips the entity via the owning usecase. One reviewer inbox for ICPDP falls out
of this for free — that is the reason for the shared aggregate.

**Revisions are append-only versions** (`ClubApplicationVersion`, `EventProposalVersion`,
`BudgetRequestVersion`): a resubmission writes a new version document, never mutates the
previous one. Audit and "what did ICPDP actually approve" both depend on that.

### 4.2 Notification — outbox, never inline

```text
usecase commits business change
  → notification.enqueue(event, recipients, channels)   # same request, Mongo write
  → scheduler drains outbox → in-app rows / Google SMTP → EmailDeliveryLog(+retry)
```

Required by analysis §19: *a failed email must never break a committed business
transaction*. Sending inline would do exactly that. Retry count and backoff live on the
outbox document.

Deadline escalation (`T−X reminder / T due / T+Y overdue / T+Z escalate`) is the same
scheduler scanning due-date indexes; X/Y/Z are config documents, not constants.

### 4.3 Audit

Every state-changing usecase writes `{ entityType, entityId, actor, action, before, after,
at }` through an `AuditPort`. It is called **in the usecase**, not in a route middleware and
not in the repository: the route does not know the business action name, and the repository
does not know the actor.

## 5. Identity, authentication, authorization

- **AuthN:** Google OAuth Authorization Code flow. `interface/http/auth-routes.ts` owns
  redirect + callback; the callback resolves/creates the `User` and sets a signed,
  httpOnly, SameSite=Lax session cookie. No password is ever stored (analysis §5.2).
- **AuthZ — two checks, two layers:**
  1. *Permission* (can this role do this action at all) — middleware at the route, from
     the `Role → Permission` table.
  2. *Scope* (is this actor in **this** club, with **this** position, in the **current**
     term) — inside the usecase, because it is a business rule and must be unit-testable
     without HTTP. This is the check that actually protects the data; the middleware only
     rejects early.
- Role assignments are term-scoped: permission is derived from
  `ClubPositionAssignment` ∩ active `ClubTerm`, never from a flag on the user. Leadership
  transition then becomes a data change, not a migration.

## 6. Data design (MongoDB)

- One collection per aggregate; references by `ObjectId`, no cross-collection joins in hot
  paths.
- **Denormalize for lists only** — `{ clubId, clubName }` on event/booking rows so a
  dashboard list is one query. The owning module's usecase updates the copies on rename.
- Compound indexes are part of the repository, created at boot (`ensureUserIndexes` is the
  existing pattern). Minimum: `(clubId, status)`, `(eventId, studentId)` unique on
  registration, `(entityType, entityId)` on audit and approval, `(dueAt, state)` on the
  outbox.
- No multi-document transactions in MVP. The two places that need atomicity —
  registration capacity and booking conflict — use a unique index plus a guarded
  `findOneAndUpdate`, which is stronger than a read-check-write in a transaction anyway.

## 7. API surface

Unchanged from the template contract: REST under `/api/v1`, `{ data }` envelope,
`DomainError` kind → 400/409/404, anything else → 500, zod validation at the edge before
any Mongoose query. One route file per module, registered in `server.ts`. OpenAPI stays
generated from the zod schemas and served at `/docs`.

Resource naming follows the aggregate: `/clubs`, `/clubs/:id/members`, `/events`,
`/events/:id/registrations`, `/budget-requests`, `/property-bookings`, `/complaints`,
`/approvals` (the shared reviewer inbox), `/notifications`.

## 8. Client

ADR-002's router trigger **has fired** — UCMS has three role workspaces and dozens of
screens, so `react-router` is added now, with the rest of ADR-002 unchanged (services →
hooks → components, React Query for server state, Tailwind tokens, i18next per-module
string files).

```text
client/src/pages/
  auth/          login + OAuth callback
  student/       my clubs, recruitment, events, my registrations, feedback, complaints
  club/          club admin workspace: members, events, budget, bookings, reports
  icpdp/         approval inbox, clubs, violations, evaluation, dashboards
```

Route guarding mirrors the server: a role-aware layout shell decides *what is shown*; the
server decides *what is allowed*. The client never holds the authoritative permission check.

## 9. Deployment

`docker compose`: `mongo` + `server` (Node, serves nothing but the API) + a static host for
the built client (Nginx or the same Express behind a `/` static mount). Env is validated at
boot by `infra/config/` — the only place reading `process.env`; new secrets
(`GOOGLE_CLIENT_ID/SECRET`, `SESSION_SECRET`, `SMTP_*`) are added to that schema and
`.env.example` together.

## 10. Quality attributes

| Attribute | Target | How this design gets it |
|---|---|---|
| Testability | usecases unit-tested with no DB | ports + in-memory fakes (existing rule) |
| Auditability | every state change attributable | §4.3 + append-only versions |
| Reliability of email | business tx never fails on SMTP | outbox §4.2 |
| Data integrity | no double registration / double booking | unique index + guarded update §6 |
| Security | no home-grown auth, no NoSQL injection | Google OAuth, zod at the edge, scope check in usecase |
| Change cost | new module = 4 files + 2 client files | vertical slice §3 |

## 11. Deliberately not designed yet

- Performance evaluation engine (M09) — configurable scheme is v2; MVP stores manual
  evaluation results only.
- File storage for financial evidence — MVP stores an external link; add object storage
  when uploads are actually required.
- Read models / reporting database for dashboards — plain aggregation pipelines until one
  is measurably slow.
- Multi-instance deploy, message queue, caching layer — none has a trigger yet (§D1, D2).

---

Each decision D1–D2 and §4–§6 becomes an `ADR-NNN` in `.sdd/rfcs/` when the team accepts it;
this document is the proposal, not the record.
