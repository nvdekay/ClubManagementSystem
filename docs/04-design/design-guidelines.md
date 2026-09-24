# UCMS Design Guidelines

Visual rules for the FPT University Club Management System client. Colors, type,
spacing and component recipes only — code placement rules live in
[`.rules/frontend.md`](../../.rules/frontend.md).

Tokens are declared once in [`client/src/index.css`](../../client/src/index.css) inside
`@theme`, with `:root.dark` overrides. Components never see a hex value; they use the
generated Tailwind utility (`bg-primary-app`, `text-muted-app`, `border-border-app`).

## 1. Brand basis

FPT's corporate palette is three colors: orange `#F37021`, blue `#0066B3`,
green `#00A650`. They are the identity, not the interface.

Orange on white measures **2.94:1** — below the 4.5:1 WCAG AA floor for text and below
3:1 for meaningful borders. So the brand hues are kept as `*-brand-*` tokens for fills,
logos and decorative blocks, and every interactive color is a darkened, contrast-checked
variant. This is the single rule that keeps the app both on-brand and accessible.

## 2. Color tokens

Contrast measured against the theme's own background (`#ffffff` / `#0a0a0a`).

### Brand — fixed in both themes, fills and graphics only

| Token | Value | Use | Never |
|---|---|---|---|
| `brand-app` | `#F37021` | Logo, hero block, chart series, large decorative shape | Body text, links, 1px borders, small icons |
| `brand-blue-app` | `#0066B3` | Secondary brand fill, chart series | — |
| `brand-green-app` | `#00A650` | Brand fill, chart series | Success text (3.2:1 — use `success-app`) |

### Semantic — every value ≥ 4.5:1 on its own background

| Token | Light | Dark | Contrast (light / dark) | Use |
|---|---|---|---|---|
| `text-app` | `#1A1A1A` | `#F5F5F5` | 16.9 / 18.2 | Body and heading text |
| `muted-app` | `#5B6472` | `#A1A1AA` | 5.98 / 7.72 | Secondary text, captions, disabled labels, placeholders |
| `bg-app` | `#FFFFFF` | `#0A0A0A` | — | Page background |
| `surface-app` | `#F9FAFB` | `#18181B` | — | Cards, table headers, panels, modals |
| `border-app` | `#E5E7EB` | `#27272A` | — | Dividers, card and input borders, scrollbar thumb |
| `primary-app` | `#C2410C` | `#FB923C` | 5.18 / 8.75 | Primary button fill, active nav, selected state |
| `on-primary-app` | `#FFFFFF` | `#1A1A1A` | 5.18 / 7.69 on primary | Text and icons on `primary-app` |
| `accent-app` | `#0066B3` | `#60A5FA` | 5.91 / 7.79 | Links, secondary actions, info emphasis |
| `ring-app` | `#0066B3` | `#60A5FA` | — | Focus ring, 2px offset |
| `success-app` | `#047857` | `#34D399` | 5.48 / 10.3 | Approved club, confirmed attendance |
| `warning-app` | `#B45309` | `#FBBF24` | 5.02 / 11.9 | Pending review, expiring deadline |
| `danger-app` | `#B91C1C` | `#F87171` | 6.47 / 7.16 | Destructive action, rejected, validation error |

`on-primary-app` flips to near-black in dark mode. Hardcoding `text-white` on a primary
button drops it to ~2:1 once the theme is toggled — always use the token.

### Status mapping for UCMS domain objects

| Domain state | Token |
|---|---|
| Club active / event confirmed / member approved | `success-app` |
| Pending approval / awaiting proposal review | `warning-app` |
| Rejected / cancelled / suspended | `danger-app` |
| Draft / archived / inactive | `muted-app` |
| Ongoing / featured / current semester | `primary-app` |

A status badge carries its label as text, never color alone — `bg-*` at low opacity,
`text-*` at full token value, plus the word.

### Adding a token

1. Does an existing token already mean this? Reuse it (`border-app` and `muted-app` cover
   most requests).
2. Declare `--color-<name>-app` in `@theme` **and** a `:root.dark` override in the same PR.
3. Verify ≥ 4.5:1 against `bg-app` and `surface-app` in both themes before committing.

## 3. Typography

One family: **Be Vietnam Pro** (400/500/600/700), imported in `index.css` and wired to
`--font-sans`. It is drawn for Vietnamese diacritics — `ộ`, `ằ`, `ỹ` keep their shape at
14px, which Poppins and most geometric sans faces do not.

| Role | Class | Size / line-height | Weight |
|---|---|---|---|
| Page title | `text-3xl font-bold` | 30 / 36 | 700 |
| Section heading | `text-xl font-semibold` | 20 / 28 | 600 |
| Card title | `text-base font-semibold` | 16 / 24 | 600 |
| Body | `text-base` | 16 / 24 | 400 |
| Secondary / caption | `text-sm text-muted-app` | 14 / 20 | 400 |
| Table cell | `text-sm` | 14 / 20 | 400 |
| Label, badge | `text-xs font-medium uppercase tracking-wide` | 12 / 16 | 500 |

