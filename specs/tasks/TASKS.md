# Binome — Implementation Task List

Derived from `specs/requirements.md`. Tasks are ordered so each builds on the previous. Each is intended to be small,
independently testable, and references the specific files it touches. Check off (`[x]`) as completed.

Convention: every task that produces logic should land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom). Tasks
marked **(no unit test)** are config/scaffolding where a build/lint/typecheck run is the verification.

---

## Phase 1 — Project Scaffolding & Tooling

- [x] **T-01** Initialize Next.js 15 (App Router) + React 19 + TypeScript (strict) project. Create `package.json`,
      `tsconfig.json` (`strict: true`), `next.config.ts` with `output: 'standalone'`. **Verify:** `npm run dev` serves a
      page. **(no unit test)**
- [x] **T-02** Add package scripts per §10.8 to `package.json`: `dev`, `build`, `start`, `test`, `test:watch`,
      `test:coverage`, `format`, `format:check`, `typecheck`, `lint`, `lint:fix`, `prepare`. **Verify:** each script is
      runnable. **(no unit test)**
- [x] **T-03** Configure Tailwind CSS v4 with `darkMode: 'class'`. Add global stylesheet (`app/globals.css`) and
      Tailwind setup. **Verify:** a utility class renders. **(no unit test)**
- [x] **T-04** Initialize shadcn/ui (components config, `lib/utils.ts` with `cn` helper). Install base primitives to be
      used later: Button, Input, Sheet, Checkbox/Switch, Select, Label. **(no unit test)**
- [x] **T-05** Configure ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-spartan`, type-aware rules
      via `@typescript-eslint/parser` with `projectService: true`. **Verify:** `npm run lint` passes. **(no unit test)**
- [x] **T-06** Configure Prettier (`prettier.config.mjs`): `singleQuote: true`, `semi: true`, `printWidth: 100`,
      `trailingComma: 'all'`; integrate `eslint-config-prettier`. **Verify:** `npm run format:check`. **(no unit test)**
- [x] **T-07** Configure Vitest (`vitest.config.ts`, env `jsdom`), setup file `vitest.setup.ts` importing
      `@testing-library/jest-dom`, and `@vitest/coverage-v8`. Add one trivial passing smoke test. **Verify:**
      `npm run test`. **(no unit test for the config itself)**
- [x] **T-08** Configure Wallaby (`wallaby.mjs`) pointing at `vitest.config.ts`. **(no unit test)**
- [x] **T-09** Set up Husky + lint-staged + commitlint. Add `commitlint.config.mjs` (`@commitlint/config-conventional`,
      types: `feat,fix,chore,docs,refactor,test,style,ci`), lint-staged rules per §10.3, Husky `pre-commit` and
      `commit-msg` hooks. **(no unit test)**
- [x] **T-10** Add Renovate config (`renovate.json`) with presets `github>glitch452/renovate-config` and
      `github>glitch452/renovate-config//presets/npm`, weekly Monday schedule, pin devDeps / range deps, separate PR per
      major. **(no unit test)**

## Phase 2 — Identity, Assets & Fonts

- [x] **T-11** Create the logo SVG at `public/logo.svg` (512×512 viewBox) exactly per §1.1: indigo background, white
      body ring, eye socket, iris, clock hands, centre dot, two feet. **Verify:** renders legibly at 16×16.
- [x] **T-12** Generate `public/favicon.ico` (32×32) and `public/apple-touch-icon.png` (180×180, solid `#4F46E5`
      background) from the logo. **(no unit test)**
- [x] **T-13** Configure `next/font` in `app/layout.tsx`: Geist Sans (body), Geist Mono (countdown display). Set page
      metadata: `<title>` "Binome", description "A countdown timer application. Every second counts.", icon links. **(no
      unit test)**
- [x] **T-14** Add built-in alert sound assets to `public/sounds/` (≤5): `bell`, `beep`, `chime`, `buzzer`, `ding`.
      **(no unit test)**

## Phase 3 — Types & Constants

- [x] **T-15** Define data model types in `types/timer.ts`: `TimerConfig`, `SoundId`, `TimerStatus`, `ActiveTimerState`,
      `ThemePreference` per §7. **Verify:** `npm run typecheck`.
- [x] **T-16** Define constants in `lib/constants.ts`: localStorage keys (`countdown_timers`, `countdown_theme`),
      `SOUND_IDS` array, sound file paths, max name length (64), flash params (2 Hz, 3 s). Co-locate
      `lib/constants.test.ts`.
- [x] **T-17** Add duration formatting/parsing utilities in `lib/time.ts`: `formatDuration(seconds)` → `MM:SS` or
      `HH:MM:SS`, `secondsToHMS` / `hmsToSeconds`. Co-locate `lib/time.test.ts` covering 0, <1h, ≥1h, count-up `+`
      prefix formatting.

