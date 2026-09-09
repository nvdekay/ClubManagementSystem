## What

<!-- Link the SPEC: .sdd/specs/feat-{name}/SPEC.md -->

## Reviewer gates (CI does NOT check these — see .rules/backend.md)

- [ ] L2: code matches the SPEC's acceptance criteria
- [ ] L4: review-only rules hold — input validated (SEC-03), deletes per DATA-01,
      business failures throw `DomainError` (ARCH-02), API contract updated in this PR (ARCH-03)
- [ ] Agent-written code: the person merging can explain every line