Rules: body text never below 16px on mobile; line length capped at 65–75 characters
(`max-w-[65ch]`) for prose; no more than two weights in one component.

## 4. Spacing, radius, elevation

- **Spacing** — Tailwind's 4px scale, and only `1 2 3 4 6 8 12 16`. Inside a card: `p-4`
  (mobile) / `p-6` (desktop). Between sections: `gap-6`. Between related controls: `gap-2`.
- **Radius** — `rounded-md` (6px) for inputs, buttons and badges; `rounded-lg` (8px) for
  cards and modals; `rounded-full` for avatars and pills. Nothing else.
- **Elevation** — flat by default. `shadow-sm` on a card only when it sits on `bg-app`
  without a border; `shadow-lg` for modals and popovers. Dark mode leans on
  `surface-app` + `border-app` instead of shadow, which is invisible on near-black.
- **Container** — one max width per page: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **z-index** — sticky header 10, dropdown 20, modal overlay 30, toast 50. No other values.

## 5. Component recipes

Built from the existing `components/ui/` kit — extend those files rather than restyling
per call site.

**Primary button** — `bg-primary-app text-on-primary-app rounded-md px-4 py-2 text-sm
font-medium transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app
focus-visible:ring-offset-2 disabled:opacity-50`

**Secondary button** — `border border-border-app bg-surface-app text-text-app` + the same
sizing. **Destructive** — `bg-danger-app text-white`. **Ghost** — text only, `hover:bg-surface-app`.

**Card** — `rounded-lg border border-border-app bg-surface-app p-4 sm:p-6`. A clickable
card adds `role="button"`, `tabIndex={0}` and `hover:border-primary-app transition-colors`
— a hover that only shifts color, never `scale`, so the grid does not reflow.

**Table** — header `bg-surface-app text-muted-app text-xs uppercase`, rows separated by
`divide-y divide-border-app`, cells `px-4 py-3 text-sm`, row hover `hover:bg-surface-app`.
Below `md`, a table of club members becomes a stacked card list rather than a horizontal
scroller.

**Form field** — `<label>` above the input, `text-sm font-medium`; input
`border border-border-app bg-bg-app rounded-md px-3 py-2`; error text
`text-sm text-danger-app` directly under the field plus `aria-invalid` and
`aria-describedby`. Never rely on a red border alone. Focus uses `ring-1 ring-ring-app` with
**no** `ring-offset` plus `border-ring-app` — an offset ring around an already-bordered
control reads as a second border with a white gap. Filled buttons keep `ring-offset-2`,
since a ring with no offset would sit on the fill.

**Badge** — `rounded-full px-2 py-0.5 text-xs font-medium` with a 10% tint of its status
token as background and the token as text.

**Empty state** — icon, one sentence explaining what would be here, one primary action.
Use `AppEmptyState`; never render it while the first load is still pending.

**Loading** — `AppSkeleton` shapes matching the real layout on initial load only. Buttons
disable and show a spinner during a mutation; they never disappear.

## 6. Motion

150–300ms, `transition-colors` or `transition-opacity` only — `transform` and `opacity`
are the sole GPU-cheap properties, and layout-affecting transitions (`width`, `height`,
`scale` on hover) cause reflow. Page-level animation is opt-out:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## 7. Icons

Heroicons or Lucide outline, 24×24 viewBox, rendered `w-5 h-5` (inline) or `w-6 h-6`
(standalone), `currentColor` fill so they repaint with the theme. No emoji as UI icons.
An icon-only button carries `aria-label`.

## 8. Checklist before opening a PR

- [ ] No hex outside `index.css`; no `dark:` variants (the token indirection handles it)
- [ ] Toggled the theme — text, borders and muted content still readable in `.dark`
- [ ] Switched locale to `vi` — Vietnamese strings run 30–60% longer; rows `flex-wrap`,
      no `whitespace-nowrap`, no fixed pixel width around a `t()` value
- [ ] Every interactive element has a visible `focus-visible` ring
- [ ] Touch targets ≥ 44×44px
- [ ] Status shown by text or icon, not color alone
- [ ] Checked at 375 / 768 / 1024 / 1440px, no horizontal scroll
- [ ] `prefers-reduced-motion` respected

## 9. Anti-patterns

| Don't | Why |
|---|---|
| `#F37021` as text or link color | 2.94:1 — fails AA; use `primary-app` |
| `text-white` on a primary button | Breaks in dark mode; use `on-primary-app` |
| `text-gray-400` for body copy | Below 4.5:1 on white; use `muted-app` |
| `hover:scale-105` on cards | Reflows the grid; shift color instead |
| Emoji icons (🎓 🏆 📅) | Render differently per OS; use SVG |
| A third accent color per feature | The palette is three brand hues plus semantics |
| `cursor-pointer` per component | One global rule already covers it in `index.css` |
