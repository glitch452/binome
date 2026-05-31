# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

The app is **implemented**. The full specification lives at `specs/requirements.md` and the implementation task list
(all complete) at `specs/tasks/TASKS.md`. The published package name is `binome` (MIT licensed; repo
`glitch452/binome`). Where the running code diverges from the spec, the code and the tooling configs are the source of
truth — the notes below summarize the parts that require reading across multiple files to understand.

## What This App Is

A single-user, browser-based countdown timer. Users maintain a library of named timers, run one at a time, and get
configurable alerts on expiry (screen flash, audio, count-up). It is a **client-side SPA** — there is no backend and no
database. All state lives in `localStorage`. The Next.js App Router is used only for project conventions, the build
pipeline, and `next/font`; every interactive component is `'use client'`, and there are no server actions or API routes
in v1.

## Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript** (strict, `@total-typescript/ts-reset` via
  `reset.d.ts`)
- **Tailwind CSS v4** with `darkMode: 'class'`; **shadcn/ui** primitives built on **Base UI** (`@base-ui/react`),
  `lucide-react` icons, `tw-animate-css`
- State via React `useState`/`useReducer`/`useContext` only — no external state library
- Persistence via a generic typed `useLocalStorage` hook
- **Vitest 4** + React Testing Library (jsdom), Wallaby for in-editor feedback
- **ESLint 9** flat config extending `eslint-config-spartan` (with its `nextJs`/`react`/`vitest`/`testingLibraryReact`/
  `jsDoc`/`mdx`/`prettier` mixins), **Prettier** (+ `prettier-plugin-tailwindcss`), Husky + lint-staged + commitlint
- **CI** via GitHub Actions (`.github/workflows/`); **Renovate** for dependency updates
- Deployed as a standalone **Docker** image (`node:24-alpine`, multi-stage, `node server.js`)

## Expected Commands

The actual scripts in `package.json` (note: several differ from the names in the spec's §10.8):

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run build          # production build (output: 'standalone')
npm run start          # serve the production build
npm run type           # tsc --noEmit (NOT `typecheck`)
npm run lint           # ESLint, cached + auto-fix (--max-warnings 0)
npm run lint:ci        # ESLint, no fix, fails on any warning (used in CI)
npm run format         # prettier --write .
npm run format:check   # prettier --check (alias of format:ci)
npm run test           # Vitest run once (jsdom)
npm run test:w         # Vitest watch mode (NOT `test:watch`)
npm run test:ci        # Vitest run with coverage + junit report (vite.config.ci.ts)
npm run test:snap      # Vitest run with coverage, updating snapshots
npx vitest run path/to/file.test.tsx        # run a single test file
npx vitest run -t "test name"               # run tests matching a name
```

Docker: `docker build -t binome .` then `docker compose up` (maps `3000:3000`). The runner stage copies
`.next/standalone`, `.next/static`, and `public/`, then runs `node server.js`. Honors `PORT` (3000) and `HOSTNAME`
(0.0.0.0).

## Architecture

### Three React contexts, provided at the root layout

- **TimerStoreContext** — the list of `TimerConfig[]` plus CRUD operations; persisted to `localStorage` key
  `countdown_timers`.
- **ActiveTimerContext** — the runtime state of the one running timer (`status`, `remainingSeconds`,
  `elapsedAfterExpiry`); **not persisted**. Driven by a `setInterval`-based `useCountdown` hook.
- **ThemeContext** — preference of `'light' | 'dark' | 'system'` (persisted to `countdown_theme`), resolved to a
  concrete `'light' | 'dark'` and applied by toggling the `dark` class on `<html>`. Defaults to `'system'`, seeded from
  `prefers-color-scheme` on first visit; an explicit choice takes precedence thereafter.

Components subscribe only to the context(s) they need. A timer keeps running when the user navigates back to the list —
execution state lives in context, not in the run view component.

### Two client-rendered views (no routing)

`AppShell` switches between the **Timer List View** (default) and the **Run View**. There is no URL-based navigation
between them.

### Key data models (`specs/requirements.md` §7)

`TimerConfig` (persisted) holds `id`, `name`, `durationSeconds`, the alert flags `flash`/`sound`/`soundId`/`countUp`,
and timestamps. `SoundId` is one of `'bell' | 'beep' | 'chime' | 'buzzer' | 'ding'`. `ActiveTimerState.status` is
`'idle' | 'running' | 'paused' | 'expired'`.

### Expiry behavior (§4.3)

At `00:00`, all enabled alerts fire together: flash alternates the viewport background at 2 Hz for 3 seconds; the
selected sound plays once and can be re-triggered manually; if count-up is enabled the display continues upward prefixed
with `+` (styled distinctly), otherwise it freezes at `00:00`.

### Audio

Built-in sounds (≤5) live in `/public/sounds/`. Playback uses the Web Audio API (`AudioContext`), primed inside the
start-action user gesture to avoid autoplay-policy issues — do not rely on bare `<audio>.play()` outside a gesture.

## Conventions

- Prettier: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`.
- Conventional Commits enforced by commitlint (`commitlint.config.ts`, extends `@commitlint/config-conventional`). It
  adds a `subject-case` rule (`sentence-case`; `lower-case` also allowed when `ENV=ci`, for Renovate). The type list is
  inherited from config-conventional — it is not narrowed.
- `lint-staged` is configured in `lint-staged.config.js` (not inline in `package.json`): `eslint --fix` +
  `prettier --write` on JS/TS/MD globs, `prettier --write` on `css/html/json/scss/yaml`, and on `renovate.json5` it also
  runs `renovate-config-validator --strict`.
- Any `eslint-disable` requires a justification comment on the same line.
- Tests are co-located with source as `*.test.ts(x)`.
- Layout must work at ≥375px wide; the run-view display scales with the viewport (fluid typography via `clamp`/Tailwind
  responsive variants).
- All UI surfaces — shadcn components, flash overlay, count-up display — must respect the active color scheme.

## CI/CD

- `.github/workflows/pr.yml` — runs on every PR: commitlint (range), `renovate-config-validator`, `format:ci`, `type`,
  `lint:ci`, `test:ci`, `build`, then publishes a Vitest JUnit report and coverage comment.
- `.github/workflows/release.yml` — runs on push to `main`: builds and pushes a Docker image to the GitHub Container
  Registry (`ghcr.io`, tagged `latest` + `sha-<short>`). **Planned** (see `specs/features/versioning-and-releases.md`):
  add semantic-release to compute the next semver from the merged commits, tag the image `v<version>`, and create the
  GitHub Release with generated notes.
- Both set `HUSKY=0` and use the Node version pinned in `.nvmrc` (24).

## Versioning & Build Info (planned)

Versioning is tracked in **GitHub Releases** (latest tag = current version), computed by semantic-release from
conventional commits (every type triggers at least a patch; `feat` → minor; breaking → major). Each release sets
Docker + git tags: immutable `vX.Y.Z` plus rolling `vX.Y`, `vX`, and `latest`. A zod-validated `public/build-info.json`
(served at `/build-info.json`) carries the version, full + short commit hash, and a link to the GitHub Release; the
build reads `BUILD_VERSION`/`GIT_SHA` env (Docker build-args) with a local git fallback, and the app raises a `sonner`
toast if it fails to load/validate. Full design in `specs/features/versioning-and-releases.md`, tasks in
`specs/tasks/VERSIONING_TASKS.md`.

## Out of Scope for v1

No auth/accounts/cloud sync, no server-side timer state, no custom audio upload, no recurring timers, no browser
notifications, no URL share/export-import. See `specs/requirements.md` §12.
