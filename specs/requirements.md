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
11. [Docker Deployment](#11-docker-deployment)
12. [Out of Scope](#12-out-of-scope)

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
- Mobile-native or PWA offline support (basic responsiveness is expected, but it is not a mobile-first product).
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
- **FR-03** Users can delete any saved timer. Deleting a timer that is currently active stops it first.
- **FR-04** Timer configurations are stored in `localStorage` and survive page reload.
- **FR-05** Per-timer settings include: `flashOnExpiry` (boolean), `soundOnExpiry` (boolean), `soundChoice` (enum of
  built-in sounds), `countUpAfterExpiry` (boolean).

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
- **FR-13** Sound: the selected audio clip plays once at expiry. The user can re-trigger it manually.
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

- Header with app name, a "New Timer" button, and a dark/light mode toggle (sun/moon icon).
- List of saved timers, each showing: name, duration, and action buttons (Edit, Delete, Start).
- Empty state message when no timers exist.

**Run View**

- Large countdown display, centred, full-height.
- Timer name shown above the countdown.
- Controls below: Pause/Resume, Reset, Back to List.
- Dark/light mode toggle accessible in this view (e.g. in a corner icon button).
- Expiry indicators (flash overlay, count-up display) rendered in this view.

### 5.2 Timer Form (Create / Edit)

Fields:

- Name (text input)
- Duration (three number inputs: HH, MM, SS — or a single masked input)
- Flash on expiry (toggle/checkbox)
- Sound on expiry (toggle; reveals sound selector when enabled)
- Count up after expiry (toggle/checkbox)

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
| Framework            | Next.js 15 (App Router)                                                |
| Language             | TypeScript (strict mode)                                               |
| UI Library           | React 19                                                               |
| Styling              | Tailwind CSS v4                                                        |
| Component Primitives | shadcn/ui                                                              |
| State Management     | React `useState` / `useReducer` + `useContext` (no external state lib) |
| Persistence          | `localStorage` via a custom hook                                       |
| Testing              | Vitest + React Testing Library                                         |
| Test Runner (IDE)    | Wallaby                                                                |
| Linting              | ESLint 9 (flat config) + `eslint-config-spartan`                       |
| Formatting           | Prettier                                                               |
| Git Hooks            | Husky + lint-staged + commitlint                                       |
| Dependency Updates   | Renovate                                                               |
| Deployment           | Docker (Node 24 Alpine base)                                           |

### 6.2 Rendering Strategy

The entire app is a **client-side single-page application**. The Next.js App Router is used purely for its project
conventions, build pipeline (Turbopack), and `next/font`. All interactive components are `'use client'`. No server
actions or API routes are needed for v1.

The Docker container runs `next start` serving the production build.

### 6.3 State Architecture

```
TimerStoreContext         — CRUD operations and list of TimerConfig[]
  └─ persisted to localStorage via useLocalStorage hook

ActiveTimerContext        — currently running timer state (elapsed, status)
  └─ driven by useCountdown hook (setInterval-based)

ThemeContext              — 'light' | 'dark' | 'system', resolved to 'light' | 'dark'
  └─ persisted to localStorage; initialized from prefers-color-scheme on first visit
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
  countUp: boolean; // count up after expiry
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

type SoundId = 'bell' | 'beep' | 'chime' | 'buzzer' | 'ding';
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

### 7.4 localStorage Schema

| Key                | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| `countdown_timers` | `JSON.stringify(TimerConfig[])`                         |
| `countdown_theme`  | `ThemePreference` (`'light'` \| `'dark'` \| `'system'`) |

---

## 8. Component Breakdown

### 8.1 File Tree

```
app/
  layout.tsx                  — root layout, context providers, fonts
  page.tsx                    — renders <AppShell />

components/
  AppShell.tsx                — switches between ListView and RunView
  timer-list/
    TimerList.tsx             — list container + empty state
    TimerListItem.tsx         — single row: name, duration, actions
    TimerForm.tsx             — create/edit form (used in Sheet)
    TimerFormSheet.tsx        — shadcn Sheet wrapper around TimerForm
  run-view/
    RunView.tsx               — full-height run layout
    CountdownDisplay.tsx      — large formatted time string
    TimerControls.tsx         — Start/Pause/Resume/Reset/Back buttons
    FlashOverlay.tsx          — full-viewport div, CSS animation on expiry
  shared/
    DurationInput.tsx         — HH MM SS three-field input
    SoundSelector.tsx         — dropdown of available sounds
    ThemeToggle.tsx           — sun/moon icon button, cycles light/dark/system

hooks/
  useTimerStore.ts            — CRUD + localStorage persistence
  useCountdown.ts             — setInterval tick logic, expiry detection
  useLocalStorage.ts          — generic typed localStorage hook
  useAudio.ts                 — AudioContext management, play(soundId)
  useFlash.ts                 — triggers flash animation state
  useTheme.ts                 — reads/writes ThemeContext; exposes resolvedTheme, setTheme
  useMediaQuery.ts            — reactive wrapper around window.matchMedia
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
  isActive: boolean; // true when this timer is the currently running timer
  onEdit: (timer: TimerConfig) => void;
  onDelete: (id: string) => void;
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

#### `ThemeToggle`

No props. Reads and writes `ThemeContext` via `useTheme`. Cycles through `'light' → 'dark' → 'system'` on each click and
renders a sun, moon, or monitor icon accordingly.

---

## 9. API Routes

None required for v1. All state is client-side.

---

## 10. Tooling & Configuration

### 10.1 ESLint

- Flat config (`eslint.config.mjs`), ESLint 9.
- Extends `eslint-config-spartan`.
- TypeScript type-aware rules via `@typescript-eslint/parser` with `projectService: true`.
- No `eslint-disable` comments permitted without a justification comment on the same line.

### 10.2 Prettier

- `prettier.config.mjs` at project root.
- Integrated with ESLint via `eslint-config-prettier` (disables conflicting rules).
- Key settings: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`.

### 10.3 lint-staged

Runs on `git commit` via a Husky `pre-commit` hook:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

### 10.4 commitlint

- Config: `commitlint.config.mjs`.
- Extends `@commitlint/config-conventional`.
- Enforced via a Husky `commit-msg` hook.
- Permitted types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`.

### 10.5 Vitest

- Config: `vitest.config.ts`.
- Environment: `jsdom`.
- Setup file: `vitest.setup.ts` (imports `@testing-library/jest-dom`).
- Coverage via `@vitest/coverage-v8`.
- Test files: `**/*.test.ts` / `**/*.test.tsx` co-located with source.

### 10.6 Wallaby

- Config: `wallaby.mjs`.
- Integrates with Vitest for continuous in-editor test feedback.
- No separate configuration needed beyond pointing at `vitest.config.ts`.

### 10.7 Renovate

- Config: `renovate.json` at project root.
- Presets: `github>glitch452/renovate-config` and `github>glitch452/renovate-config//presets/npm`.
- `schedule: ["before 6am on Monday"]` — weekly grouped PRs.
- Pin `devDependencies`, range for `dependencies`.
- Separate PR per major version bump.

### 10.8 Package Scripts

All scripts are defined in `package.json` under `"scripts"`:

| Script          | Command                 | Purpose                                                      |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| `dev`           | `next dev --turbopack`  | Start the development server with Turbopack                  |
| `build`         | `next build`            | Production build                                             |
| `start`         | `next start`            | Serve the production build locally                           |
| `test`          | `vitest run`            | Run the test suite once (CI)                                 |
| `test:watch`    | `vitest`                | Run tests in watch mode (development)                        |
| `test:coverage` | `vitest run --coverage` | Run tests with V8 coverage report                            |
| `format`        | `prettier --write .`    | Format all files in place                                    |
| `format:check`  | `prettier --check .`    | Check formatting without writing (CI)                        |
| `typecheck`     | `tsc --noEmit`          | Run the TypeScript compiler without emitting output          |
| `lint`          | `eslint .`              | Lint all files                                               |
| `lint:fix`      | `eslint . --fix`        | Lint and auto-fix all files                                  |
| `prepare`       | `husky`                 | Install Husky hooks (runs automatically after `npm install`) |

---

## 11. Docker Deployment

### 11.1 Build Strategy

Multi-stage Dockerfile:

| Stage     | Base Image       | Purpose                         |
| --------- | ---------------- | ------------------------------- |
| `deps`    | `node:24-alpine` | Install production dependencies |
| `builder` | `node:24-alpine` | Build the Next.js app           |
| `runner`  | `node:24-alpine` | Run `next start`                |

The runner stage copies only the `.next/standalone` output (enabled via `output: 'standalone'` in `next.config.ts`) plus
the `public/` directory, keeping the image small.

### 11.2 Environment Variables

| Variable   | Default   | Purpose                      |
| ---------- | --------- | ---------------------------- |
| `PORT`     | `3000`    | Port `next start` listens on |
| `HOSTNAME` | `0.0.0.0` | Bind address                 |

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

## 12. Out of Scope

The following are explicitly deferred to future iterations:

- User accounts, authentication, or cloud sync.
- Sharing timer configurations via URL or export/import.
- Custom audio upload.
- Repeating / recurring timers (e.g. interval training).
- Browser notifications (Notification API).
- Accessibility audit beyond baseline semantic HTML and keyboard nav (the dark mode toggle must still be
  keyboard-accessible and carry an `aria-label`).
