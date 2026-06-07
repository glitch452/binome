# Feature Spec — Warm Redesign (Direction A) + Theme/Accent & Display Menus

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §18, `specs/tasks/0006-warm-redesign-tasks.md`

## 1. Summary

A visual refresh of the whole app that adopts **Direction A — "Warm"** from the Claude Design handoff: warm-tinted
neutral palette (light + dark), larger corner radii, soft layered shadows, and accent-filled primary buttons — applied
across the Timer List, Run, and form surfaces. The refresh keeps Binome's bones (Geist + Geist Mono, lucide icons, the
existing screens and feature glyphs) and **does not change any behaviour** except where called out below.

Two new user preferences ship with it, both persisted to `localStorage` exactly like the existing theme and font-size
prefs:

- **Accent color** — the first chromatic token in the system. A curated palette of five accents (default the blue-ish
  **indigo**) drives the shadcn `--primary` / `--ring` tokens (so every existing `bg-primary` button picks it up) plus a
  small family of derived "soft" accent tokens the Warm look uses.
- **Countdown numeral font** — Mono (Geist Mono, current) or Sans (Geist), affecting only the big Run-view countdown.

The two top-right toggle buttons are replaced by **dropdown menus**: the theme cycle-button becomes a **Theme & Accent
menu** (Light / Dark / System with a current-selection indicator, a divider, then the accent swatches with a selected
indicator); the font-size cycle-button becomes a **Display menu** (the four sizes with an indicator, a divider, then the
numeral-font choices with an indicator). Both are built on the existing Base UI `menu.tsx` primitive.

Finally, one list-row change: the leading per-row **timer icon is replaced by a bare monospace index** (`01`, `02`, …,
the Direction B treatment). The existing active-row / "Running" state is **kept as-is**.

## 2. Goals

- Re-skin the app in the **Warm** direction via **token-level changes first** (neutrals, radius, shadows, accent →
  `--primary`), minimizing per-component churn.
- Introduce a **user-selectable accent color** (5 curated options; default **indigo** `#4f46e5`) persisted to
  `localStorage` under a new key, applied to `<html>` the same way the theme is.
- Introduce a **selectable countdown numeral font** (Mono / Sans) persisted to `localStorage`, affecting only the
  Run-view countdown.
- Replace the theme cycle-button with a **Theme & Accent dropdown** and the font-size cycle-button with a **Display
  dropdown**, each showing the current selection with a clear indicator and grouped by a divider.
- Replace the list-row timer icon with a **bare monospace index** (keeping the existing "Running" / active-row state).
- Add the Warm Run-view **accent-gradient background** (always on).
- Restyle the **form** to the Warm mockup's structure (captioned duration boxes, alert settings as card rows with
  descriptions + accent-on state, standalone hide-name card) without changing fields or submit behaviour.
- **Validate every preference read from `localStorage` with Zod** (accent, numeral font, theme, font size) and ensure
  all four are persisted with `{ sync: true }` so cross-tab changes apply immediately.
- Keep all surfaces working at ≥375px, respecting light/dark and not relying on color alone for state.

## 3. Non-Goals (v1 of this feature)

- **No change to timer execution semantics or the list-row "Running" state.** This is a visual refresh: the existing
  active-row / "Running" indicator and `isActive` wiring are kept exactly as they are; whether a timer keeps running in
  context after "Back to List" is unchanged.
- **No run-view background toggle / persisted setting.** The accent gradient is always on (per the chosen design
  decision); there is no on/off control and nothing new stored for it.
- **No IBM Plex Mono** (or any new font dependency). Numeral-font options are limited to the already-loaded Geist Mono
  and Geist.
- **No free-form / custom accent picker.** Only the five curated accents; no hex input, no per-timer accent.
- **No new "Direction B / Signal" variant**, no theme-direction switcher, and no warm-chip-with-number list treatment
  (the bare index was chosen).