## Phase 4 — Generic Hooks

- [x] **T-18** Implement `hooks/useLocalStorage.ts` — generic typed get/set with JSON serialization, SSR-safe (no
      `window` on server), cross-tab sync optional. Co-locate `hooks/useLocalStorage.test.ts` (read default,
      write+persist, parse existing value).
- [x] **T-19** Implement `hooks/useMediaQuery.ts` — reactive wrapper around `window.matchMedia`. Co-locate
      `hooks/useMediaQuery.test.ts` (mock `matchMedia`, reacts to change events).

## Phase 5 — Theme

- [x] **T-20** Create `ThemeContext` + provider in `contexts/ThemeContext.tsx`: stores `'light'|'dark'|'system'` via
      `useLocalStorage` (`countdown_theme`), resolves to concrete theme using
      `useMediaQuery('(prefers-color-scheme: dark)')`, defaults to `'system'`. Co-locate test (default system, explicit
      choice precedence — FR-16/FR-18).
- [x] **T-21** Implement `hooks/useTheme.ts` exposing `{ preference, resolvedTheme, setTheme }`; side-effect toggles
      `dark` class on `<html>` when resolved theme changes (§6.5, FR-19). Co-locate test asserting class is
      applied/removed.
- [x] **T-22** Implement `components/shared/ThemeToggle.tsx` — icon button cycling `light → dark → system`, renders
      sun/moon/monitor icon, has `aria-label`, keyboard-accessible (§12). Co-locate test (cycle order, icon,
      aria-label).

## Phase 6 — Timer Store

- [x] **T-23** Create `TimerStoreContext` + provider in `contexts/TimerStoreContext.tsx`, persisting `TimerConfig[]` to
      `localStorage` key `countdown_timers` (FR-04). Co-locate test for initial load/hydration.
- [x] **T-24** Implement `hooks/useTimerStore.ts` CRUD: `addTimer` (UUID v4, `createdAt`/`updatedAt`), `updateTimer`
      (bumps `updatedAt`), `deleteTimer`, `getTimer`. Enforce name ≤64 and `durationSeconds > 0` (FR-01/02/03/05).
      Co-locate `hooks/useTimerStore.test.ts` covering each operation + validation.

## Phase 7 — Countdown Engine

- [x] **T-25** Implement `hooks/useCountdown.ts` — `setInterval`-based 1 Hz tick producing `ActiveTimerState` (`status`,
      `remainingSeconds`, `elapsedAfterExpiry`); start/pause/resume/reset transitions; expiry detection at 0 → `expired`
      (FR-06–FR-11, FR-15). Co-locate test with fake timers: ticks down, pause halts, resume continues, reset restores
      duration.
- [x] **T-26** Extend `useCountdown` count-up behavior: after expiry, when `countUp` enabled, `elapsedAfterExpiry`
      increments; when disabled, freezes at 0 (FR-14/FR-15). Add tests for both branches.
- [x] **T-27** Create `ActiveTimerContext` + provider in `contexts/ActiveTimerContext.tsx` wrapping `useCountdown`;
      runtime-only, **not persisted**; exposes active config id + controls. Timer keeps running across view switches
      (FR-10). Co-locate test.

## Phase 8 — Audio & Flash

- [x] **T-28** Implement `hooks/useAudio.ts` — `AudioContext` management primed within a user gesture, `play(soundId)`
      plays the clip once and can be re-triggered (FR-13, §6.4). Co-locate test mocking `AudioContext` (context created
      on gesture, `play` triggers buffer source).
- [x] **T-29** Implement `hooks/useFlash.ts` — triggers a flash state alternating at 2 Hz for 3 s then stops (FR-12).
      Co-locate test with fake timers (becomes active on trigger, clears after 3 s).
- [x] **T-30** Implement `components/run-view/FlashOverlay.tsx` (`active: boolean`) — full-viewport overlay, CSS
      animation, respects color scheme (FR-12/FR-19). Co-locate test (renders/animates only when `active`).

## Phase 9 — Shared Form Components

- [ ] **T-31** Implement `components/shared/DurationInput.tsx` (`value` seconds, `onChange`, `disabled?`) — HH/MM/SS
      three-field input converting to/from total seconds (§5.2). Co-locate test (renders fields from seconds, emits
      correct total on edit, clamps).
- [ ] **T-32** Implement `components/shared/SoundSelector.tsx` (`value`, `onChange`, `disabled?`) — dropdown of
      `SoundId`s (§8.2). Co-locate test (lists all sounds, fires onChange).

## Phase 10 — Timer List View

