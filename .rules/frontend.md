# Frontend rules — client/


## Stack

- **React 19** + TypeScript, built with **Vite** (`client/`, one of two npm workspaces alongside `server/`).
- No router — the app is a single page (`App.tsx`).
- No state library — local component state (`useState`/`useReducer`) is enough at this size.
- No HTTP client library — native `fetch`, called against `/api/v1/...` (Vite dev-proxies `/api` to the server). **TanStack React Query** (`@tanstack/react-query`) manages server state: `useQuery`/`useMutation` over those fetch functions, `QueryClientProvider` in `main.tsx`. Pass the queryFn's `signal` to `fetch`; after a mutation, update the cache per Fetch/Service rule 4 (`setQueryData` when the response determines the new value, `invalidateQueries` when the list is server-filtered). Paginated/searched queries use `placeholderData: keepPreviousData` so a key change (new page, new search) keeps the old rows on screen instead of flashing empty (see `useUsers`).
- **Tailwind v4**, CSS-first (`@tailwindcss/vite` plugin, no `tailwind.config.*`). Color tokens are declared in `client/src/index.css` inside `@theme` as `--color-<name>-app`, which generates the `<name>-app` utilities (`bg-danger-app`, `text-danger-app`, …).
- Dark mode is manual (not `prefers-color-scheme`-only): a `.dark` class toggled on `<html>` (see `App.tsx`'s `theme` state) overrides the same tokens under `:root.dark` in `index.css`. No `dark:` Tailwind variant is used — the token indirection alone repaints every `*-app` utility.
- Locale: **i18next** + `react-i18next`, initialized in `client/src/i18n/index.ts` (`en`/`vi`, `fallbackLng: "en"`, language persisted to `localStorage`). Strings are split one file per feature domain (`i18n/common.ts`, `i18n/users.ts`, `i18n/demo.ts`), each exporting `{ en, vi }`, assembled into `resources` in `index.ts`. Components read strings with `const { t } = useTranslation()` and namespaced keys (`t("users.title")`); switch locale with `i18n.changeLanguage("vi")`. New feature → new `i18n/<module>.ts`, then register it in both locales in `index.ts`.
- `cn()` at `client/src/utils/cn.ts` — `twMerge(clsx(inputs))` — for any conditional class.
- **TanStack Table v9** (`@tanstack/react-table`) for tables — headless: the caller owns the `useTable` instance and passes it to the `ui/table/` kit (`AppTable`, `AppTableColumnToggle`, `AppTableLimitSelect`). Pagination controls are table-agnostic — `ui/pagination/AppPagination` takes plain `pageIndex`/`pageCount`/`onPageChange` props, no table instance. v9 ≠ v8: `useTable({ features, columns, data })` with `tableFeatures({...})` (no `useReactTable`/`getCoreRowModel`), `createColumnHelper<typeof features, T>()`, `table.state` instead of `table.getState()`. The shared feature set lives in `AppTable.tsx` (`appTableFeatures`); extend it there when a table needs sorting/selection/etc. Docs for agents ship in `node_modules/@tanstack/react-table/skills/`. Keep `data`/`columns` referentially stable (module-scope empty fallback, `useMemo` columns).
- `@/` path alias configured (`client/tsconfig.json` `paths`, `client/vite.config.ts` `resolve.alias`) → `client/src/*`.

Do not add react-router, Redux/Zustand/Valtio, or axios speculatively. Each has a concrete trigger below; add it — and update this skill — when the trigger actually fires, not before.

## Folder Structure

Current (full template layout — every folder exists; empty ones carry a README stating what belongs there):

```
client/src/
  main.tsx     # entry point, mounts App inside QueryClientProvider
  App.tsx      # the app's one page (no router yet)
  index.css    # Tailwind import + @theme color tokens (only place hex/named colors are allowed) + :root.dark overrides
  i18n/
    index.ts   # i18next init + Locale type + resources (registers every module in en/vi)
    common.ts  # one file per feature domain, each exporting { en, vi }
    users.ts
    demo.ts
  services/
    users.ts   # HTTP layer: one typed async function per endpoint. Knows endpoints, never imports React.
  hooks/
    useUsers.ts # React Query layer: useUsers()/useCreateUser(), owns usersKey. Knows the cache, never calls fetch itself.
  utils/
    cn.ts      # twMerge(clsx(inputs)) — use for every conditional className
  pages/       # one folder per page once a router exists (README placeholder)
  components/
    ui/
      button/AppButton.tsx
      card/AppCard.tsx
      input/AppInput.tsx
      empty-state/AppEmptyState.tsx
      pagination/AppPagination.tsx     # table-agnostic pager: pageIndex/pageCount/onPageChange props
      search-input/AppSearchInput.tsx  # debounced search box (trimmed value via onSearch)
      skeleton/AppSkeleton.tsx         # pulsing placeholder block — size it with className, compose per use site
      switch/AppSwitch.tsx
      table/AppTable.tsx               # headless TanStack Table v9 kit: AppTable + AppTableColumnToggle + AppTableLimitSelect + shared appTableFeatures
      table/AppTableColumnToggle.tsx
      table/AppTableLimitSelect.tsx
      toast/AppToast.tsx
    custom/    # cross-page, domain-aware components (README placeholder)
    layout/    # Navbar/Sidebar/AuthLayout shells (README placeholder)
```

Folder decision table:

| Folder | What goes here |
|---|---|
| `src/components/ui/<group>/App<Name>.tsx` | Atomic, generic UI primitives. No business logic. Grouped by functional category (`ui/button/AppButton.tsx`, `ui/input/AppInput.tsx`, …). |
| `src/components/custom/` | Cross-page custom components. Non-atomic, domain-aware. |
| `src/components/layout/` | Structural layout wrappers (Navbar, BottomNav, AuthLayout). |
| `src/pages/<name>/` | Sub-components used by exactly one page (once a router exists). |
| `src/services/<domain>.ts` | HTTP layer — one typed async function per endpoint, typed against the server envelope. No React imports. |
| `src/hooks/use<Domain>.ts` | React Query hooks over a service's functions — owns the domain's `queryKey`. Also: any stateful logic needed in 2+ components. |

Decision tree for a new component:

1. Used by exactly 1 page → stays inline in that page/caller (or `src/pages/<name>/PascalCase.tsx` once a router + multi-page structure exists).
2. Used by 2+ callers + atomic/primitive → `src/components/ui/<group>/App<Name>.tsx`.
3. Used by 2+ callers + non-atomic/domain-aware → `src/components/custom/`.
4. Layout/navigation shell → `src/components/layout/`.

## Component Rules

1. One component per file, `PascalCase.tsx`, named export only (no default exports).
2. UI primitives under `components/ui/` are prefixed `App` (`AppButton`, `AppInput`, `AppCard`, `AppEmptyState`, …); `components/custom/` and `components/layout/` components are not prefixed.
3. Props interface in the same file, directly above the component (`interface` for object shapes; `type` for unions/primitives/utility types). Types are co-located with the file that owns them — no `src/types/` folder.
4. Before adding a new component, check `src/components/ui/`, `src/components/custom/`, and `src/components/layout/` for one to extend instead.
5. Single-use UI stays inline in its caller — don't pre-split into `components/` for a single use site.
6. No barrel files (no `index.ts` re-exports) — import directly from the file path: `import { AppButton } from "@/components/ui/button/AppButton"`.

## Fetch / Service Rules

Two layers between a component and the network — components never call `fetch` and never import from `services/` directly:

```
component → hooks/use<Domain>.ts (React Query, owns queryKey) → services/<domain>.ts (fetch, owns endpoints)
```

1. `services/<domain>.ts` — one exported async function per endpoint, typed request/response, entity types (`User`, …) declared here. Never imports React; testable without rendering. Use native `fetch` — no axios (nothing here needs interceptors or auth refresh; if a shared auth header ever appears, add one `apiFetch` helper in `services/`, not a client class).
2. `hooks/use<Domain>.ts` — `useQuery`/`useMutation` wrappers over the service functions (`useUsers()`, `useCreateUser()`). The domain's `queryKey` is declared once here — a root for prefix-matched cache ops plus a factory that embeds every queryFn input (`usersKeyRoot` / `usersKey(search)` in `useUsers.ts`); never inline `["users"]` strings elsewhere. Every variable the queryFn uses must appear in the key (it's the dependency array). Forward the queryFn's `signal` to `fetch`.
3. Components share server state through the React Query cache, not props/context: any two components calling `useUsers()` read the same cache entry, and mutations update it for everyone. Server state lives in React Query; client state (theme, locale, form inputs) stays in `useState`.
4. After a mutation: if the response alone determines the new cache value (unfiltered list, response contains the entity), `cancelQueries` + `setQueryData` saves a refetch; if the list is server-filtered/sorted/paginated so the response can't tell where (or whether) the entity lands, `invalidateQueries` on the domain's root key (see `useCreateUser`).
5. Server envelope (`server/src/interface/http/response.ts`) — type against it, don't invent an ad hoc shape:
   - success: `{ statusCode, message, data, timestamp }`
   - error: `{ statusCode, error, message, details?, timestamp, path }`
