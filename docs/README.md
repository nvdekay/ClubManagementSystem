# Documentation

Business analysis and design for the University Club Management System (UCMS).
Code rules live in [`../.rules/`](../.rules/README.md) — this folder holds the *what*, not the *how*.

## Start here

**[`SRS.md`](SRS.md) — the Software Requirements Specification (written in Vietnamese).** One consolidated baseline:
scope, actors, all 54 use cases as numbered functional requirements, the 45 business rules, the
11 entity lifecycles, the data model, the cross-cutting workflow / notification / audit design,
the evaluation model, the dashboards, the non-functional and security requirements, the
acceptance criteria and the traceability matrices. Design, code, tests and reviews all point at
it. Where the SRS and a source document disagree on a requirement, **the SRS wins**.

## Folder map

| Folder | What is inside | Read it when |
|---|---|---|
| [`01-business-analysis/`](01-business-analysis/) | The original business & system analysis (Vietnamese): problems, stakeholders, flows, user stories, domain model, evaluation model, signature features | You need the *why* behind a requirement, or the background the SRS summarizes |
| [`02-use-cases/`](02-use-cases/) | **Current** use case model v2 and the detailed specification of all 54 use cases, the Word export, and the review log I01–I30 | You need the full narrative of a use case, the v1 → v2 mapping, or the history of a correction |
| [`03-diagrams/`](03-diagrams/) | draw.io sources and PNG exports: context diagram v1 and v2, use case diagrams per actor, state diagrams | You need a picture, or you are changing one |
| [`04-design/`](04-design/) | High-level design and the UI design guidelines | You are about to write code or build a screen |

## Reading order for someone new

1. [`SRS.md`](SRS.md) §1–§2 — what the product is, who uses it, what is out of scope.
2. [`03-diagrams/img/UCMS_Context_Diagram_v2_01_Context-diagram-v2.png`](03-diagrams/img/UCMS_Context_Diagram_v2_01_Context-diagram-v2.png) — the system boundary in one picture.
3. [`SRS.md`](SRS.md) §4 — the use case you are about to build, then §5 and §6 for its rules and states.
4. [`04-design/UCMS_High_Level_Design.md`](04-design/UCMS_High_Level_Design.md) — where the code goes.
5. [`../.rules/README.md`](../.rules/README.md) — how the code must look. Definition of Done: `npm run check` green.

## Conventions

- **English only** in every document, as per [`../.rules/README.md`](../.rules/README.md) —
  with one deliberate exception: [`SRS.md`](SRS.md) is written in **Vietnamese** at the project
  owner's request. Its technical identifiers (UC / FR / BR codes, state names, entity and field
  names, paths, endpoints) stay in English because they appear verbatim in the code.
- A use case is identified by its **v2** number (UC01–UC54) everywhere except inside the v1
  analysis. §5 of the use case model translates between v1 and v2.
- Business rules keep one numbering across all documents: **BR01–BR46**, with BR43 withdrawn.
  The consolidated list, with every amendment applied, is `SRS.md` §5.
- Nothing is deleted. Superseded material stays readable so a decision can be traced back to
  the model it was made under; where v1 and v2 disagree, **v2 wins**.
- Diagrams are edited as `.drawio` and re-exported to `03-diagrams/img/` in the same commit.
