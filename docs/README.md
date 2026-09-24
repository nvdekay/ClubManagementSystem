# Documentation

Business analysis and design for the University Club Management System (UCMS).
Code rules live in [`../.rules/`](../.rules/README.md) — this folder holds the *what*, not the *how*.

## Read in this order

| # | Document | What it is |
|---|---|---|
| 1 | [`UCMS_Business_System_Analysis_EN.md`](UCMS_Business_System_Analysis_EN.md) | The full business analysis: problems, actors, scope, modules, flows, domain model, evaluation model, dashboards, notifications, audit, signature features. **§1–§7 and §12–§24 are current.** |
| 2 | [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) | **The use case model — current.** 54 use cases, the v1 → v2 mapping, relationship map, actor matrix, entity lifecycles, amended business rules, the two-phase plan, traceability, open decisions. |
| 3 | [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md) | **The detailed specification — current.** All 54 use cases with actor, goal, trigger, preconditions, input, main flow, alternative flows, exceptions, postconditions, business rules, output, related use cases, pain point and phase. |
| 4 | [`diagrams/UCMS_UseCase_ByActor.drawio`](diagrams/UCMS_UseCase_ByActor.drawio) | **The use case diagrams — current.** draw.io, one page per actor, covering UC01–UC54. |
| — | [`UCMS_UseCase_Specifications_v2.docx`](UCMS_UseCase_Specifications_v2.docx) | The same 54 specifications as document 3, in the Word table format the course submission uses — one table per use case with Main Success Scenario, Alternative Scenario, Exceptions and Business Rules. Generated from document 3; edit the Markdown first. |
| 4b | [`diagrams/UCMS_Context_Diagram_v2.drawio`](diagrams/UCMS_Context_Diagram_v2.drawio) | **The context diagram — current.** 55 data flows between the system, the 3 actors and the 2 external systems; each flow is traced to use cases in §15 of document 2. |
| 5 | [`UCMS_High_Level_Design.md`](UCMS_High_Level_Design.md) | Containers, module → code map, approval workflow, notification outbox, audit, identity, data design, API surface, client, deployment. |
| 6 | [`design-guidelines.md`](design-guidelines.md) | Visual and UI guidelines for the client. |

## Superseded, kept as history

| Document | Superseded by |
|---|---|
| §8–§11, §14–§15, §21–§22 of `UCMS_Business_System_Analysis_EN.md` (57 use cases) | `UCMS_UseCase_Model_v2.md` + `UCMS_UseCase_Specification_v2.md` |
| [`UCMS_Business_System_Analysis.md`](UCMS_Business_System_Analysis.md) (Vietnamese) | The `_EN` version is the working copy; the Vietnamese one lags behind |
| [`diagrams/UCMS_Context_Diagram.drawio`](diagrams/UCMS_Context_Diagram.drawio) (the team's first context diagram, 40 flows) | `diagrams/UCMS_Context_Diagram_v2.drawio` |
| `UCMS_UseCase_Specifications.docx` (v1, 57 use cases — on the `agent/use-case-diagrams` branch) | `UCMS_UseCase_Specifications_v2.docx` |

Nothing is deleted: v1 stays readable so a decision can be traced back to the model it was made
under. **Where v1 and v2 disagree, v2 wins.**

## What changed between v1 and v2

v1 specified 57 use cases. The count was not the problem — the composition was: one review
session was split into three use cases, resubmission was modelled as its own use case, a system
function was counted as one, five use cases carried two primary actors, and every configuration
and read use case was dropped as "CRUD" — including the property catalogue that a Must-level use
case reads, the evaluation scheme a business rule validates, and all three dashboards.

v2 keeps the same actors, modules and scope, merges what was one session, deletes what was a
rule, adds the nine missing use cases, gives every lifecycle transition a named driver, and
replaces the MVP list with one release grouped into loops that each close. `§1` of
`UCMS_UseCase_Model_v2.md` has the full list with the evidence per item.

## Conventions

- **English only** in every document, as per [`../.rules/README.md`](../.rules/README.md).
- A use case is identified by its **v2** number everywhere except inside the v1 documents and
  the v1 diagrams. Use §5 of the model document to translate between them.
- Business rules keep one numbering across all documents (BR01–BR43); §11 of the model document
  lists the amendments to §14 of the analysis.
- Diagrams are not committed as images — render them on demand (see the diagram READMEs).