6. Always check `res.ok` before reading the body. Error bodies aren't guaranteed to be JSON (proxy errors, HTML 404s) — use `res.json().catch(() => null)` on the error path.

## Error & Loading Rules

1. Every async call gets explicit error/loading state — no silent failures.
2. Plain `try`/`catch` or `.catch()`. No error-handling library is installed; don't add one (`neverthrow`, etc.) for this template's needs.
3. Surface errors inline in the component, as `App.tsx` already does; use `appToast` (`@/components/ui/toast/AppToast`, sonner-backed) for transient cross-cutting notifications.
4. Loading UI: skeletons only for the *initial* load of async data (`isPending`), composed from `AppSkeleton` sized to the real layout (see `AppTable`'s `loading` prop and the AppSkeleton demo card in `App.tsx`) — no per-component `*Skeleton` files, and no skeleton where the real content is static or `keepPreviousData` already keeps old data on screen. Never render the empty-state message while the first load is still pending.

## Styling Rules

1. Tailwind utility classes on elements — this is the default way to style. Only fall back to inline `style` when Tailwind genuinely can't express the value (see `App.tsx`'s `max-w-[480px]` vs. an arbitrary non-color value that has no utility).
2. No hardcoded hex/named colors anywhere in `.ts`/`.tsx` — ESLint-enforced (`eslint.config.mjs`), and this also catches Tailwind arbitrary-value colors like `text-[#dc143c]`. Add the token to the `@theme` block in `client/src/index.css` as `--color-<name>-app`, then use the generated utility (`bg-<name>-app`, `text-<name>-app`, `border-<name>-app`, …), with a `:root.dark` override alongside it. Tailwind's own palette classes (`bg-gray-800`, `text-white`, …) are not hardcoded colors and ESLint won't flag them, but reserve them for colors that are deliberately identical in both themes (e.g. white button text baked onto a fixed-color primary background) — anything sitting on a themed surface (body text, borders, muted/secondary text) goes through a token so it repaints with the `.dark` toggle. `border-app` (borders) and `muted-app` (secondary/disabled text) already exist — reuse them before adding a new one.
3. No template literal in `className` — ESLint-enforced. Default class is the base string; a condition only *adds* an override class for the exception, never toggles two opposite classes — always through `cn()`:
   ```tsx
   className={cn("rounded bg-gray-800 px-3 py-1 text-white", { "opacity-50": pending })}
   ```