- [ ] **T-33** Implement `components/timer-list/TimerForm.tsx` (`initialValues?`, `onSubmit`, `onCancel`) — fields name,
      duration (DurationInput), flash, sound (reveals SoundSelector when enabled), countUp; validation: name required,
      duration > 0, submit disabled until valid (§5.2, FR-01/05). Co-locate test (validation gating, sound selector
      reveal, submit payload).
- [ ] **T-34** Implement `components/timer-list/TimerFormSheet.tsx` (`open`, `onOpenChange`, `timer?`) — shadcn Sheet
      wrapping TimerForm; create mode when `timer` undefined, edit mode otherwise; wires submit to store CRUD. Co-locate
      test (create vs edit prefill).
- [ ] **T-35** Implement `components/timer-list/TimerListItem.tsx` (`timer`, `isActive`, `onEdit`, `onDelete`,
      `onStart`) — row showing name + formatted duration + Edit/Delete/Start buttons (§5.1). Co-locate test (renders
      fields, fires each callback).
- [ ] **T-36** Implement `components/timer-list/TimerList.tsx` — reads `TimerStoreContext`, renders header (app name,
      "New Timer", ThemeToggle), list of `TimerListItem`s, and empty state when none (§5.1). Wires New Timer + Edit to
      TimerFormSheet, Delete to store, Start to ActiveTimerContext. Co-locate test (empty state, populated list,
      new-timer opens sheet).

## Phase 11 — Run View

- [ ] **T-37** Implement `components/run-view/CountdownDisplay.tsx` (`remainingSeconds`, `elapsedAfterExpiry`, `status`,
      `countUp`) — large fluid (`clamp`) formatted time; paused state styling; post-expiry count-up with `+` prefix in
      distinct (red) style; freeze at `00:00` when countUp off (FR-08/14/15, §5.3). Co-locate test (formats, paused, `+`
      count-up, frozen).
- [ ] **T-38** Implement `components/run-view/TimerControls.tsx` (`status`, `onPause`, `onResume`, `onReset`, `onBack`)
      — shows Pause/Resume per status, Reset, Back to List (§5.1, FR-08/09/10). Co-locate test (correct button per
      status, callbacks).
- [ ] **T-39** Implement `components/run-view/RunView.tsx` — reads `ActiveTimerContext` + `TimerStoreContext`;
      full-height layout with timer name, CountdownDisplay, TimerControls, FlashOverlay, corner ThemeToggle; on expiry
      fires enabled alerts together via useAudio/useFlash (FR-06/11/12/13). Co-locate test (renders active timer, alerts
      fire on expiry).

## Phase 12 — App Shell & Root Wiring

- [ ] **T-40** Implement `components/AppShell.tsx` — reads `ActiveTimerContext`, renders `RunView` when a timer is
      active else `TimerList`; no URL routing (§6.2, §8). Co-locate test (switches view based on active state).
- [ ] **T-41** Wire root: `app/layout.tsx` mounts `ThemeProvider`, `TimerStoreProvider`, `ActiveTimerProvider` (in
      order) + fonts; `app/page.tsx` renders `<AppShell />`. Mark interactive components `'use client'` (§6.2/6.3).
      **Verify:** `npm run dev` end-to-end smoke. **(no unit test)**

## Phase 13 — Integration & Cross-Cutting

- [ ] **T-42** Integration test: create timer → start → tick → expiry alerts → reset → back to list, asserting timer
      survives view switch (FR-10). Place in `components/AppShell.integration.test.tsx`.
- [ ] **T-43** Responsiveness pass: verify layout usable at ≥375px; run-view display scales with viewport via
      `clamp`/Tailwind variants (§5.3). **Verify:** manual/visual. **(no unit test)**
- [ ] **T-44** Accessibility baseline: semantic HTML, keyboard nav, `aria-label` on theme toggle and icon-only buttons
      (§12). Co-locate assertions where component tests exist.

## Phase 14 — Docker Deployment

- [ ] **T-45** Write multi-stage `Dockerfile` (`deps`, `builder`, `runner` on `node:24-alpine`); runner copies only
      `.next/standalone` + `public/`; honors `PORT` (3000) and `HOSTNAME` (0.0.0.0) (§11). **Verify:**
      `docker build -t countdown .`. **(no unit test)**
- [ ] **T-46** Add `docker-compose.yml` mapping `3000:3000`, `restart: unless-stopped` (§11.3). **Verify:**
      `docker compose up` serves the app. **(no unit test)**

## Phase 15 — Final Verification

- [ ] **T-47** Run full quality gate: `npm run typecheck`, `npm run lint`, `npm run format:check`,
      `npm run test -- --coverage`, `npm run build`. All pass. **(no unit test)**
