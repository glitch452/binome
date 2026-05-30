# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is **pre-implementation**. The only source of truth so far is the full specification at `specs/requirements.md`. There is no `package.json`, application code, or git history yet. When scaffolding the app, follow the spec's stack, data models, component breakdown, and tooling decisions — they are intentional, not placeholders. The notes below summarize the parts that require reading across multiple spec sections to understand.

## What This App Is

A single-user, browser-based countdown timer. Users maintain a library of named timers, run one at a time, and get configurable alerts on expiry (screen flash, audio, count-up). It is a **client-side SPA** — there is no backend and no database. All state lives in `localStorage`. The Next.js App Router is used only for project conventions, the build pipeline, and `next/font`; every interactive component is `'use client'`, and there are no server actions or API routes in v1.

## Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with `darkMode: 'class'`, **shadcn/ui** primitives
- State via React `useState`/`useReducer`/`useContext` only — no external state library
- Persistence via a generic typed `useLocalStorage` hook
- **Vitest** + React Testing Library (jsdom), Wallaby for in-editor feedback
- **ESLint 9** flat config extending `eslint-config-spartan`, **Prettier**, Husky + lint-staged + commitlint
- Deployed as a standalone **Docker** image (`node:24-alpine`, multi-stage, `next start`)

## Expected Commands

These reflect the spec's tooling; confirm exact script names against `package.json` once it exists.

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run build          # production build (output: 'standalone')
npm run start          # serve the production build
npm run lint           # ESLint 9 flat config
npm run test           # Vitest (jsdom)
npx vitest run path/to/file.test.tsx        # run a single test file
npx vitest run -t "test name"               # run tests matching a name
npm run test -- --coverage                  # coverage via @vitest/coverage-v8
```

Docker: `docker build -t countdown .` then `docker compose up` (maps `3000:3000`). The runner stage copies only `.next/standalone` plus `public/`. Honors `PORT` (3000) and `HOSTNAME` (0.0.0.0).

## Architecture

### Three React contexts, provided at the root layout

- **TimerStoreContext** — the list of `TimerConfig[]` plus CRUD operations; persisted to `localStorage` key `countdown_timers`.
- **ActiveTimerContext** — the runtime state of the one running timer (`status`, `remainingSeconds`, `elapsedAfterExpiry`); **not persisted**. Driven by a `setInterval`-based `useCountdown` hook.
- **ThemeContext** — preference of `'light' | 'dark' | 'system'` (persisted to `countdown_theme`), resolved to a concrete `'light' | 'dark'` and applied by toggling the `dark` class on `<html>`. Defaults to `'system'`, seeded from `prefers-color-scheme` on first visit; an explicit choice takes precedence thereafter.

Components subscribe only to the context(s) they need. A timer keeps running when the user navigates back to the list — execution state lives in context, not in the run view component.

### Two client-rendered views (no routing)

`AppShell` switches between the **Timer List View** (default) and the **Run View**. There is no URL-based navigation between them.

### Key data models (`specs/requirements.md` §7)

`TimerConfig` (persisted) holds `id`, `name`, `durationSeconds`, the alert flags `flash`/`sound`/`soundId`/`countUp`, and timestamps. `SoundId` is one of `'bell' | 'beep' | 'chime' | 'buzzer' | 'ding'`. `ActiveTimerState.status` is `'idle' | 'running' | 'paused' | 'expired'`.

### Expiry behavior (§4.3)

At `00:00`, all enabled alerts fire together: flash alternates the viewport background at 2 Hz for 3 seconds; the selected sound plays once and can be re-triggered manually; if count-up is enabled the display continues upward prefixed with `+` (styled distinctly), otherwise it freezes at `00:00`.

### Audio

Built-in sounds (≤5) live in `/public/sounds/`. Playback uses the Web Audio API (`AudioContext`), primed inside the start-action user gesture to avoid autoplay-policy issues — do not rely on bare `<audio>.play()` outside a gesture.

## Conventions

- Prettier: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`.
- Conventional Commits enforced by commitlint; permitted types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`.
- `lint-staged` runs `eslint --fix` + `prettier --write` on `*.{ts,tsx}` at commit time.
- Any `eslint-disable` requires a justification comment on the same line.
- Tests are co-located with source as `*.test.ts(x)`.
- Layout must work at ≥375px wide; the run-view display scales with the viewport (fluid typography via `clamp`/Tailwind responsive variants).
- All UI surfaces — shadcn components, flash overlay, count-up display — must respect the active color scheme.

## Out of Scope for v1

No auth/accounts/cloud sync, no server-side timer state, no custom audio upload, no recurring timers, no browser notifications, no URL share/export-import. See `specs/requirements.md` §12.
