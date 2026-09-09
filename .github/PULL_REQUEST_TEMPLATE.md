## What

<!-- One or two sentences on the change. Link the SPEC: .sdd/specs/feat-{name}/SPEC.md -->

## Why

<!-- The problem this solves, or the acceptance criteria it closes. Link the issue if there is one. -->

## How to verify

<!-- What a reviewer runs to see it work: command, route, seed data, sample request. -->
<!-- UI change? Attach screenshots — one per theme if the change is visual. -->

## Reviewer gates

CI already runs `npm run check` and the integration suite (L1 + L3). The boxes below are the
ones CI cannot check — see `.rules/backend.md` §Review gates. Tick them after looking, not before.

- [ ] **L2** — code matches the SPEC's acceptance criteria, and every criterion has a test
- [ ] **L4** — input validated (SEC-03), deletes per DATA-01, business failures throw
      `DomainError` (ARCH-02), API contract updated in this same PR (ARCH-03)
- [ ] **L4** — the change was demoed, not just described

### Client changes only

- [ ] Checked with the theme toggle flipped — text, borders and muted content still readable
- [ ] Checked with `locale` set to `vi` — longer strings do not overflow or clip

---

- [ ] I can explain every line in this PR