- **No change to the import/export envelope or `TimerConfig` shape** — accent and numeral-font are app-level UI prefs,
  not timer fields, and are not exported.
- **No migration framework.** Existing stored theme/font-size values stay valid; the two new keys are independent and
  default cleanly when absent or malformed.

## 4. Visual System — Warm tokens

The Warm look is delivered primarily by rewriting the CSS-variable values in `app/globals.css`; the shadcn component
classes are unchanged. The design's `.bn[data-dir='warm']` token set maps onto the existing shadcn variable names as
follows (oklch values taken verbatim from `binome.css`):

### 4.1 Neutrals (static per theme)

| shadcn var (`:root` / `.dark`)          | Warm light                          | Warm dark               |
| --------------------------------------- | ----------------------------------- | ----------------------- |
| `--background`                          | `oklch(0.985 0.009 73)`             | `oklch(0.185 0.013 58)` |
| `--card`, `--popover`                   | `oklch(0.998 0.004 73)`             | `oklch(0.232 0.015 58)` |
| `--secondary`, `--muted`, `--accent`    | `oklch(0.955 0.013 73)` (surface-2) | `oklch(0.285 0.017 58)` |
| `--border`, `--input`                   | `oklch(0.9 0.013 70)`               | `oklch(1 0 0 / 0.1)`    |
| `--foreground`, `*-foreground` neutrals | `oklch(0.24 0.02 60)`               | `oklch(0.97 0.007 75)`  |
| `--muted-foreground`                    | `oklch(0.52 0.022 60)`              | `oklch(0.74 0.013 70)`  |

> Note the naming collision: shadcn's `--accent` is a **neutral hover** token (it stays a warm gray, mapped to the
> design's `surface-2`). The chromatic user accent is a **separate** family of `--acc-*` tokens (§5) and `--primary`. Do
> not overload shadcn `--accent` with the color accent.

A `--fg-subtle` value (`oklch(0.64 0.018 60)` light / `oklch(0.6 0.012 70)` dark) is added for the list index and other
subtle text; reuse `--muted-foreground` if a separate token proves unnecessary.

### 4.2 Radius & shadows

- Bump `--radius` from `0.625rem` to **`1.125rem` (18px)**. The existing `@theme inline` derivations then yield ≈10.8px
  (`--radius-sm`), ≈14.4px (`--radius-md`), 18px (`--radius-lg`) — matching the Warm `--r-sm`/`--r-md`/`--r` (10 / 14 /
  18). Verify primary buttons (`rounded-md`) and cards (`rounded-lg`) read correctly after the bump.
- Add the Warm shadow tokens as CSS variables (`--shadow`, `--shadow-sm`) per the design and apply a soft `shadow-sm` to
  list rows / cards. These are warm-tinted (`rgba(60,45,25,…)` light, near-black dark).

### 4.3 Destructive

Keep the existing `--destructive`. The design's danger button uses a soft-tinted background; the existing destructive
button variant is acceptable as-is (no change required).

## 5. Accent Color System

### 5.1 Palette

