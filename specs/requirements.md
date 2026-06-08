# Binome — Combined Specification

## Table of Contents

1. [Product Overview](#1-product-overview)
   - 1.1 [Project Identity](#11-project-identity)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [UX & Interaction Design](#5-ux--interaction-design)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [Component Breakdown](#8-component-breakdown)
9. [API Routes](#9-api-routes)
10. [Tooling & Configuration](#10-tooling--configuration)
    - 10.8 [Package Scripts](#108-package-scripts)
    - 10.9 [GitHub Actions](#109-github-actions)
11. [Docker Deployment](#11-docker-deployment)
12. [Versioning & Releases](#12-versioning--releases)
13. [Out of Scope](#13-out-of-scope)
14. [Import / Export](#14-import--export)
15. [Update Check](#15-update-check)
16. [Progressive Web App (Offline & Install)](#16-progressive-web-app-offline--install)
17. [Browser Notifications](#17-browser-notifications)
18. [Theming & Display Preferences](#18-theming--display-preferences)

---

## 1. Product Overview

**Binome** is a single-user, browser-based countdown timer application. Users define a library of named timers, select
one to run, and receive configurable alerts (visual flash, audio sound, elapsed count-up) when time expires.

The app is a static Next.js single-page application served from a Docker container. All timer configuration is persisted
in the browser (`localStorage`); there is no backend database.

The name is a nod to the Binomes — the small, single-eyed binary citizens of Mainframe from the 1994 animated series
_ReBoot_.

### 1.1 Project Identity

| Field            | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| App name         | Binome                                                                                       |
| Page `<title>`   | Binome                                                                                       |
| Meta description | A countdown timer application. Every second counts.                                          |
| Favicon          | SVG logo (see below), exported as `favicon.ico` (32×32) and `apple-touch-icon.png` (180×180) |
| `next/font`      | Geist Sans (body), Geist Mono (countdown display)                                            |

#### Logo

The logo is an SVG inspired by the Zero-type Binome from _ReBoot_ — a round, one-eyed digital creature — reinterpreted
as a countdown timer face. It must be legible at 16×16px.

**SVG specification (`public/logo.svg`, 512×512 viewBox):**

- **Background:** rounded square, corner radius 96, fill `#4F46E5` (indigo-600).
- **Body ring:** white circle centred at (256, 270), radius 160 — the Binome's round body outline, stroke-only (stroke
  white, width 18, no fill).
- **Eye socket:** filled circle centred at (256, 240), radius 88, fill `#1E1B4B` (indigo-950).
- **Iris:** filled circle centred at (256, 240), radius 54, fill `#6366F1` (indigo-500).
- **Clock face (inside iris):**
  - Minute hand: line from (256, 240) to (256, 195) — 12 o'clock, stroke white, stroke-width 7, stroke-linecap round.
  - Hour hand: line from (256, 240) to (291, 260) — ~4 o'clock, stroke white, stroke-width 9, stroke-linecap round.
  - Centre dot: filled circle at (256, 240), radius 7, fill white.
- **Feet:** two small rounded rectangles (width 28, height 36, radius 8, fill white) positioned symmetrically below the
  body at approximately (210, 425) and (302, 425).

The same SVG is used as the Next.js `<link rel="icon">` source. The `apple-touch-icon.png` is the SVG rasterised at
180×180 with a solid `#4F46E5` background.

---

## 2. Goals & Non-Goals

### Goals

- Allow users to create, edit, and delete multiple named countdown timers.
- Allow users to select any saved timer and run it.
- Alert the user when a timer expires via configurable mechanisms: screen flash, audio sound, and/or count-up display.
- Persist timer configurations across page reloads without requiring a login.
- Be deployable as a self-contained Docker image.
- Support dark mode with a manual toggle that defaults to the user's OS preference.

### Non-Goals

- Multi-user support or authentication.
- Server-side timer state (timers run entirely in the browser).
- A mobile-native app (basic responsiveness is expected, but it is not a mobile-first product). _Note:_ installable-PWA
  and offline support **was** subsequently added — see §16.
- Custom audio upload (a built-in set of alert sounds is sufficient for v1).

---

## 3. User Stories

| ID    | As a… | I want to…                                           | So that…                                                |
| ----- | ----- | ---------------------------------------------------- | ------------------------------------------------------- |
| US-01 | User  | Create a named timer with a duration                 | I can save timers I use repeatedly                      |
| US-02 | User  | Edit or delete an existing timer                     | I can keep my timer list current                        |
| US-03 | User  | Select a timer from my list and start it             | I can run a countdown with one click                    |
| US-04 | User  | Pause and resume a running timer                     | I can handle interruptions                              |
| US-05 | User  | Reset a running or expired timer                     | I can restart without navigating away                   |
| US-06 | User  | Configure whether the screen flashes on expiry       | I can choose a visual alert that suits my environment   |
| US-07 | User  | Configure whether a sound plays on expiry            | I can choose an audio alert that suits my environment   |
| US-08 | User  | Configure whether the display counts up after expiry | I can see how long ago the timer expired                |
| US-09 | User  | Have per-timer alert settings                        | Different timers can have different alert behaviours    |
| US-10 | User  | Toggle between light and dark mode                   | I can use the app comfortably in any lighting condition |

---

## 4. Functional Requirements

### 4.1 Timer Management

- **FR-01** Users can create a timer with: name (required, max 64 chars), duration (required, HH:MM:SS).
- **FR-02** Users can edit the name and duration of any saved timer.
- **FR-03** Users can delete any saved timer, confirming first in a confirmation dialog. Deleting a timer that is
  currently active stops it first.
- **FR-04** Timer configurations are stored in `localStorage` and survive page reload. Changes are synchronised across
  all open tabs/windows in real time via the `storage` event (`sync: true` on `useLocalStorage`).
- **FR-05** Per-timer settings include: `flashOnExpiry` (boolean), `soundOnExpiry` (boolean), `soundChoice` (enum of
  built-in sounds), `soundRepeat` (integer 1–5, number of times to repeat the alert sound), `countUpAfterExpiry`
  (boolean), and `hideName` (boolean — hides the timer name on the run view).

### 4.2 Timer Execution

- **FR-06** Starting a timer transitions the UI to a full-screen run view showing the remaining time (MM:SS or HH:MM:SS
  as appropriate).
- **FR-07** The timer ticks every second using `setInterval`.
- **FR-08** Users can pause and resume the timer. The display shows a clear paused state.
- **FR-09** Users can reset the timer (returns to the original duration, stopped).
- **FR-10** Users can navigate back to the timer list without losing the running timer; returning to the run view
  resumes the visual state (timer continues in background).

### 4.3 Expiry Behaviour

- **FR-11** When the timer reaches 00:00: all enabled alert actions fire simultaneously.
- **FR-12** Flash: the viewport background alternates between the normal background and a high-contrast alert colour at
  2 Hz for 3 seconds, then stops.
- **FR-13** Sound: the selected audio clip plays at expiry, repeated `soundRepeat` times (1–5) with 500 ms between each
  play. The user can re-trigger a single play manually.
- **FR-14** Count-up: after expiry the display continues counting upward from 00:00 (prefixed with `+`), styled
  distinctly (e.g. red text).
- **FR-15** If count-up is disabled, the display freezes at 00:00 on expiry.

### 4.4 Dark Mode

- **FR-16** On first load, the colour scheme defaults to the user's OS preference via the `prefers-color-scheme` media
  query.
- **FR-17** A toggle in the header allows the user to switch between light and dark mode at any time.
- **FR-18** The user's explicit choice is persisted in `localStorage` and takes precedence over the OS preference on
  subsequent visits.
- **FR-19** All UI surfaces — including shadcn/ui components, the flash overlay, and the count-up display — must respect
  the active colour scheme.

---

## 5. UX & Interaction Design

### 5.1 Pages / Views

The app has two primary views rendered client-side (no page navigation):

**Timer List View** (default)

- Sticky header containing the `Brand` chip (inline SVG logo + "Binome" wordmark + subtitle), a "New Timer" button, and
  a **Theme & Accent** dropdown (`ThemeMenu` — Light/Dark/System + 5 accent colour swatches). The header stays pinned to
  the top as the content scrolls.
- Page content is width-limited (centred max-width column) for readability.
- List of saved timers, each showing: a monospace zero-padded 1-based index (`01`, `02`, …), name, duration, small icons
  for any enabled alert settings (flash, sound, count-up), and action buttons (Edit, Copy, Delete, Start). The Start
  button is disabled while that timer is the active one.
- Deleting a timer opens a confirmation dialog before removal.
- Empty state message when no timers exist.

**Run View**

- Large countdown display, centred, full-height.
- Timer name shown above the countdown (unless the timer's `hideName` setting is enabled).
- Controls below: Pause/Resume, Reset, Back to List.
- Toolbar contains a **Theme & Accent** dropdown (`ThemeMenu`) and a **Display** dropdown (`DisplayMenu` — font size
  sm/md/lg/xl + numeral font Mono/Sans).
- Accent-tinted gradient background applied behind the run view content.
- Expiry indicators (flash overlay, count-up display) rendered in this view.

### 5.2 Timer Form (Create / Edit)

Fields (boolean settings are rendered as toggle switches):

- Name (text input, label styled to match fieldset legend)
- Duration (three captioned boxes — equal-width `font-mono` tall inputs with "hours" / "minutes" / "seconds" captions
  below; accent focus ring)
- **Alerts** `<fieldset>`: each alert is a bordered card row (icon + bold title + muted description + trailing Switch)
  that applies an accent highlight when active:
  - Flash on expiry
  - Sound on expiry (reveals sound selector + "Preview sound" subrow when enabled)
  - Count up after expiry
  - System notification on expiry (reveals "When to notify" mode selector subrow when enabled)
- **Other Settings** `<fieldset>`:
  - Hide timer name on timer page (switch)

Validation:

- Name is required.
- Duration must be > 0.
- Form submit is disabled until valid.

### 5.3 Responsiveness

The layout must be usable on screens ≥ 375px wide. The run view large display should scale with viewport using fluid
typography (`clamp` or Tailwind responsive variants).

---

## 6. Technical Architecture

### 6.1 Stack

| Concern              | Technology                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| Framework            | Next.js 16 (App Router)                                                |
| Language             | TypeScript (strict mode)                                               |
| UI Library           | React 19                                                               |
| Styling              | Tailwind CSS v4 (+ `tw-animate-css`)                                   |
| Component Primitives | shadcn/ui on Base UI (`@base-ui/react`); `lucide-react` icons          |
| State Management     | React `useState` / `useReducer` + `useContext` (no external state lib) |
| Persistence          | `localStorage` via a custom hook                                       |
| Testing              | Vitest 4 + React Testing Library                                       |
| Test Runner (IDE)    | Wallaby                                                                |
| Linting              | ESLint 9 (flat config) + `eslint-config-spartan`                       |
| Formatting           | Prettier (+ `prettier-plugin-tailwindcss`)                             |
| Git Hooks            | Husky + lint-staged + commitlint                                       |
| Type Safety          | TypeScript (strict) + `@total-typescript/ts-reset`                     |
| CI/CD                | GitHub Actions (PR checks + Docker/GHCR release via semantic-release)  |
| Dependency Updates   | Renovate                                                               |
| Deployment           | Docker (Node 24 Alpine base)                                           |

### 6.2 Rendering Strategy

The entire app is a **client-side single-page application**. The Next.js App Router is used purely for its project
conventions, build pipeline (Turbopack), and `next/font`. All interactive components are `'use client'`. No server
actions or API routes are needed for v1.

The Docker container runs the standalone server (`node server.js`, via `output: 'standalone'`) serving the production
build. `next start` is used only for serving the build locally during development.

### 6.3 State Architecture

```
TimerStoreContext         — CRUD operations and list of TimerConfig[]
  └─ persisted to localStorage via useLocalStorage hook (sync: true — updates propagate across tabs)

ActiveTimerContext        — currently running timer state (elapsed, status)
  └─ driven by useCountdown hook (setInterval-based)

ThemeContext              — 'light' | 'dark' | 'system', resolved to 'light' | 'dark'
  └─ persisted to localStorage; initialized from prefers-color-scheme on first visit

TimerFontSizeContext      — 'sm' | 'md' | 'lg' | 'xl' (countdown display size, default 'md')
  └─ persisted to countdown_timer_font_size

AccentContext             — 'indigo' | 'amber' | 'teal' | 'rose' | 'green' (default 'indigo')
  └─ persisted to countdown_accent; applies data-accent to <html>

TimerNumeralFontContext   — 'mono' | 'sans' (countdown numeral font, default 'mono')
  └─ persisted to countdown_timer_numeral_font
```

Contexts are provided at the root layout. Components subscribe only to what they need.

### 6.4 Audio

A small set of built-in alert sounds (≤ 5) are included as static assets (`/public/sounds/`). Playback uses the Web
Audio API (`AudioContext`) to avoid autoplay policy issues — audio is triggered from within a user gesture handler (the
start action primes the context).

### 6.5 Dark Mode Implementation

Tailwind's `darkMode: 'class'` strategy is used. `ThemeContext` applies or removes the `dark` class on `<html>` whenever
the resolved theme changes. A `useMediaQuery('(prefers-color-scheme: dark)')` hook feeds the system default. The stored
preference (`'light'`, `'dark'`, or `'system'`) is read on mount; if absent, `'system'` is assumed.

---

## 7. Data Models

### 7.1 `TimerConfig`

```typescript
interface TimerConfig {
  id: string; // UUID v4, generated on creation
  name: string; // display name, max 64 chars
  durationSeconds: number; // total seconds, must be > 0
  flash: boolean; // flash screen on expiry
  sound: boolean; // play sound on expiry
  soundId: SoundId | null; // which sound (null when sound is false)
  soundRepeat: number; // times to repeat the alert sound (1–5, default 1)
  countUp: boolean; // count up after expiry
  hideName: boolean; // hide the timer name on the run view
  notify: boolean; // send a system notification on expiry (default: false)
  notifyMode: NotifyMode; // 'always' | 'hidden' — when to fire the notification
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

type SoundId = 'bell' | 'beep' | 'chime' | 'buzzer' | 'ding';
type NotifyMode = 'always' | 'hidden';
```

### 7.2 `ActiveTimerState`

Runtime-only (not persisted):

```typescript
type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

interface ActiveTimerState {
  configId: string | null;
  status: TimerStatus;
  remainingSeconds: number;
  elapsedAfterExpiry: number; // seconds counted up after expiry
}
```

### 7.3 `ThemePreference`

```typescript
type ThemePreference = 'light' | 'dark' | 'system';
```

### 7.3a Display preference types

```typescript
type TimerFontSize = 'sm' | 'md' | 'lg' | 'xl';
type AccentColor = 'indigo' | 'amber' | 'teal' | 'rose' | 'green';
type TimerNumeralFont = 'mono' | 'sans';
```

All four preference types live in `types/timer.ts`. Zod schemas for all four are in `lib/preferencesSchema.ts`.

### 7.4 localStorage Schema

| Key                            | Value / type                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `countdown_timers`             | `JSON.stringify(TimerConfig[])`                                                                  |
| `countdown_theme`              | `ThemePreference` (`'light'` \| `'dark'` \| `'system'`)                                          |
| `countdown_timer_font_size`    | `TimerFontSize` (`'sm'` \| `'md'` \| `'lg'` \| `'xl'`); default `'md'`                           |
| `countdown_accent`             | `AccentColor` (`'indigo'` \| `'amber'` \| `'teal'` \| `'rose'` \| `'green'`); default `'indigo'` |
| `countdown_timer_numeral_font` | `TimerNumeralFont` (`'mono'` \| `'sans'`); default `'mono'`                                      |

#### Timer list validation on load

When the timer list is read from `localStorage`, every element is validated against a Zod schema (`lib/timerSchema.ts`)
before being used:

- If the stored value is not a JSON array, the list is treated as empty.
- Each array element is parsed individually against `timerConfigSchema`.
  - `name` (non-empty string, ≤64 chars) and `durationSeconds` (positive integer) are required.
  - All other fields (`id`, `flash`, `sound`, `soundId`, `soundRepeat`, `countUp`, `hideName`, `notify`, `notifyMode`,
    `createdAt`, `updatedAt`) are optional; when absent they are filled with the same defaults used for a new timer
    (`id` generates a fresh UUID, booleans default to `false`, `soundId` defaults to `null`, `soundRepeat` defaults to
    `1`, `notify` defaults to `false`, `notifyMode` defaults to `'hidden'`, timestamps default to the current time).
  - If any field is present but carries an invalid value (e.g. a non-boolean `flash`, an unknown `soundId`, a
    `soundRepeat` outside 1–5, or a non-UUID `id`), the **entire timer** is silently dropped; valid siblings are still
    returned.
- This validation is applied via a `parse` option added to the generic `useLocalStorage` hook, keeping the validation
  logic in `lib/timerSchema.ts` and the hook itself reusable.

---

## 8. Component Breakdown

### 8.1 File Tree

There is no `src/` directory — code lives in top-level folders (`app/`, `components/`, `contexts/`, `hooks/`, `lib/`,
`types/`). Every source file is co-located with a `*.test.ts(x)` test (omitted below).

```
app/
  layout.tsx                  — root layout, context providers, fonts, BuildInfoFooter
  page.tsx                    — renders <AppShell />
  globals.css                 — Tailwind v4 entry + theme tokens
  icon.svg                    — app icon

components/
  AppShell.tsx                — switches between ListView and RunView
  ui/                         — generated shadcn primitives (button, input, label, switch,
                                checkbox, select, dialog, sheet, sonner)
  timer-list/
    TimerList.tsx             — list container + empty state + header (Export/Import/New Timer)
    TimerListItem.tsx         — single row: name, duration, alert icons, actions, delete-confirm dialog
    TimerForm.tsx             — create/edit form (used in Sheet)
    TimerFormSheet.tsx        — shadcn Sheet wrapper around TimerForm
    ExportButton.tsx          — downloads the full timer library as binome.json
    ImportButton.tsx          — file-input trigger + parse + opens ImportDialog
    ImportDialog.tsx          — selection dialog: candidate rows, conflict badges, confirm/cancel
  run-view/
    RunView.tsx               — full-height run layout
    CountdownDisplay.tsx      — large formatted time string
    TimerControls.tsx         — Start/Pause/Resume/Reset/Back buttons
    FlashOverlay.tsx          — full-viewport div, CSS animation on expiry
  shared/
    DurationInput.tsx         — captioned-box HH/MM/SS input (three equal-width font-mono tall boxes, captions below)
    SoundSelector.tsx         — dropdown of available sounds
    ThemeMenu.tsx             — Theme & Accent dropdown (Light/Dark/System + 5 accent swatches); used in list header + run toolbar
    DisplayMenu.tsx           — Display dropdown (font size sm/md/lg/xl + numeral font Mono/Sans); run toolbar only
    Brand.tsx                 — logo chip (inline SVG, accent-aware) + wordmark + subtitle
    BuildInfoFooter.tsx       — version footer button that opens the "About Binome" dialog

contexts/
  TimerStoreContext.tsx       — provides the TimerConfig[] list + CRUD, persisted to localStorage
  ActiveTimerContext.tsx      — provides the running timer's runtime state (not persisted)
  ThemeContext.tsx            — provides theme preference + resolved theme, applies the `dark` class
  AccentContext.tsx           — provides accent color preference, applies `data-accent` to <html>
  TimerFontSizeContext.tsx    — provides countdown display font size preference
  TimerNumeralFontContext.tsx — provides countdown numeral font preference

hooks/
  useTimerStore.ts            — consumes TimerStoreContext (CRUD + getTimer + importTimers)
  useCountdown.ts             — setInterval tick logic, expiry detection
  useLocalStorage.ts          — generic typed localStorage hook (supports optional `parse` callback for validation)
  useAudio.ts                 — AudioContext management, prime() + play(soundId)
  useFlash.ts                 — triggers/cancels the flash animation state
  useTheme.ts                 — consumes ThemeContext; exposes resolvedTheme, setTheme
  useAccent.ts                — consumes AccentContext; exposes accent, setAccent
  useTimerFontSize.ts         — consumes TimerFontSizeContext
  useTimerNumeralFont.ts      — consumes TimerNumeralFontContext
  useMediaQuery.ts            — reactive wrapper around window.matchMedia
  useBuildInfo.ts             — fetches/validates /build-info.json, toasts on failure

lib/
  constants.ts                — storage keys, sound ids/paths, name max length, flash constants, accent/font metadata
  time.ts                     — duration formatting/parsing helpers
  build-info.ts               — zod buildInfoSchema + createBuildInfo()
  timerSchema.ts              — zod timerConfigSchema + parseTimerList(); validates localStorage reads
  preferencesSchema.ts        — zod enums for all four preference types (theme, font size, accent, numeral font)
  importExport.ts             — exportFileSchema, buildExportObject, parseImportContent, EXPORT_FILE_NAME
  download.ts                 — downloadJson(): Blob → object-URL anchor click, SSR-safe
  utils.ts                    — cn() class-merge helper

types/
  timer.ts                    — TimerConfig, SoundId, TimerStatus, ActiveTimerState, ThemePreference,
                                TimerFontSize, AccentColor, TimerNumeralFont

scripts/
  generate-build-info.ts      — writes public/build-info.json (prebuild/predev)
```

### 8.2 Component Props Interfaces

Components that read exclusively from context have no props and are noted as such.

#### `AppShell`

No props. Reads `ActiveTimerContext` to determine which view (`TimerList` or `RunView`) to render.

---

#### `TimerList`

No props. Reads `TimerStoreContext` for the list of `TimerConfig` items.

---

#### `TimerListItem`

```typescript
interface TimerListItemProps {
  timer: TimerConfig;
  index?: number; // 0-based position in the list; rendered as a 1-based zero-padded label (default 0)
  isActive?: boolean; // true when this timer is the currently running timer (defaults to false)
  onEdit: (timer: TimerConfig) => void;
  onDelete: (id: string) => void; // called after the user confirms in the delete dialog
  onStart: (id: string) => void;
}
```

---

#### `TimerFormSheet`

```typescript
interface TimerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timer?: TimerConfig; // undefined → create mode; defined → edit mode
}
```

---

#### `TimerForm`

```typescript
interface TimerFormValues {
  name: string;
  durationSeconds: number;
  flash: boolean;
  sound: boolean;
  soundId: SoundId | null;
  countUp: boolean;
  hideName: boolean;
}

interface TimerFormProps {
  initialValues?: Partial<TimerFormValues>;
  onSubmit: (values: TimerFormValues) => void;
  onCancel: () => void;
}
```

---

#### `RunView`

No props. Reads `ActiveTimerContext` and `TimerStoreContext`.

---

#### `CountdownDisplay`

```typescript
interface CountdownDisplayProps {
  remainingSeconds: number;
  elapsedAfterExpiry: number; // seconds elapsed since expiry (0 when not expired)
  status: TimerStatus;
  countUp: boolean; // whether this timer is configured to count up after expiry
  fontSize?: TimerFontSize; // display size class, default 'md'
  numeralFont?: TimerNumeralFont; // font-mono or font-sans, default 'mono'
}
```

---

#### `TimerControls`

```typescript
interface TimerControlsProps {
  status: TimerStatus;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onBack: () => void;
}
```

---

#### `FlashOverlay`

```typescript
interface FlashOverlayProps {
  active: boolean; // true while the flash animation is running
}
```

---

#### `DurationInput`

```typescript
interface DurationInputProps {
  value: number; // total seconds
  onChange: (seconds: number) => void;
  disabled?: boolean;
}
```

---

#### `SoundSelector`

```typescript
interface SoundSelectorProps {
  value: SoundId | null;
  onChange: (soundId: SoundId) => void;
  disabled?: boolean;
}
```

---

#### `ThemeMenu`

No props. Reads `ThemeContext` (via `useTheme`) and `AccentContext` (via `useAccent`). Renders a dropdown with
Light/Dark/System options and 5 accent colour swatches. Used in the Timer List header and the Run View toolbar.

---

#### `DisplayMenu`

No props. Reads `TimerFontSizeContext` (via `useTimerFontSize`) and `TimerNumeralFontContext` (via
`useTimerNumeralFont`). Renders a dropdown for font size (sm/md/lg/xl) and numeral font (Mono/Sans). Run View only.

---

## 9. API Routes

None required for v1. All state is client-side.

---

## 10. Tooling & Configuration

### 10.1 ESLint

- Flat config (`eslint.config.mjs`), ESLint 9, built via `buildConfig` from `eslint-config-spartan`.
- Mixins enabled: `typeEnabled` (type-aware, `projectService: true`), `nextJs`, `react`, `vitest`,
  `testingLibraryReact`, `jsDoc`, `mdx`, `prettier`.
- `@typescript-eslint/no-magic-numbers` is disabled for generated `components/ui/**` files.
- Ignores: `.next/`, `node_modules/`, `coverage/`, `next-env.d.ts`.
- No `eslint-disable` comments permitted without a justification comment on the same line.

### 10.2 Prettier

- `prettier.config.mjs` at project root, with `prettier-plugin-tailwindcss`.
- Integrated with ESLint via the spartan `prettier` mixin (disables conflicting rules).
- Key settings: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`.

### 10.3 lint-staged

Configured in `lint-staged.config.js` and run on `git commit` via a Husky `pre-commit` hook (the `pre-commit` script):

```js
export default {
  '*.{md,mdx,mjs,cjs,js,jsx,cjsx,mjsx,mts,cts,ts,tsx,ctsx,mtsx}': [
    'eslint --cache --report-unused-disable-directives --fix',
    'prettier --ignore-unknown --write',
  ],
  '*.{css,html,json,scss,yaml,yml}': 'prettier --ignore-unknown --write',
  'renovate.json5': [
    'prettier --ignore-unknown --write',
    'npx --yes --package renovate -- renovate-config-validator --strict',
  ],
};
```

### 10.4 commitlint

- Config: `commitlint.config.ts`.
- Extends `@commitlint/config-conventional`.
- Enforced via a Husky `commit-msg` hook.
- Adds a `subject-case` rule: `sentence-case` (plus `lower-case` when `ENV=ci`, to accommodate Renovate bot commits).
- The type list is inherited from `config-conventional` and is not narrowed.

### 10.5 Vitest

- Base config: `vite.config.ts` (uses `@vitejs/plugin-react`, `globals: true`, `@` → project root alias).
- CI config: `vite.config.ci.ts` extends the base with `allowOnly: false`, `github-actions` + `junit` reporters
  (`reports/vitest-junit-report.xml`), and `json`/`json-summary` coverage with `reportOnFailure`.
- Environment: `jsdom`.
- Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`).
- Coverage via `@vitest/coverage-v8`.
- Test files: `**/*.test.ts` / `**/*.test.tsx` co-located with source.

### 10.6 Wallaby

- Config: `wallaby.mjs` (`autoDetect: true`).
- Integrates with Vitest for continuous in-editor test feedback.

### 10.7 Renovate

- Config: `renovate.json5` at project root.
- Presets: `github>glitch452/renovate-config` and `github>glitch452/renovate-config//presets/npm`.
- `schedule: ["* 0-6 * * 1"]` — Monday-morning grouped PRs.
- `typescript` is grouped into its own PR.
- Pin `devDependencies`, range for `dependencies`; separate PR per major version bump (inherited from the presets).

### 10.8 Package Scripts

All scripts are defined in `package.json` under `"scripts"`:

| Script         | Command                                                                      | Purpose                                        |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `predev`       | `tsx scripts/generate-build-info.ts`                                         | Generate `public/build-info.json` before `dev` |
| `dev`          | `next dev --turbopack`                                                       | Start the development server with Turbopack    |
| `prebuild`     | `tsx scripts/generate-build-info.ts`                                         | Generate `public/build-info.json` before build |
| `build`        | `next build`                                                                 | Production build                               |
| `start`        | `next start`                                                                 | Serve the production build locally             |
| `type`         | `tsc --noEmit -p tsconfig.json`                                              | TypeScript type checks (no emit)               |
| `test`         | `vitest run`                                                                 | Run the test suite once                        |
| `test:w`       | `vitest`                                                                     | Run tests in watch mode (development)          |
| `test:ci`      | `vitest run --config vite.config.ci.ts --coverage`                           | CI test run: coverage + JUnit report           |
| `test:snap`    | `vitest run --coverage --update`                                             | Run tests with coverage, updating snapshots    |
| `format`       | `prettier --write .`                                                         | Format all files in place                      |
| `format:ci`    | `prettier --check '**.{...many extensions...}'`                              | Check formatting without writing (CI)          |
| `format:check` | `npm run format:ci`                                                          | Alias of `format:ci`                           |
| `lint`         | `eslint . --max-warnings 0 --cache --report-unused-disable-directives --fix` | Lint all files (cached, auto-fix)              |
| `lint:ci`      | `eslint . --max-warnings 0`                                                  | Lint without fixing (CI; fails on any warning) |
| `lint:nc`      | `eslint . --max-warnings 0 --report-unused-disable-directives --fix`         | Lint + fix, no cache                           |
| `lint:inspect` | `npx @eslint/config-inspector`                                               | Open the ESLint flat-config inspector          |
| `pre-commit`   | `lint-staged`                                                                | Run lint-staged (invoked by the Husky hook)    |
| `prepare`      | `husky`                                                                      | Install Husky hooks (runs after `npm install`) |

### 10.9 GitHub Actions

Two workflows in `.github/workflows/`, both pinned to the Node version in `.nvmrc` (24) and run with `HUSKY=0`,
`ENV=ci`:

- **`pr.yml`** (`on: pull_request`) — checks out enough history to lint the PR commits, then runs, in order: commitlint
  over the PR range, `renovate-config-validator --strict`, `format:ci`, `type`, `lint:ci`, `test:ci`, and `build`.
  Finally publishes a Vitest JUnit report (`dorny/test-reporter`) and a coverage comment
  (`davelosert/vitest-coverage-report-action`). Concurrency-cancels superseded runs.
- **`release.yml`** (`on: push` to `main`) — computes the next semver version from the merged commits (semantic-release
  dry-run), builds and pushes a Docker image to the GitHub Container Registry (`ghcr.io`) tagged `v<version>` /
  `v<major>.<minor>` / `v<major>` / `latest` / `sha-<short>`, passing `BUILD_VERSION`/`GIT_SHA` build-args. It then
  creates the GitHub Release with generated notes and sets/updates the matching git tags. See §12 for the full
  versioning design.

---

## 11. Docker Deployment

### 11.1 Build Strategy

Multi-stage Dockerfile:

| Stage     | Base Image       | Purpose                                      |
| --------- | ---------------- | -------------------------------------------- |
| `deps`    | `node:24-alpine` | Install production-only dependencies (cache) |
| `builder` | `node:24-alpine` | Full install + Next.js production build      |
| `runner`  | `node:24-alpine` | Run the standalone server (`node server.js`) |

The runner stage copies the `.next/standalone` output (enabled via `output: 'standalone'` in `next.config.ts`), plus
`.next/static` and the `public/` directory, then runs `node server.js`. It sets `NODE_ENV=production` and exposes
port 3000. A `.dockerignore` keeps `node_modules`, `.next`, `coverage`, `reports`, `specs`, `.claude`, and markdown
files out of the build context.

The `builder` stage accepts `BUILD_VERSION` and `GIT_SHA` build-args (exported as env) so the in-image `npm run build`
generates `public/build-info.json` with the release version and commit hash (see §12). Because `.dockerignore` excludes
`.git`, these build-args are the only version source inside the image.

### 11.2 Environment Variables

| Variable   | Default      | Purpose                               |
| ---------- | ------------ | ------------------------------------- |
| `PORT`     | `3000`       | Port the standalone server listens on |
| `HOSTNAME` | `0.0.0.0`    | Bind address                          |
| `NODE_ENV` | `production` | Set in the runner stage               |

### 11.3 docker-compose (development reference)

```yaml
services:
  app:
    build: .
    ports:
      - '3000:3000'
    restart: unless-stopped
```

---

## 12. Versioning & Releases

Full design: `specs/features/0001-versioning-and-releases.md`. Task list:
`specs/tasks/0001-versioning-and-releases-tasks.md`.

### 12.1 Source of Truth

The current version is tracked in **GitHub Releases** — the latest release tag (`v<major>.<minor>.<patch>`) is the
current version. No version is committed to `package.json`; semantic-release reads the tags to compute the next version.

### 12.2 Semantic Versioning

The next version is derived automatically from the conventional-commit messages merged to `main` (the PR's commits,
already validated by commitlint), following [SemVer 2.0.0](https://semver.org). Per the
[Conventional Commits](https://www.conventionalcommits.org) recommended type set, **every** type triggers at least a
patch release:

| Commit                                                                                         | Bump  |
| ---------------------------------------------------------------------------------------------- | ----- |
| Any commit with `!` (e.g. `feat!:`) or a `BREAKING CHANGE:` footer                             | major |
| `feat:`                                                                                        | minor |
| `fix:`, `perf:`, `revert:`, `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` | patch |

The only "no release" case is a push whose commits are entirely non-conventional (e.g. a bare merge commit). Release
notes are generated from the same commits (grouped by type) and attached to the GitHub Release.

### 12.3 Tooling — semantic-release

`release.config.mjs` configures **semantic-release** with `@semantic-release/commit-analyzer` (custom `releaseRules`
mapping every type to ≥ patch), `@semantic-release/release-notes-generator`, and `@semantic-release/github` (immutable
`vX.Y.Z` tag + GitHub Release). Both analyzer and notes generator use the `conventionalcommits` preset. The `npm` and
`git` plugins are intentionally omitted — nothing is published to npm and nothing is committed back to the repo. The
release workflow (§10.9) runs a dry-run to resolve the version, builds/pushes the image tagged with it, creates the
release, then updates the rolling tags.

### 12.4 Tags

On each release the following tags are set, as **Docker image tags** (GHCR) and **git tags**:

| Tag           | Example  | Rolling? | Notes                                       |
| ------------- | -------- | -------- | ------------------------------------------- |
| Full version  | `v1.2.3` | No       | Immutable; created by semantic-release      |
| Major.minor   | `v1.2`   | Yes      | Force-moved to the latest release on `main` |
| Major         | `v1`     | Yes      | Force-moved to the latest release on `main` |
| `latest`      | `latest` | Yes      | Points to the current release on `main`     |
| `sha-<short>` | —        | n/a      | Docker only; build traceability             |

> Open assumption: `latest` is treated as both a Docker tag and a rolling git tag. See the feature spec §6.

### 12.5 Build Info (`/build-info.json`)

A `build-info.json` is generated at build time, validated against a **zod** schema, and served statically at
`GET /build-info.json`:

```jsonc
{
  "version": "1.4.0", // semver, no leading "v"
  "commit": "9f1c2ab3d4e5f6...", // full sha
  "commitShort": "9f1c2ab", // first 7 chars
  "releaseUrl": "https://github.com/glitch452/binome/releases/tag/v1.4.0", // null when version is the dev sentinel / a raw SHA
  "releasesUrl": "https://github.com/glitch452/binome/releases", // always present; fallback target when releaseUrl is null
  "buildTime": "2026-05-31T12:00:00.000Z", // ISO 8601
}
```

- The zod `buildInfoSchema` (in `lib/build-info.ts`) is the single source of truth; the `BuildInfo` type is inferred
  from it.
- Generated by `scripts/generate-build-info.ts` (run via `tsx`, sharing the schema + `createBuildInfo` logic), wired to
  the `prebuild`/`predev` npm lifecycle scripts; output is git-ignored.
- Inputs come from environment variables — `BUILD_VERSION`, `GIT_SHA` (passed as Docker build-args in CI),
  `GITHUB_REPOSITORY` — with a local-dev fallback to `git` and `0.0.0-dev`.
- The app reads it via `hooks/useBuildInfo.ts`, which parses it with the schema and raises a **toast** (`sonner`) on a
  fetch or validation failure. A footer (`components/shared/BuildInfoFooter.tsx`) renders `v<version>` as a button; the
  resolved version strips a leading `v` and falls back to `0.0.0` for the dev sentinel / raw SHAs. Clicking the button
  opens an **"About Binome"** dialog showing the app logo, a short description, and a details table listing the version
  (linked to the GitHub Release), the commit (linked to the commit), the repository, and the MIT license.

---

## 13. Out of Scope

The following are explicitly deferred to future iterations:

- User accounts, authentication, or cloud sync.
- Sharing timer configurations via URL or a hosted link (file-based export/import _is_ supported — see §14).
- Custom audio upload.
- Repeating / recurring timers (e.g. interval training).
- Accessibility audit beyond baseline semantic HTML and keyboard nav (the dark mode toggle must still be
  keyboard-accessible and carry an `aria-label`).

---

## 14. Import / Export

Full design: `specs/features/0002-import-export.md`. Task list: `specs/tasks/0002-import-export-tasks.md`.

Users can back up and transfer their timer library as a JSON file, entirely client-side (no backend).

### 14.1 Export

- An **Export** control in the Timer List header downloads the full library as a file named **`binome.json`** (disabled
  when there are no timers).
- The file is a top-level **object** with a `timers` key holding the timer list — leaving room for additional top-level
  keys in future. Each timer matches the persisted `localStorage` shape (validates against `timerConfigSchema`). The
  JSON is pretty-printed.

### 14.2 Import

- An **Import** control lets the user pick a JSON file. Validation runs in stages, each with a distinct `sonner` toast
  on failure: invalid JSON → "not valid JSON"; not an object with a `timers` array → "not a valid Binome export file".
- Valid timers are then parsed with the same **lenient** `parseTimerList` used for the `localStorage` read: malformed
  timers are dropped (and logged) while valid ones are kept. If no valid timers remain, an info toast is shown and
  nothing is imported.
- Import is **never immediate**. The parsed timers are presented in a selection dialog where the user chooses which to
  import. Each row shows the name, duration, and alert-setting icons.
- A timer whose `id` matches an existing timer is flagged **"Overwrites existing"** and is **unchecked by default**, so
  overwriting an existing timer is always an explicit opt-in. Non-conflicting timers are checked by default.
- On confirm, selected timers are merged into the store by `id` (overwrite on match, append otherwise; the imported `id`
  is preserved). If an overwrite targets the currently-running timer, the active timer is reset first. A summary toast
  reports how many were added and overwritten.

---

## 15. Update Check

Full design: `specs/features/0003-update-check.md`. Task list: `specs/tasks/0003-update-check-tasks.md`.

The app periodically polls the deployed `/build-info.json` to detect when a newer release has been installed on the
server, and notifies the user with a dismissible banner in the Timer List view.

### 15.1 Detection

- On mount, `useUpdateCheck` fetches `/build-info.json` and records the `version` string as the baseline in a ref
  (`initialVersion`). A `setInterval` fires every **60 minutes** (`UPDATE_POLL_INTERVAL_MS = 3_600_000 ms`), regardless
  of whether the initial fetch succeeded.
- If the initial fetch failed, `initialVersion` stays `null`. The first successful poll sets the baseline silently (no
  banner); subsequent polls can then detect updates normally.
- An update is flagged when both conditions hold: `releaseUrl !== null` (a properly-tagged release, not a dev build)
  **and** `version !== initialVersion` (the version differs from the baseline captured at page load).
- All fetch and parse errors are silently ignored — no toast, no error state.

### 15.2 Banner

- When an update is detected, a full-width `UpdateBanner` strip appears at the top of the Timer List view above the
  header, inside a shared `sticky top-0 z-10` wrapper. The banner displays: the new version number (`vX.Y.Z`, extracted
  with `SEMVER_RE`, falling back to the raw version string); a **"Release Notes"** link to `update.releaseUrl` (opens in
  a new tab); a **"Refresh"** button (calls `useApplyUpdate()`'s `applyUpdate` — the service-worker skip-waiting
  handshake described in §16.4, falling back to a plain `window.location.reload()` when no SW is active); a dismiss icon
  button.
- The banner does **not** appear in the Run View — it is rendered only inside `TimerList`, which is not shown while the
  Run View is active.

### 15.3 Dismissal

- Dismissal is **per-version**: clicking the dismiss button records the dismissed version in React state
  (`dismissedVersion`). The banner hides for that version but reappears if a subsequent poll detects a still-newer
  tagged release.
- Dismissal state lives in React memory only — it does not survive a page reload (which would load the latest code
  anyway).

---

## 16. Progressive Web App (Offline & Install)

Full design: `specs/features/0004-pwa-offline.md`. Task list: `specs/tasks/0004-pwa-offline-tasks.md`.

A thin delivery layer makes the already-client-side app **installable** and **offline-capable**. It adds a Web App
Manifest, PWA icons, and a build-integrated **service worker** (via [Serwist](https://serwist.pages.dev/)) that
precaches the app shell so a previously-loaded install launches and runs with no network. No timer behavior, data model,
or `localStorage` schema changes.

### 16.1 Manifest & Icons

- `app/manifest.ts` is a Next metadata route served at `/manifest.webmanifest` (the `<link rel="manifest">` is
  auto-injected). It declares `name`/`short_name` `Binome`, `start_url`/`scope` `/`, `display: 'standalone'`,
  `background_color: '#ffffff'`, `theme_color: '#4f46e5'`, and three icons.
- `app/layout.tsx` adds `appleWebApp` metadata and a `viewport` export with `themeColor: '#4f46e5'`.
- Icons live in `public/icons/`: `icon-192.png` and `icon-512.png` (`purpose: any`) plus `maskable-512.png`
  (`purpose: maskable`, full-bleed with the mark scaled to the adaptive-icon safe zone). They are committed PNGs
  generated once from `public/logo.svg`; no icon-generation dependency is added. The existing `apple-touch-icon.png` and
  `favicon.ico` are kept.

### 16.2 Service Worker (Serwist, configurator mode)

- Because `@serwist/next`'s `withSerwistInit` webpack plugin does not run under Next 16's default Turbopack build,
  Serwist is integrated in **configurator mode**: `serwist.config.mjs` (`@serwist/next/config`) is consumed by an
  external `serwist build` step appended to the `build` script (`next build && serwist build serwist.config.mjs`). The
  Next build stays on Turbopack. New deps: `serwist` + `@serwist/next` (runtime) and `@serwist/cli` (dev, build-only) —
  the one deliberate exception to the no-new-deps stance, justified by reliable precaching of Next's content-hashed
  output.
- `app/sw.ts` is the worker source (`skipWaiting: false`, `clientsClaim: true`, `navigationPreload: true`). It precaches
  the document for `/`, Next's hashed JS/CSS, the icons, and the built-in `/sounds/*.wav`.
- The generated `public/sw.js` (+ `.map`, `swe-worker-*.js`) is a build artifact, gitignored and excluded from the
  formatter/linter, mirroring `public/build-info.json`.

### 16.3 Caching strategy

- **Precache** (`self.__SW_MANIFEST`, injected at build): everything required to cold-start the app offline.
- **`/build-info.json` → `NetworkFirst`**: the update poll always prefers the network so a new deploy is detected
  promptly; offline it falls back to the last cached copy (equal to the running version), so no false-positive banner.
  This is the single most important rule — without it the stale precache would defeat the §15 update check.
- **`defaultCache`** (`@serwist/next/worker`): Serwist's curated runtime strategies for Next.js assets, applied after
  the build-info rule.

### 16.4 Update handshake & active-timer safety

- The §15 `/build-info.json` poll remains the update **detection** signal (now network-first). What changes is the
  banner's **Refresh** action: `hooks/useApplyUpdate.ts` exposes `applyUpdate()`, wired
  `AppShell → TimerList → UpdateBanner`. When a service worker is registered it registers a one-time `controlling`
  listener that reloads, then calls `serwist.messageSkipWaiting()` — so Refresh lands on the freshly-activated precache,
  not the stale one. With no SW (dev/unsupported) it falls back to a plain `window.location.reload()`.
- **Active-timer safety:** the worker uses `skipWaiting: false` and the `<SerwistProvider>` sets
  `reloadOnOnline={false}` (its library default is `true`), so the **only** reload path is the user clicking Refresh —
  exactly as before this feature. Reconnecting to the network, a background SW update, or a poll detecting a new version
  never reload on their own, so the in-memory running timer (`ActiveTimerContext`) is never discarded automatically.

### 16.5 Registration & offline behavior

- `app/layout.tsx` wraps the provider tree in
  `<SerwistProvider swUrl="/sw.js" disable={dev} reloadOnOnline={false} cacheOnNavigation>` (from
  `@serwist/next/react`), which registers the worker after load and exposes `useSerwist()`.
- After the first online load, subsequent launches (including the installed standalone app) work fully offline:
  create/edit/run timers, alerts (flash, precached sounds, count-up), theme, font-size, and import/export all function
  as pure client logic over `localStorage`. The footer/About version and update banner read `/build-info.json` via the
  `NetworkFirst` fallback. A device that has **never** loaded the app online cannot start it offline — expected.
- Installation uses the **browser's native** affordance only (no in-app install button); the SW is disabled in
  development to avoid interfering with Turbopack HMR. Docker needs no change — `next build` writes `public/sw.js` and
  the runner stage already copies `public/`.

---

## 17. Browser Notifications

System notifications let users receive expiry alerts even when they are on a different tab or have the app minimised.
The notification is sent by the live page (not a background push); if the tab is fully closed, no notification is sent
(the countdown is also not running).

### 17.1 Per-timer setting

Each `TimerConfig` carries two optional-with-default fields (backward-compatible — existing stored timers receive
`notify: false, notifyMode: 'hidden'` on parse):

| Field        | Type         | Default    | Description                                                                                    |
| ------------ | ------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `notify`     | `boolean`    | `false`    | Send a system notification when this timer expires                                             |
| `notifyMode` | `NotifyMode` | `'hidden'` | `'always'`: fire unconditionally; `'hidden'`: fire only when the app is backgrounded/unfocused |

`'hidden'` mode fires when `document.visibilityState === 'hidden' || !document.hasFocus()`. The setting is exposed in
the timer form as a "System notification on expiry" toggle; when on, a "When to notify" mode selector appears below it.

### 17.2 Reactive permission model

`useNotificationPermission` (mounted in `AppShell`) watches the `timers` array and calls
`Notification.requestPermission()` when **all** hold: (1) the Notification API is supported, (2) permission is still
`'default'`, and (3) at least one stored timer has `notify: true`. A ref guard prevents spamming on every render; the
ref resets after the promise resolves so a later list change (create / import) can retry — useful on Safari/Firefox
where the prompt requires a user gesture. Denied permission is never re-prompted.

### 17.3 Firing

`useExpiryNotification` (also in `AppShell`, always active regardless of which view is shown) detects the `→ expired`
status transition via a `prevStatusRef` and calls `showExpiryNotification(timer)` when the conditions above are met.
Flash and sound fire only inside RunView; notifications fire from AppShell, so they work even when the user is on the
Timer List or a different tab.

### 17.4 Delivery

`lib/notifications.ts` centralises the platform calls:

- Prefers `registration.showNotification()` (service-worker path, required on Android Chrome).
- Falls back to `new Notification()` in a `try/catch` that swallows the illegal-constructor throw on platforms without
  an active worker.
- Notification payload: `tag: 'binome-expiry-<id>'` (coalesces duplicates on re-start), `icon: '/apple-touch-icon.png'`,
  title/body that respects `hideName` (`'Binome' / 'Your timer has finished.'` vs `timer.name / 'Timer finished.'`).
- `app/sw.ts` registers a `notificationclick` handler that focuses an existing app window or opens `/`.

---

## 18. Theming & Display Preferences

Full design: `specs/features/0006-warm-redesign.md`.

### 18.1 Warm visual system

`app/globals.css` uses an oklch-based neutral palette for `:root` and `.dark`, replacing the old gray scale. The border
radius token (`--radius`) is set to `1.125rem`. Warm shadow tokens (`--shadow-warm-sm`, `--shadow-warm`) are registered
in `@theme inline` as `--shadow-sm` / `--shadow`.

### 18.2 Accent color system

Five accent options are supported: `indigo` (default), `amber`, `teal`, `rose`, `green`.

- The active accent is stored in `localStorage` at `countdown_accent` as an `AccentColor` string.
- `AccentContext` reads this preference and applies `data-accent="<color>"` to `<html>` on mount and on change (via an
  effect inside the provider).
- `app/globals.css` defines a full token layer — `--acc`, `--acc-foreground`, `--acc-soft`, `--acc-softer`, `--acc-ring`
  — with default values baked in (preventing a flash on first load) plus `[data-accent='…']` override blocks for each of
  the five accents.
- `@theme inline` registers `--color-acc-*` so Tailwind utilities like `bg-acc-softer`, `ring-acc-ring`, `fill-acc`,
  `fill-acc-soft` are available.
- A `.bg-run-gradient` utility class generates the accent-tinted gradient used in the Run View.
- An unlayered `html { background-color: var(--acc) }` rule colours the elastic-scroll gutter consistently.

### 18.3 Numeral font

The countdown display font (Geist Mono vs Geist Sans) is a user preference stored at `countdown_timer_numeral_font`
(`TimerNumeralFont`: `'mono'` | `'sans'`, default `'mono'`). `TimerNumeralFontContext` provides it;
`useTimerNumeralFont` consumes it; `CountdownDisplay` receives it as `numeralFont?: TimerNumeralFont` and maps it to
`font-mono` / `font-sans`.

### 18.4 Preference validation

All four preference contexts (`ThemeContext`, `TimerFontSizeContext`, `AccentContext`, `TimerNumeralFontContext`) pass a
Zod `.parse` from `lib/preferencesSchema.ts` as the `parse` option of `useLocalStorage`. Any stored value that is not in
the allowed enum falls back to the type default rather than crashing.

### 18.5 ThemeMenu and DisplayMenu

- **`ThemeMenu`** — a single dropdown combining theme selection (Light/Dark/System radio items) with accent selection (5
  colour swatch radio items). Rendered in both the Timer List header and the Run View toolbar. Uses new `menu.tsx`
  primitives: `MenuSeparator`, `MenuGroup`, `MenuGroupLabel`, `MenuRadioGroup`, `MenuRadioItem`,
  `MenuRadioItemIndicator`.
- **`DisplayMenu`** — a dropdown for countdown font size (sm/md/lg/xl radio items) and numeral font (Mono/Sans radio
  items). Run View toolbar only.

### 18.6 Brand component

`components/shared/Brand.tsx` renders the app's identity in the Timer List header: an inline SVG logo chip that uses
`fill-acc` / `fill-acc-soft` so it re-colours with the active accent, plus an `<h1>Binome</h1>` wordmark and an "Every
second counts" subtitle.

### 18.7 List row index

Each `TimerListItem` receives its 0-based map `index` prop and renders a 1-based zero-padded label (`01`, `02`, …) in
`font-mono text-fg-subtle` before the timer name. `bg-card` is added to the row so the run-view gradient does not show
through on the list.

### 18.8 Form restructure

The timer form alert settings are grouped into an "Alerts" `<fieldset>` where each alert is a bordered card row (icon +
bold title + muted description + trailing Switch) that highlights with `bg-acc-softer ring-acc-ring` when active.
Sub-controls (sound selector, notify mode selector) render as indented subrows inside the card. The hide-name setting
has its own "Other Settings" `<fieldset>`. Duration input is restructured to three equal-width `font-mono` captioned
boxes (captions below) with an accent focus ring.
