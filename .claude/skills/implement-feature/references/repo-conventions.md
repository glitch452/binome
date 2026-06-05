# Binome repo conventions — patterns to imitate

Read this before writing code so your work blends in. These are the conventions that span multiple files and aren't
obvious from a single example. The running code and tooling configs are the source of truth; if this drifts from them,
trust the code.

## Architecture

- **Client-side SPA.** No backend, no API routes, no server actions in v1. Every interactive component is
  `'use client'`. The App Router exists only for build pipeline + `next/font`.
- **Three React contexts**, provided at the root layout, each with a matching consumer hook:
  - `TimerStoreContext` (`contexts/TimerStoreContext.tsx`) + `hooks/useTimerStore.ts` — the `TimerConfig[]` library +
    CRUD; persisted to `localStorage` key `countdown_timers`.
  - `ActiveTimerContext` (`contexts/ActiveTimerContext.tsx`) — runtime state of the one running timer (`status`,
    `remainingSeconds`, `elapsedAfterExpiry`); **not persisted**. Its value extends `UseCountdownReturn` (the
    `setInterval`-based `hooks/useCountdown.ts`), and consumers read it directly via `useContext(ActiveTimerContext)` —
    there is no separate `useActiveTimer` hook.
  - `ThemeContext` (`contexts/ThemeContext.tsx`) + `hooks/useTheme.ts` — `'light' | 'dark' | 'system'`, persisted to
    `countdown_theme`, applied by toggling the `dark` class on `<html>`.
- **The split to copy:** for the store and theme, the context object lives in `contexts/*Context.tsx` and the thin
  consumer hook in `hooks/use*.ts` (`useTimerStore.ts`, `useTheme.ts`). Some contexts (ActiveTimer) are read directly
  with `useContext` instead — check the neighbouring code for which pattern the area you're extending uses, rather than
  assuming.
- **No routing.** `AppShell` switches between the list view and the run view via state, not URLs.
- **A running timer survives navigation** because execution state lives in context, not in the run view component. Don't
  put timer runtime state inside a view component.

## Files & layout

- No `src/`. Code is top-level: `app/`, `components/`, `contexts/`, `hooks/`, `lib/`, `types/`.
- All shared types live in `types/timer.ts` (`TimerConfig`, `SoundId`, `TimerStatus`, `ActiveTimerState`,
  `ThemePreference`). Add new shared types there.
- `lib/` holds `constants.ts`, `time.ts` (duration format/parse), `timerSchema.ts` (Zod), `importExport.ts`,
  `download.ts`, `build-info.ts`, and the `cn` util.

## State & persistence

- State is React `useState`/`useReducer`/`useContext` only — **no external state library**.
- Persistence goes through the generic typed `useLocalStorage` hook. Don't hand-roll `localStorage.getItem`/`setItem` in
  feature code.

## Validation

- Timer validation lives in `lib/timerSchema.ts` (Zod v4). `parseTimerList` is **lenient** — it drops invalid timers and
  keeps the rest. Reuse it; never duplicate timer-shape validation.
- Zod v4 note: `.loose()` replaces `.passthrough()` for tolerating unknown keys (see `lib/importExport.ts`).

## UI

- shadcn/ui primitives built on **Base UI** (`@base-ui/react`), `lucide-react` icons, `tw-animate-css`. Boolean settings
  render as `Switch` toggles, not checkboxes.
- Tailwind v4, `darkMode: 'class'`. Every surface (components, flash overlay, count-up display) must respect the active
  color scheme — never hardcode a single-theme color.
- Layout must work at ≥375px wide; the run-view display scales with the viewport via fluid typography (`clamp`/Tailwind
  responsive variants).
- Destructive actions (Delete) open a confirmation `Dialog` first.

## Audio

- Built-in sounds (≤5) live in `/public/sounds/`. `SoundId` ∈ `'bell' | 'beep' | 'chime' | 'buzzer' | 'ding'`.
- Playback uses the Web Audio API (`AudioContext`), **primed inside the start-action user gesture** to dodge autoplay
  policy. Don't rely on bare `<audio>.play()` outside a gesture.

## Style & commits

- Prettier: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`.
- TypeScript strict, with `@total-typescript/ts-reset` active (`reset.d.ts`) — e.g. `.filter(Boolean)` narrows,
  `JSON.parse` returns `unknown`. Lean into that rather than casting.
- Tests co-located as `*.test.ts(x)`, Vitest + RTL (jsdom).
- Any `eslint-disable` needs a justification comment on the same line.
- If you do commit (you generally won't — this skill leaves work uncommitted), commits are Conventional Commits with a
  sentence-case subject (commitlint enforced).