4. `cn()` lives at `client/src/utils/cn.ts` (`twMerge(clsx(inputs))`) — import it, never re-implement it. `tailwind-merge` matters here: it resolves conflicting Tailwind utilities between the base and the override (e.g. a base `px-2` and an override `px-4`) in favor of the later one, which plain string concatenation can't do.
5. No CSS-in-JS, no CSS Modules — Tailwind utilities cover styling needs at this size. Global tokens and the Tailwind `@import` live in `index.css`; nothing else goes there.
6. Clickable elements get `cursor: pointer` from one global rule in `index.css` (`button`, `a[href]`, `[role="button"]`; `:disabled` → `not-allowed`) — never add `cursor-pointer` per component. A non-native clickable (a `div` with `onClick`) must carry `role="button"` to pick it up — which it needs for accessibility anyway.

## Theme & Locale Safety

Both `theme` and `locale` are runtime toggles a user can flip on the same page — new UI must survive both without a code change.

1. **Theme.** Never assume today's light-mode contrast (e.g. "text is dark, so a light border is always visible") — the same class runs under `.dark` too. Check new markup with the theme toggle flipped, not just at default.
2. **Locale.** `vi` strings in `client/src/i18n/` run 30-60% longer than their `en` counterpart (`"Users"` → `"Người dùng"`, `"Disabled"` → `"Vô hiệu hoá"`). Any element sized to fit today's English string will overflow or clip once `vi` is selected.
   - No `whitespace-nowrap` on an element rendering a `t()` value.
   - No fixed pixel width wrapping a translatable label — let it size to content, or wrap.
   - Any flex row of buttons/pills/labels that includes a translatable string needs `flex-wrap` (see the header controls and the `AppButton`/`AppInput` demo rows in `App.tsx`), so it stacks instead of overflowing at the app's narrow `max-w-[480px]` column.
   - When adding a new key to an `i18n/<module>.ts`, sanity-check its layout with the longer of the two locales selected, not just `en`.
