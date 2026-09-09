# ADR-002: Minimal-dependency client architecture

Date: 2026-08-13 · Status: accepted

## Decision
Single-page React 19 + Vite app in `client/` with deliberately few libraries:
- No router, no state library, no HTTP client. Native `fetch` behind two layers:
  `services/<domain>.ts` (endpoints, typed, no React) → `hooks/use<Domain>.ts`
  (TanStack React Query, owns the `queryKey`) → components. Server state lives in
  the React Query cache; client state (theme, locale, forms) in `useState`.
- Tailwind v4 CSS-first. All themed colors are `--color-<name>-app` tokens in
  `index.css` `@theme` with `:root.dark` overrides — dark mode is a `.dark` class
  on `<html>`, no `dark:` variants. Conditional classes via `cn()` only
  (CSS-override pattern, no template literals in `className`) — ESLint-enforced.
- Locale is a flat `STRINGS[locale]` dictionary in `i18n.ts` (`en`/`vi`), no i18n lib.
- Tables are headless TanStack Table v9: caller owns the `useTable` instance,
  `ui/table/` kit renders it.
- Component taxonomy: `ui/` (atomic, `App*`-prefixed), `custom/` (domain-aware),
  `layout/` (shells); single-use UI stays inline. No barrel files.

## Why
- Template for small teams + AI agents: fewer libraries = fewer conventions to
  drift from, and the remaining rules are lint-enforceable (colors, className).
- Token indirection makes dark mode a repaint, not a per-component audit.
- Service/hook split keeps endpoints testable without rendering and cache keys
  declared once.

## Trade-offs
- Each skipped library has a written trigger (see `.claude/skills/react-arch`):
  router when a second page exists, state lib when prop-drilling demonstrably
  hurts, i18n lib when the flat dictionary outgrows one page. Add on trigger,
  not before — and update the skill when one fires.
- Manual `.dark`/locale toggles mean every new UI must be checked under both;
  mitigated by the react-arch checklist rather than tooling.