Five curated accents, in this order (hex verbatim from the design's `ACCENTS` array); all use **white** as the on-accent
foreground:

| id (`AccentColor`) | hex       | label  |
| ------------------ | --------- | ------ |
| `indigo` (default) | `#4f46e5` | Indigo |
| `amber`            | `#d97706` | Amber  |
| `teal`             | `#0d9488` | Teal   |
| `rose`             | `#e11d48` | Rose   |
| `green`            | `#16a34a` | Green  |

### 5.2 Token mapping

The selected accent drives, in `app/globals.css`:

- `--primary` ← the accent hex; `--primary-foreground` ← white. (Every existing `bg-primary` / `text-primary-foreground`
  surface — primary buttons, etc. — becomes accent-filled, which is the Warm look.)
- `--ring` ← the accent (focus rings tint to the accent).
- A derived family used by the Warm surfaces, via `color-mix` against the surface/background:
  - `--acc` = the accent hex
  - `--acc-foreground` = white
  - `--acc-soft` = `color-mix(in oklab, var(--acc) 15%, var(--card))`
  - `--acc-softer` = `color-mix(in oklab, var(--acc) 8%, var(--card))`
  - `--acc-ring` = `color-mix(in oklab, var(--acc) 45%, transparent)`

Because the soft variants mix against `--card`, they adapt to light/dark automatically — a single accent definition
works for both themes. Register the ones used by utilities (`--acc-soft`, `--acc-softer`, `--acc-ring`) as Tailwind
color tokens in `@theme inline` (e.g. `--color-acc-soft: var(--acc-soft)`) so `bg-acc-soft` / `ring-acc-ring` resolve;
or use arbitrary `bg-[…]` values where only one or two uses exist.

### 5.3 Application & persistence

- **Default baked in:** the `indigo` accent values are written directly into `:root` / `.dark`, so the common case has
  **no flash** on load and SSR output is correct.
- **Per-accent overrides:** one `[data-accent='<id>']` block per non-default accent (and optionally one for `indigo` for
  completeness) overrides `--primary`, `--primary-foreground`, `--ring`, and the `--acc-*` family.
- **Applied to `<html>`** via `document.documentElement.dataset.accent`, set in an effect — mirroring how `useTheme`
  toggles `.dark`. A malformed/unknown stored value yields a `data-accent` that matches no block, so the inherited
  `:root` indigo defaults apply (graceful fallback).
- **Stored** at `localStorage` key `countdown_accent` via `useLocalStorage` with `{ sync: true }` (cross-tab changes
  apply immediately) and a **Zod** `parse` (`accentColorSchema`, §9.2), default `'indigo'`. The schema validates every
  value read from storage — on first load and on cross-tab `storage` events — so a malformed/unknown value falls back to
  the default.

### 5.4 State

A new context + thin hook pair, matching the repo's `*Context.tsx` + `use*.ts` split:

- `contexts/AccentContext.tsx` — `AccentProvider` owns the `useLocalStorage` value and **applies `data-accent` in an
  effect inside the provider** (the provider is always mounted at the root, so application doesn't depend on a consumer
  being rendered). Exposes `{ accent, setAccent }`.
- `hooks/useAccent.ts` — `useAccent()` consumer that throws if used outside the provider (same shape as `useTheme`).

## 6. Theme & Accent Menu

`components/shared/ThemeMenu.tsx` **replaces** `components/shared/ThemeToggle.tsx` (delete the old file + its test).

- **Trigger:** an icon `Button` (ghost, `size="icon"`) showing the icon for the current **preference** — `Sun` (light),
  `Moon` (dark), `Monitor` (system) — with an `aria-label` like "Theme and accent settings".
- **Popup** (Base UI menu): a labelled **Mode** group of three `MenuRadioItem`s — Light / Dark / System — each with its
  lucide icon and a trailing selected indicator (`Check` via `MenuRadioItemIndicator`), bound to `preference`; choosing
  one calls `setTheme`. Then a `MenuSeparator`. Then a labelled **Accent** group of five `MenuRadioItem`s, each showing
  a small color swatch (the accent hex) + label + selected indicator, bound to `accent`; choosing one calls `setAccent`.
- Consumes `useTheme` (for `preference`/`setTheme`) and `useAccent` (for `accent`/`setAccent`).

## 7. Display Menu (size + numeral font)

`components/shared/DisplayMenu.tsx` **replaces** `components/shared/FontSizeToggle.tsx` (delete the old file + its
test).

- **Trigger:** an icon `Button` (ghost, `size="icon"`) with the existing "A" glyph (or a `Type` lucide icon),
  `aria-label` like "Countdown display settings".
- **Popup:** a labelled **Size** group of four `MenuRadioItem`s — Small / Medium / Large / Extra large — with a selected
  indicator, bound to `fontSize`; choosing one calls `setFontSize`. Then a `MenuSeparator`. Then a labelled **Numerals**
  group of two `MenuRadioItem`s — Mono / Sans — with a selected indicator, bound to `numeralFont`; choosing one calls
  `setNumeralFont`.
- Consumes `useTimerFontSize` (existing) and `useTimerNumeralFont` (new — §8.2).
- Placement: the Display menu lives in the **Run-view toolbar only** (both size and numeral font affect only the
  Run-view countdown), exactly where `FontSizeToggle` is today. The Theme & Accent menu lives in **both** the Timer-List
  header and the Run-view toolbar (everywhere `ThemeToggle` is today).

### 7.1 Menu primitive additions

Extend `components/ui/menu.tsx` with thin wrappers over Base UI's menu parts so the two menus can express grouped,
single-select-with-indicator lists: `MenuSeparator` (`Menu.Separator`), `MenuGroup` (`Menu.Group`), `MenuGroupLabel`
(`Menu.GroupLabel`), `MenuRadioGroup` (`Menu.RadioGroup`), `MenuRadioItem` (`Menu.RadioItem`), and
`MenuRadioItemIndicator` (`Menu.RadioItemIndicator`) — styled to match the existing `MenuItem` / `MenuPopup` look
(separator = `bg-border`, group label = `text-muted-foreground` small caps).

## 8. Screen Restyle

### 8.1 Timer List

- **Leading index:** `TimerListItem` receives a new `index: number` prop and renders a **bare monospace index**
  (`String(index + 1).padStart(2, '0')`) in place of any leading icon — `font-mono`, `text-muted-foreground`, fixed
  narrow width, right-aligned (the Warm `.bn-index` treatment). `TimerList` passes the map index.
- **"Running" state kept:** the existing `isActive` treatment is unchanged — the active row still highlights / disables
  Start exactly as today. The new `index` prop is purely additive.
- **Header brand (light touch):** the list header may adopt the Warm brand treatment — an accent logo chip + "Binome"
  wordmark + "Every second counts" subtitle — but this is cosmetic; the existing `<h1>Binome</h1>` is an acceptable
  minimum if the chip proves fiddly. Rows/cards pick up the new radius + soft shadow automatically from tokens.

### 8.2 Run View

- **Accent-gradient background (always on):** add an absolutely-positioned, `pointer-events-none`, behind-content
  background element to `RunView` using the Warm gradient
  (`radial-gradient(120% 80% at 50% -10%, var(--acc-soft) 0%, transparent 55%)` plus the lower `--acc-softer` glow). No
  toggle, nothing persisted.
- **Numeral font:** a new pref, type `TimerNumeralFont = 'mono' | 'sans'`, default `'mono'`, stored at
  `countdown_timer_numeral_font`. Mirrors the font-size pair: `contexts/TimerNumeralFontContext.tsx`
  (`TimerNumeralFontProvider`, `useLocalStorage` with `{ sync: true }` + a Zod `parse` — `timerNumeralFontSchema`, §9.2)
  - `hooks/useTimerNumeralFont.ts`. `RunView` reads it and passes it to `CountdownDisplay`.
- **`CountdownDisplay`** gains a `numeralFont?: TimerNumeralFont` prop (default `'mono'`) that selects the font-family
  class — `font-mono` (current) or `font-sans` — replacing the hard-coded `font-mono`. Size class behaviour is
  unchanged.
- Toolbar uses `ThemeMenu` + `DisplayMenu` in place of `ThemeToggle` + `FontSizeToggle`.

### 8.3 Form (TimerForm / DurationInput)

The form adopts the **structural** layout from the Warm mockup's `BinomeForm` (not just token inheritance). Same fields,
same data, same `Switch`-based controls (the repo convention — **no checkboxes**), but reorganized into the mockup's
shapes. All accent surfaces reuse the `--acc-soft` / `--acc-softer` / `--acc-ring` tokens from §5.2.

- **Duration as captioned boxes** (`DurationInput.tsx`): replace the three `HH : MM : SS`-labelled number inputs + colon
  separators with three large, equal-width boxes (the Warm `.bn-dbox`: tall, `font-mono`, large tabular numerals,
  rounded) each with a **caption below** — "hours" / "min" / "sec" (the Warm `.bn-dcap`) instead of the "HH"/"MM"/"SS"
  labels above. The focused box takes the **accented** treatment (`.bn-dbox.is-acc`: accent border + `--acc-ring`).
  Field behaviour (clamping, blur normalization, `onChange` → seconds), `aria-label`s, and the value contract are
  unchanged — this is a presentational restructure.
- **"Alerts on expiry" group** (`TimerForm.tsx`): introduce a fieldset with a small-caps legend ("Alerts on expiry", the
  Warm `.bn-legend`) above the alert settings.
- **Each alert setting becomes a card row** (the Warm `.bn-check`): a bordered, rounded, padded row containing a leading
  lucide icon, a two-line text block (**bold title** + a muted **description** line), and a **trailing `Switch`**. When
  the setting is on, the card takes an accent-softer background (`bg-acc-softer`) + `--acc-ring` border (the
  `.bn-check.is-on` state) and the icon tints to the accent. Add the mockup's description lines: Flash → "Flash the
  screen for 3 seconds"; Sound → "Repeat an alert tone"; Count up → "Keep counting after zero"; Notification → "Alert
  even in the background". (Titles stay as today.)
- **Reveal sub-controls within the group** (the Warm `.bn-subrow`): the sound row's `SoundSelector` + Preview + repeat
  controls and the notify-mode control still reveal when their switch is on, but render as an indented subrow tied to
  the card (rather than the current left-border block). The notify mode **may** be presented as a 2-option segmented
  control ("Always" / "When in background") to match the mockup, or keep the existing `Select` — either is acceptable.
- **"Hide name" as its own card row**: the hide-name setting renders as a standalone `.bn-check`-style card (icon +
  title "Hide name on run screen" + description "Distraction-free countdown" + trailing `Switch`), separate from the
  alerts group, as in the mockup.
- The footer keeps Cancel (outline) + Save (accent-filled primary); validation/submit logic is unchanged.

## 9. Data Models & Validation

### 9.1 Types & constants

In `types/timer.ts`:

```ts
export type AccentColor = 'indigo' | 'amber' | 'teal' | 'rose' | 'green';

export type TimerNumeralFont = 'mono' | 'sans';
```

These are **app-level UI preferences**, not part of `TimerConfig`; the persisted timer shape, `timerConfigSchema`,
`parseTimerList`, and the import/export envelope are all unchanged.

In `lib/constants.ts`:

```ts
export const STORAGE_KEY_ACCENT = 'countdown_accent';
export const STORAGE_KEY_TIMER_NUMERAL_FONT = 'countdown_timer_numeral_font';

export const ACCENT_IDS = ['indigo', 'amber', 'teal', 'rose', 'green'] as const satisfies readonly AccentColor[];
export const DEFAULT_ACCENT: AccentColor = 'indigo';

// hex + label drive the menu swatches / aria; the CSS holds the source of truth for applied color.
export const ACCENTS: Readonly<Record<AccentColor, { hex: string; label: string }>> = {
  indigo: { hex: '#4f46e5', label: 'Indigo' },
  amber: { hex: '#d97706', label: 'Amber' },
  teal: { hex: '#0d9488', label: 'Teal' },
  rose: { hex: '#e11d48', label: 'Rose' },
  green: { hex: '#16a34a', label: 'Green' },
};

export const NUMERAL_FONTS: Readonly<Record<TimerNumeralFont, string>> = {
  mono: 'Mono',
  sans: 'Sans',
};
export const DEFAULT_TIMER_NUMERAL_FONT: TimerNumeralFont = 'mono';
```

### 9.2 Preferences validation (`lib/preferencesSchema.ts`)

**Every value read from `localStorage` is validated with Zod** — both the two new prefs and the existing theme /
font-size prefs (which currently cast the raw JSON without validation). A new `lib/preferencesSchema.ts` defines a Zod
enum per preference, reusing the constant id lists so the schema can't drift from the types:

```ts
import { z } from 'zod';
import { ACCENT_IDS } from '@/lib/constants';

export const themePreferenceSchema = z.enum(['light', 'dark', 'system']);
export const timerFontSizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);
export const accentColorSchema = z.enum(ACCENT_IDS); // ['indigo','amber','teal','rose','green']
export const timerNumeralFontSchema = z.enum(['mono', 'sans']);
```

> For `z.enum(ACCENT_IDS)` to typecheck, declare `ACCENT_IDS` as a `const` tuple in `lib/constants.ts`
> (`export const ACCENT_IDS = ['indigo', 'amber', 'teal', 'rose', 'green'] as const satisfies readonly AccentColor[]`).
> `AccentColor` still lives in `types/timer.ts`; the `satisfies` keeps the tuple and the union from drifting.

Each preference context passes the matching schema's `.parse` as the `useLocalStorage` `parse` option, e.g.
`parse: (raw) => accentColorSchema.parse(raw)`. `useLocalStorage` already (a) falls back to the default when `parse`
throws on the initial read, and (b) applies `parse` to incoming cross-tab `storage` events and ignores malformed ones —
so wiring the schema in covers both read paths with no hook change. **Zod is already a dependency** (`timerSchema.ts`,
import/export), so this adds nothing new.

This retrofits validation onto `ThemeContext` and `TimerFontSizeContext` as well — both already use `{ sync: true }`;
they gain only the `parse` option. The two new contexts use `{ sync: true }` from the start.

## 10. App Integration & Components

New / changed files (one-line role each):

- **`types/timer.ts`** — add `AccentColor`, `TimerNumeralFont`.
- **`lib/constants.ts`** — add the two storage keys, `ACCENT_IDS` / `DEFAULT_ACCENT` / `ACCENTS`, `NUMERAL_FONTS` /
  `DEFAULT_TIMER_NUMERAL_FONT`.
- **`lib/preferencesSchema.ts`** (new) — Zod enums for theme / font-size / accent / numeral-font, used as the
  `useLocalStorage` `parse` for all four preference contexts (§9.2).
- **`app/globals.css`** — rewrite `:root` / `.dark` neutrals to the Warm palette; bump `--radius`; add Warm shadow
  tokens; add the default accent + `[data-accent='…']` override blocks + `--acc-*` family; register the `--color-acc-*`
  tokens used by utilities; add the Run-view background gradient (utility class or inline style values).
- **`contexts/AccentContext.tsx`** (new) — `AccentProvider`; `useLocalStorage` with `{ sync: true }` +
  `accentColorSchema` parse; owns the accent value and applies `data-accent` to `<html>`.
- **`hooks/useAccent.ts`** (new) — consumer hook; throws outside the provider.
- **`contexts/TimerNumeralFontContext.tsx`** (new) — `TimerNumeralFontProvider`, mirrors `TimerFontSizeContext`;
  `{ sync: true }` + `timerNumeralFontSchema` parse.
- **`hooks/useTimerNumeralFont.ts`** (new) — consumer hook.
- **`contexts/ThemeContext.tsx`** — add `themePreferenceSchema` as the `useLocalStorage` `parse` (retrofit validation;
  `{ sync: true }` already set).
- **`contexts/TimerFontSizeContext.tsx`** — add `timerFontSizeSchema` as the `useLocalStorage` `parse` (retrofit
  validation; `{ sync: true }` already set).
- **`components/ui/menu.tsx`** — add `MenuSeparator`, `MenuGroup`, `MenuGroupLabel`, `MenuRadioGroup`, `MenuRadioItem`,
  `MenuRadioItemIndicator`.
- **`components/shared/ThemeMenu.tsx`** (new; **replaces** `ThemeToggle.tsx`) — the Theme & Accent dropdown.
- **`components/shared/DisplayMenu.tsx`** (new; **replaces** `FontSizeToggle.tsx`) — the size + numeral-font dropdown.
- **`components/run-view/CountdownDisplay.tsx`** — add the `numeralFont` prop + font-family mapping.
- **`components/run-view/RunView.tsx`** — add the background element; use `ThemeMenu` + `DisplayMenu`; pass
  `numeralFont`.
- **`components/timer-list/TimerListItem.tsx`** — render the bare mono index (new `index` prop); leave the existing
  `isActive` / "Running" treatment unchanged.
- **`components/timer-list/TimerList.tsx`** — header uses `ThemeMenu`; pass `index` to each `TimerListItem`; the
  existing `isActive` computation is unchanged.
- **`components/shared/DurationInput.tsx`** — restructure to the captioned-box layout (§8.3); value/clamp/`onChange`
  contract unchanged.
- **`components/timer-list/TimerForm.tsx`** — restructure alert settings into card rows with a legend + descriptions,
  the accent-on state, the revealed sub-controls, and the standalone hide-name card (§8.3); fields/submit unchanged.
- **`app/layout.tsx`** — wrap the tree in `AccentProvider` and `TimerNumeralFontProvider` (alongside the existing
  providers); `viewport.themeColor` stays `#4f46e5` (matches the default accent).

## 11. UX Notes

- Both menus must show the **current selection with a non-color-only indicator** (a check/dot beside the label), and the
  accent swatches must carry a text label + `aria-label` so the choice isn't conveyed by color alone.
- Menus open from icon-button triggers with descriptive `aria-label`s; items are keyboard-navigable (Base UI handles
  roving focus and `radio`/`aria-checked` semantics via `RadioGroup`/`RadioItem`).
- Everything respects light/dark (the `--acc-*` mixes adapt automatically) and must work at ≥375px — the menus are
  portalled popups, so they don't affect header layout width.
- The Run-view background is subtle and `pointer-events-none`; it must not reduce countdown contrast in either theme.

## 12. Testing Strategy

Co-located Vitest + RTL (jsdom), per the repo convention.

- **`lib/preferencesSchema.ts`** — each schema accepts its valid values and rejects (throws on `.parse`) garbage / wrong
  type / unknown strings.
- **`contexts/AccentContext.tsx`** — default `'indigo'`; `setAccent` persists to `countdown_accent` and updates state;
  applies `document.documentElement.dataset.accent`; hydrates from storage on mount; an unknown / malformed stored value
  falls back to `'indigo'` (Zod parse); a cross-tab `storage` event with a valid value updates, an invalid one is
  ignored.
- **`hooks/useAccent.ts`** — throws when used outside `AccentProvider` (mirror `useTheme` test).
- **`contexts/TimerNumeralFontContext.tsx`** — default `'mono'`; `setNumeralFont` persists; hydrates; malformed value →
  default (Zod parse); valid cross-tab event applies.
- **`contexts/ThemeContext.tsx`** / **`contexts/TimerFontSizeContext.tsx`** — extend existing tests: a malformed stored
  value now falls back to the default (the newly added Zod `parse`); existing default / set / sync assertions still
  pass.
- **`components/ui/menu.tsx`** — covered indirectly by the two menu tests (no standalone test, matching the existing
  primitive's lack of one).
- **`components/shared/ThemeMenu.tsx`** — trigger renders the icon for the current preference with an `aria-label`;
  opening shows three mode items with the current one indicated; selecting a different mode calls `setTheme`; shows five
  accent items with the current one indicated; selecting one calls `setAccent`.
- **`components/shared/DisplayMenu.tsx`** — opening shows four size items (current indicated) → selecting calls
  `setFontSize`; shows two numeral items (current indicated) → selecting calls `setNumeralFont`.
- **`components/run-view/CountdownDisplay.tsx`** — `numeralFont='sans'` applies `font-sans`; default / `'mono'` applies
  `font-mono`; existing size-class and count-up assertions still pass.
- **`components/timer-list/TimerListItem.tsx`** — renders the zero-padded index from the `index` prop; the existing
  `isActive` / "Running" assertions still pass unchanged.
- **`components/run-view/RunView.tsx`** — renders the background element; renders `ThemeMenu` + `DisplayMenu`; passes
  the numeral font through to `CountdownDisplay`.
- **`components/timer-list/TimerList.tsx`** — header renders `ThemeMenu`; each row receives its index; the existing
  `isActive` wiring still passes.
- **`components/shared/DurationInput.tsx`** — extend existing tests: renders the three captioned boxes ("hours" / "min"
  / "sec"); the value/clamp/`onChange`-to-seconds and blur-normalization assertions still pass; `aria-label`s intact.
- **`components/timer-list/TimerForm.tsx`** — extend existing tests: alert settings render as card rows with their
  description text; toggling a switch on applies the accent-on styling and reveals its sub-control; the hide-name card
  renders; submit still emits the correct `TimerFormValues`.
- **`components/AppShell.integration.test.tsx`** — existing flows (start → run → back) still pass with the menus in
  place.

## 13. Edge Cases

- **Unknown / malformed stored value (any preference)** — the Zod `parse` (§9.2) rejects it and `useLocalStorage` falls
  back to the default, on both the initial read and cross-tab `storage` events; for accent, the unmatched `data-accent`
  also leaves the baked-in indigo tokens in effect (double safety).
- **First load (no stored value)** — defaults render with no flash for accent (indigo baked into `:root`); the theme's
  existing post-mount application flash is unchanged.
- **Cross-tab change** — both prefs use `{ sync: true }`, so changing accent/numeral-font/theme in one tab updates the
  others (the accent effect re-applies `data-accent`).
- **Amber on white** — `#d97706` with white text is the design's choice; acceptable, no per-accent foreground override.
- **A timer running while on the list** — unchanged from today: the active row keeps its "Running" treatment and the
  bare index renders alongside it.
- **Reduced contrast** — the Run-view gradient uses the soft/softer mixes only; verify the countdown remains legible in
  dark mode where surfaces are darker.

## 14. Rollout Notes

- **No new runtime dependencies.** Reuses Tailwind v4, Base UI (`menu.tsx`), `lucide-react`, the existing
  `useLocalStorage` hook, and the already-loaded Geist / Geist Mono fonts.
- **Docs to update (as part of implementation, not now):**
  - `specs/requirements.md` — add a new **§18 Theming & Display Preferences** (Warm visual system, accent palette + the
    new `countdown_accent` key, numeral-font + the `countdown_timer_numeral_font` key, Zod-validated preference reads,
    the two menus replacing the toggles, the form restructure, and the bare-index list rows). Touch §5 (UX) and §8
    (Component Breakdown) where they describe the toggles, the form, and the list row.
  - `CLAUDE.md` — update the architecture notes: a fourth/fifth root context (`AccentProvider`,
    `TimerNumeralFontProvider`), the Warm token system + accent → `--primary` mapping, the `ThemeMenu` / `DisplayMenu`
    replacing `ThemeToggle` / `FontSizeToggle`, the new storage keys in `lib/constants.ts`, and the list-row index.
- **No persisted-data migration** — the two new keys are additive and default cleanly; existing `countdown_theme` /
  `countdown_timer_font_size` / `countdown_timers` are untouched.
