# Diagrams — v2

PlantUML sources for the **revised** use case model in
[`../../UCMS_UseCase_Model_v2.md`](../../UCMS_UseCase_Model_v2.md) (54 use cases, sections 4,
6, 8 and 9).

The v1 sources in [`../`](../) are kept as history and still render the 57-use-case model of
`UCMS_Business_System_Analysis*.md`. Where the two disagree, v2 wins.

| File | Scope | Use cases |
|---|---|---|
| `D0_SystemContext.puml` | actors, the 12 modules, the 2 external systems | — |
| `D1_IdentityAccessConfig.puml` | authentication, dashboard, accounts, configuration | UC01–UC05 |
| `D2_ClubLifecycle.puml` | discovery, establishment, governance, term | UC06–UC15 |
| `D3_RecruitmentMembership.puml` | recruitment, membership, member workspace | UC16–UC24 |
| `D4a_EventApproval.puml` | event proposal → decision → publish → cancel | UC25–UC28 |
| `D4b_ParticipationPostEvent.puml` | registration, attendance, event report | UC29–UC34 |
| `D5_Finance.puml` | budget, disbursement, expense, reconciliation | UC35–UC39 |
| `D6_ReportingEvaluation.puml` | periodic reporting, compliance, evaluation | UC40–UC45 |
| `D7_PropertyBooking.puml` | catalogue, booking request, decision, release | UC46–UC49 |
| `D8_FeedbackComplaint.puml` | event feedback, complaint intake, triage, response | UC50–UC54 |

Every use case UC01–UC54 is owned by exactly one diagram and carries an actor association
there. A use case shown on another diagram is repeated with a `(see Dx)` suffix so the
relationship stays visible without duplicating ownership.

Every file is self-contained: it declares its own skinparams and renders on its own, with no
shared include.

## Conventions

- **One diagram per use case group** (v2 section 4). A single diagram holding all 54 use cases
  is unreadable and does not fit a page.
- **`[Phase 2]` in the use case label** marks the 17 use cases deferred by v2 section 12.
  Everything unmarked is Phase 1.
- **Only three relationship types are drawn:** actor associations, `<<include>>` and
  `<<extend>>`. The arrows in v2 section 8 are business flows, not use case relationships — a
  use case diagram never shows sequence. Ordering lives in the preconditions of the
  specifications (v2 section 6).
- **No `<<include>>` remains in the model.** v1's only one pointed at UC25 "Detect event
  conflicts", which v2 turned into business rule BR15. The five `<<extend>>` relationships are
  UC47→UC25, UC49→UC28, UC19→UC18, UC30→UC29 and UC53→UC42 — each an optional extension, never
  a step in a sequence.
- **`User` generalization** exists only so UC01 and UC02 have one association instead of three.
- **Every use case has exactly one primary actor.** Where v1 wrote `Student/CMB` or
  `ICPDP/CMB`, v2 either splits the use case or demotes the second actor to supporting — UC31
  is the only supporting association drawn, as a dashed `supporting` link.
- **Nothing system-triggered appears as a use case.** The scheduler transitions and the audit
  log are listed in v2 section 7 and specified in sections 19 and 20 of the analysis.
- **M10** owns no use case and is therefore not expanded into a detail diagram.

## Rendering

```bash
# single diagram
plantuml -tsvg D2_ClubLifecycle.puml

# all of them (PNG for documents, SVG for the web)
plantuml -tpng *.puml
```

Each diagram's internal name is prefixed `v2_`, so rendering v1 and v2 into the same output
folder cannot overwrite one another. Generated images are not committed — render on demand.