3. Prefer letting Flexbox/Grid reflow over `truncate` for translatable text — this app has no tooltip primitive yet, so a truncated label with no way to read the full string is a worse outcome than a taller row.

## Import Conventions

- `@/` alias for anything under `client/src/` (`@/components/...`, `@/utils/cn`, …). Relative imports (`./`, `../`) only for files in the same folder.
- No barrel files — always import the exact file, never a folder `index.ts` re-export.
- Group imports: React → third-party → `@/` alias.

## Routing & State — Not Yet In This Project

- Router: add `react-router` (small, standard) when a second page is actually needed. Don't reach for anything heavier without a concrete reason.
- State: `useState`/`useReducer`/`Context` cover this template. Add a state library only once prop-drilling is a real, demonstrated pain in this codebase — not preemptively.

## Pre-Implementation Checklist

- [ ] Read the target folder's `README.md` — what you're writing matches what that folder is for
- [ ] Checked `src/components/ui/`, `src/components/custom/`, `src/components/layout/` for a reusable component before writing a new one
- [ ] Placed via the decision tree (single-page-use inline, `ui/` for 2+ atomic, `custom/` for 2+ domain-aware, `layout/` for shell)
- [ ] `App` prefix on `ui/` primitives only; no barrel files; named export
- [ ] Single-use UI stays inline, not pre-split into its own file
- [ ] Network calls layered: endpoint fn in `services/<domain>.ts`, React Query hook in `hooks/use<Domain>.ts`, component imports only the hook; `queryKey` declared once in the hook file
- [ ] Fetch calls check `res.ok` and handle non-JSON error bodies
- [ ] Loading and error states handled explicitly
- [ ] No hardcoded colors — token declared in `index.css`'s `@theme` as `--color-<name>-app` with a `:root.dark` override, consumed via the generated Tailwind utility (static Tailwind palette classes only for colors fixed across both themes)
- [ ] No template literals in `className` — `cn()` used for any conditional class
- [ ] No per-component `cursor-pointer`; any non-native clickable has `role="button"`
- [ ] Checked with the theme toggle flipped — text/borders/muted content still readable under `.dark`
- [ ] Checked with `locale` set to `vi` (longer strings) — no overflow/clipping; translatable rows have `flex-wrap`, no `whitespace-nowrap`, no fixed pixel widths
- [ ] No new dependency (router, state lib, HTTP client) added without a current, real need
