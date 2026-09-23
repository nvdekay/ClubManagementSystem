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

`UCMS_UseCase_ByActor.drawio` is the same model cut **by actor** instead of by module: an
"All users" page for UC01/UC02, then one page for Student, four for Club Management Board and
three for ICPDP Officer (at most 9 use cases per page, so no line crosses another). A related
use case shown on another page sits in the right-hand column, drawn like any other, labelled with
its owner or `see <page>`. Related use cases on the same page sit next to each other. Open the
file at <https://app.diagrams.net> or in the draw.io desktop app.

Every use case UC01–UC54 is owned by exactly one diagram and carries an actor association
there. A use case shown on another diagram is repeated with a `(see Dx)` suffix so the
`<<include>>`/`<<extend>>` relationship stays visible on both sides without duplicating
ownership.

Every file is self-contained: it declares its own skinparams and renders on its own, with no
shared include.

## Conventions

- **Visual Paradigm look.** Actors are stick figures, use cases are plain white ellipses with
  a short verb phrase, the system boundary is one `UCMS` rectangle, and every connector is a
  straight line (`skinparam linetype polyline`). No notes on the diagrams - rationale lives in
  the model, not in the picture.
- **Short labels.** Each use case shows its id on the first line and a 2-4 word name on the
  second; the full titles are in v2 section 4. A use case owned by another diagram is repeated
  with a `(see Dx)` suffix and carries no actor association there.
- **One diagram per use case group** (v2 section 4). A single diagram holding all 54 use cases
  is unreadable and does not fit a page.
- **No phase markers.** The diagrams show the full model; the phase split of v2 section 12 is a
  delivery plan, not a property of the use case, and stays in the model document.
- **Only three relationship types are drawn:** actor associations, `<<include>>` and
  `<<extend>>`. The arrows in v2 section 8 are business flows, not use case relationships - a
  use case diagram never shows sequence. Ordering lives in the preconditions of the
  specifications (v2 section 6).
- **Relationship direction** follows UML: the dashed arrow points from the including use case
  to the included one, and from the extending use case to the base it extends.
- **`<<include>>`** is drawn only where a specification names another use case as a mandatory
  step of its flow:

  | Base | includes | Source |
  |---|---|---|
  | UC02 View dashboard | UC01 Sign in with Google | UC02 resolves the role from the session UC01 opened |
  | UC15 Suspend / dissolve club | UC28 Cancel / reschedule event | UC15 rules: approved events are cancelled through UC28 |
  | UC15 Suspend / dissolve club | UC49 Release booking | UC15 rules: approved bookings are cancelled through UC49 |

- **`<<extend>>`** is drawn only where a specification names an optional or conditional
  continuation into another use case:

  | Extension | extends base | Source |
  |---|---|---|
  | UC17 Apply for membership | UC06 Browse clubs | UC06 flow: "continue into UC17 or UC29" |
  | UC29 Register for event | UC06 Browse clubs | UC06 flow: "continue into UC17 or UC29" |
  | UC19 Record candidate evaluation | UC18 Screen applications | UC18 flow: "optionally attach an evaluation" |
  | UC22 Request to leave club | UC24 View member workspace | UC22 flow starts from "open my membership" |
  | UC47 Request property booking | UC25 Submit event proposal | UC25 flow: "optionally attach a property booking request" |
  | UC49 Release booking | UC28 Cancel / reschedule event | UC28 flow: "update or release the linked property booking" |
  | UC51 Review event feedback | UC33 Submit event report | UC51 flow: "carry the conclusion into the post-event report" |
  | UC42 Manage compliance case | UC34 Close event report | UC34 flow: "in Phase 2, open a case through UC42" |
  | UC42 Manage compliance case | UC39 Reconcile budget | UC42 trigger: "a financial exception (UC39)" |
  | UC42 Manage compliance case | UC49 Release booking | UC42 trigger: "a late booking cancellation (UC49)" |
  | UC42 Manage compliance case | UC53 Triage complaint | UC53 flow: "Escalated - a case is opened in UC42" |
  | UC15 Suspend / dissolve club | UC42 Manage compliance case | UC15 trigger: "a case outcome (UC42)" |

  UC15 → UC42 is drawn on D2, next to UC15's two includes, so D6 keeps a single fan-in on UC42.

  Business rule BR15 (conflict detection) stays a rule, not an included use case.
- **Layout-only constructs** (none carries meaning): the invisible `<<inner>>` rectangle inside
  `UCMS` adds the padding Graphviz does not give a cluster, so no ellipse touches the frame;
  `-[hidden]-` edges keep the ICPDP Officer in a column of their own to the right of the frame
  (otherwise Graphviz drops the actor below it); `.[norank].>` or the reversed `<..` spelling of
  an `<<extend>>`/`<<include>>` only decides which column the two use cases land in. Student and
  Club Management Board stay on the left, ICPDP Officer on the right, external systems beside the
  use case that calls them.
- **`User` generalization** exists only so UC01 and UC02 have one association instead of three.
- **Every use case has exactly one primary actor.** Where v1 wrote `Student/CMB` or
  `ICPDP/CMB`, v2 either splits the use case or demotes the second actor to supporting - UC31
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
