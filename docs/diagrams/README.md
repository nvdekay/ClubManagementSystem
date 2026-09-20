# Diagrams

PlantUML sources for the UCMS use case diagrams. They render the actor/use case model
specified in [`../UCMS_Business_System_Analysis.md`](../UCMS_Business_System_Analysis.md)
(sections 4, 8, 10 and 11).

| File | Scope | Use cases |
|---|---|---|
| `D0_SystemContext.puml` | actors, the 12 modules, the 2 external systems | — |
| `D1_ClubLifecycle.puml` | Club Lifecycle & Governance | UC01–UC14 |
| `D2_RecruitmentMembership.puml` | Recruitment & Membership | UC15–UC23 |
| `D3a_EventApproval.puml` | Event proposal → approval → publish | UC24–UC30, UC35 |
| `D3b_ParticipationPostEvent.puml` | Registration, attendance, post-event report | UC31–UC34, UC36, UC37 |
| `D4_Finance.puml` | Finance & Budget | UC38–UC45 |
| `D5_ReportingEvaluation.puml` | Reporting, Compliance & Evaluation | UC46–UC50 |
| `D6_PropertyBooking.puml` | Property & Facility Booking | UC51–UC53 |
| `D7_FeedbackComplaint.puml` | Feedback & Complaint | UC54–UC57 |

Every file is self-contained: it declares its own skinparams and can be rendered or pasted
into any PlantUML editor on its own, with no shared include.

## Conventions

- **One diagram per use case group** (section 8 of the analysis). A single diagram holding
  all 57 use cases is unreadable and does not fit a page.
- **Only three relationship types are drawn:** actor associations, `<<include>>` and
  `<<extend>>`. The arrows in section 10 of the analysis are business flows, not use case
  relationships — a use case diagram never shows sequence. Ordering lives in the
  preconditions of the use case specifications (section 9).
- **`User` generalization** exists only so UC01 has a single association instead of three.
- **UC25** has no actor: it is system-triggered and only appears as an included use case.
- **Audit log and notifications (M10)** are not modelled as included use cases. They touch
  most use cases and would bury the diagrams; they are specified in sections 19 and 20.
- A use case shown on another diagram is repeated with a `(see Dx)` suffix so the
  relationship stays visible without duplicating ownership.

## Rendering

```bash
# single diagram
plantuml -tsvg D1_ClubLifecycle.puml

# all of them (PNG for documents, SVG for the web)
plantuml -tpng *.puml
```

Generated images are not committed — render on demand.
