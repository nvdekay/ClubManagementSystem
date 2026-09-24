# 04 — Design

How the system is shaped, and how it must look. These documents answer *how*; the requirements
they implement are in [`../SRS.md`](../SRS.md).

| File | What it is |
|---|---|
| [`UCMS_High_Level_Design.md`](UCMS_High_Level_Design.md) | Containers, the module → code map, the approval workflow, the notification outbox, audit, identity and authorization, MongoDB data design, the API surface, the client structure, deployment and quality attributes |
| [`design-guidelines.md`](design-guidelines.md) | Visual and UI rules for the client: brand and semantic colour tokens, typography, spacing, radius, elevation, component recipes, motion, icons, the pre-PR accessibility checklist and the anti-patterns |

Engineering rules (where code goes and how it must be written) are **not** here — they live in
[`../../.rules/`](../../.rules/README.md), with the accepted decisions in
[`../../.sdd/rfcs/`](../../.sdd/rfcs/).
