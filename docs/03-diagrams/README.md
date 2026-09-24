# 03 — Diagrams

draw.io sources plus their PNG exports. Open the `.drawio` files with draw.io / diagrams.net or
the VS Code extension.

| File | What it shows |
|---|---|
| [`UCMS_Context_Diagram_v2.drawio`](UCMS_Context_Diagram_v2.drawio) | **Current context diagram** — the system boundary and its 55 data flows between UCMS, the 3 actors and the 2 external systems. Each flow maps to use cases in `../SRS.md` §14.4 |
| [`UCMS_UseCase_ByActor.drawio`](UCMS_UseCase_ByActor.drawio) | **Current use case diagrams**, covering UC01–UC54 — one page per actor group: All users, Student, CMB 1–4, ICPDP 1–3 |
| [`UCMS_State_Diagrams.drawio`](UCMS_State_Diagrams.drawio) | **Current state machines** — Club Application, Club, Membership, Recruitment Campaign, Recruitment Application, Event, Budget Request, Property Booking |
| [`UCMS_Context_Diagram.drawio`](UCMS_Context_Diagram.drawio) | The team's first context diagram (40 flows). **Superseded** by v2; kept as history |
| [`UCMS_Context_Diagram_Comparison.docx`](UCMS_Context_Diagram_Comparison.docx) | Flow-by-flow comparison of context diagram v1 and v2, with the reason for each change |
| [`img/`](img/) | PNG exports, named `<source-file>_<page-number>_<page-name>.png` |

**When a diagram changes:** edit the `.drawio` source, re-export every affected page to `img/`
keeping the naming above, and update `../SRS.md` plus the affected document in
[`../02-use-cases/`](../02-use-cases/) in the same commit.

**Notation rules in force** (review issues I09–I13, I27–I30): `«include»` and `«extend»` model
real use case relationships only — never screen navigation and never a system cascade; a
supporting actor is a plain association, not a dashed edge; sign-in is a *precondition* of the
dashboard, not an `«include»`. The only two `«extend»` edges left are `UC47 «extend» UC25` and
`UC49 «extend» UC28`.
