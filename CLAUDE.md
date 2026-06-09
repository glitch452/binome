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
in v1. It is also an installable, offline-capable **PWA**: a manifest plus a Serwist-built service worker
(`public/sw.js`) precache the app shell so a previously-loaded install runs with no network — see the PWA section below
and `specs/features/0004-pwa-offline.md`.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict, `@total-typescript/ts-reset` via
  `reset.d.ts`)
- **Tailwind CSS v4** with `darkMode: 'class'`; **shadcn/ui** primitives built on **Base UI** (`@base-ui/react`),
  `lucide-react` icons, `tw-animate-css`
- State via React `useState`/`useReducer`/`useContext` only — no external state library
- Persistence via a generic typed `useLocalStorage` hook
- **Vitest 4** + React Testing Library (jsdom), Wallaby for in-editor feedback
- **ESLint 9** flat config extending `eslint-config-spartan` (with its `nextJs`/`react`/`vitest`/`testingLibraryReact`/
  `jsDoc`/`mdx`/`prettier` mixins), **Prettier** (+ `prettier-plugin-tailwindcss`), Husky + lint-staged + commitlint
- **CI** via GitHub Actions (`.github/workflows/`); **Renovate** for dependency updates
- Deployed as a **Docker** image (`nginx:alpine` runner serving the static export `out/`, two-stage build, multi-arch
  `linux/amd64,linux/arm64`) and as a **GitHub Pages** site at `binome.dearden.dev`

## Expected Commands

The actual scripts in `package.json` (note: several differ from the names in the spec's §10.8):

```bash
npm run dev            # Next.js dev server (Turbopack)
npm run build          # next build (Turbopack, output: 'export' → out/) THEN serwist build THEN copy SW to out/
npm run start          # npx serve out  (inspect the static export locally; requires a prior build)
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

Docker: `docker build -t binome .` then `docker compose up` (maps `3000:80`). The two-stage build runs `npm run build`
in `node:24-alpine`, then the `nginx:alpine` runner copies `out/` to `/usr/share/nginx/html` and installs `nginx.conf`.
No Node.js in the final image. Multi-arch (`linux/amd64,linux/arm64`) in CI via QEMU + Buildx.

## Architecture

### Five React contexts, provided at the root layout

- **TimerStoreContext** — the list of `TimerConfig[]` plus CRUD operations; persisted to `localStorage` key
  `countdown_timers`.
- **ActiveTimerContext** — the runtime state of the one running timer (`status`, `remainingSeconds`,
  `elapsedAfterExpiry`); **not persisted**. Driven by a `setInterval`-based `useCountdown` hook.
- **ThemeContext** — preference of `'light' | 'dark' | 'system'` (persisted to `countdown_theme`), resolved to a
  concrete `'light' | 'dark'` and applied by toggling the `dark` class on `<html>`. Defaults to `'system'`, seeded from
  `prefers-color-scheme` on first visit; an explicit choice takes precedence thereafter.
- **AccentContext** (`contexts/AccentContext.tsx`) + `hooks/useAccent.ts` — accent color preference (`AccentColor`,
  persisted to `countdown_accent`); applies `data-accent="<color>"` to `<html>` in an effect inside the provider;
  default `'indigo'`.
- **TimerNumeralFontContext** (`contexts/TimerNumeralFontContext.tsx`) + `hooks/useTimerNumeralFont.ts` — numeral font
  preference (`TimerNumeralFont`, persisted to `countdown_timer_numeral_font`); default `'mono'`.

All four preference contexts (`ThemeContext`, `TimerFontSizeContext`, `AccentContext`, `TimerNumeralFontContext`) pass a
Zod `parse` function from `lib/preferencesSchema.ts` to `useLocalStorage` so that malformed stored values fall back to
the default instead of crashing.

Components subscribe only to the context(s) they need. Navigating back to the list stops the timer — `backToList` calls
`countdown.stop()` (dispatches `STOP` to the reducer, resetting to `INITIAL_STATE`) then sets `isViewingRunView` to
`false`. Execution state lives in context, not in the run view component.

### Two client-rendered views (no routing)

`AppShell` switches between the **Timer List View** (default) and the **Run View**. There is no URL-based navigation
between them. The list view has a sticky header and a width-limited content column; each list row shows small
`lucide-react` icons for its enabled alert settings, and Delete opens a confirmation `Dialog` before removing. Each row
also has a Copy button that opens the same `TimerFormSheet` with settings pre-filled from the source timer but no
`timer` prop (so submit calls `addTimer`, not `updateTimer`) and a "Copy Timer" title. Boolean timer settings render as
`Switch` toggles (not checkboxes); the sound setting reveals a selector plus a "Preview sound" button. A footer renders
the version as a button that opens an "About Binome" `Dialog`.

`TimerFormSheet` supports three modes driven by its props: create (no `timer`, no `cloneFrom`), edit (`timer` set), and
clone (`cloneFrom` set, no `timer`). Clone pre-fills `initialValues` from the source but the submit path is identical to
create.

The run view toolbar contains two dropdown menus replacing the old icon-button toggles:

- **`ThemeMenu`** (`components/shared/ThemeMenu.tsx`) — a single dropdown for both theme (Light/Dark/System) and accent
  color (5 swatches: Indigo, Amber, Teal, Rose, Green). Appears in both the `TimerList` header and the `RunView`
  toolbar; consumes `useTheme` + `useAccent`.
- **`DisplayMenu`** (`components/shared/DisplayMenu.tsx`) — a dropdown for countdown font size (`sm/md/lg/xl`) and
  numeral font (Mono/Sans). Run View toolbar only; consumes `useTimerFontSize` + `useTimerNumeralFont`.

`TimerFontSizeContext` is a fifth root context in `app/layout.tsx`, stored at `countdown_timer_font_size`, default
`'md'`. `CountdownDisplay` accepts `fontSize?: TimerFontSize` and `numeralFont?: TimerNumeralFont` props; `fontSize`
maps to one of four `clamp()`-based Tailwind arbitrary-value classes defined as literal strings in a lookup table (so
Tailwind's JIT scanner can detect them); `numeralFont` maps to `font-mono` / `font-sans`. Both types live in
`types/timer.ts`; storage keys in `lib/constants.ts`.

The **`Brand`** component (`components/shared/Brand.tsx`) replaces the plain `<h1>` in the `TimerList` header. It
renders an inline SVG logo chip (using `fill-acc` / `fill-acc-soft` CSS utilities that follow the active accent) plus
the `<h1>Binome</h1>` wordmark and "Every second counts" subtitle.

The `RunView` renders an accent-gradient background element (`.bg-run-gradient`, `absolute inset-0 -z-10 isolate`) so
the page background shifts with the active accent. Each `TimerListItem` row receives its map `index` (1-based,
zero-padded, e.g. `01`, `02`) rendered in `font-mono text-fg-subtle` before the timer name, and adds `bg-card` so the
gradient does not show through the card.

`DurationInput` was restructured to a captioned-box layout: three equal-width `font-mono` tall boxes with "hours" /
"minutes" / "seconds" captions below, with an accent focus ring (`focus-visible:ring-acc-ring`).

Alert settings in `TimerForm` are restructured into `<fieldset>` card rows under an "Alerts" legend — each alert is a
bordered card (icon + bold title + muted description + trailing Switch) that applies `bg-acc-softer ring-acc-ring` when
active; sound and notify sub-controls render as indented subrows. The hide-name setting has its own "Other Settings"
`<fieldset>`.

`useUpdateCheck` (in `hooks/useUpdateCheck.ts`) polls `/build-info.json` every 60 minutes and exposes
`{ update: BuildInfo | null, dismissUpdate: () => void }`. It is called in `AppShell` so polling continues while the Run
View is active. When `update` is non-null, `AppShell` passes it to `TimerList`, which renders `UpdateBanner` above the
sticky header. Dismissal is per-version in React state (does not persist across reloads). Full design in
`specs/features/0003-update-check.md`.

`useNotificationPermission` (in `hooks/useNotificationPermission.ts`) watches the `timers` array from `useTimerStore`
and calls `requestNotificationPermission()` once per rising edge when the Notification API is supported, permission is
still `'default'`, and `timers.some(t => t.notify)`. A ref guard prevents spamming; it resets after the promise resolves
so a later list change can retry. `useExpiryNotification` (in `hooks/useExpiryNotification.ts`) detects the `→ expired`
transition via a `prevStatusRef` (same pattern as RunView's flash/sound effect) and calls
`showExpiryNotification(timer)` when `notify` is true, permission is granted, and the mode condition is satisfied. Both
hooks are called in `AppShell`, always mounted. Delivery logic lives in `lib/notifications.ts`. `app/sw.ts` registers a
`notificationclick` handler that focuses an existing window or opens `/`. Full design in
`specs/features/0005-browser-notifications.md`.

### PWA / service worker (Serwist)

The app is an installable, offline-capable PWA. `app/manifest.ts` (a metadata route → `/manifest.webmanifest`) plus
`public/icons/*` drive the browser's native Install UI; `app/layout.tsx` adds `appleWebApp` metadata, a `viewport`
`themeColor`, and wraps the tree in `<SerwistProvider>`.

The service worker is built with **Serwist in configurator mode**, _not_ the `withSerwistInit` webpack plugin — that
plugin doesn't run under Next 16's default Turbopack build. Instead `serwist.config.mjs` (`@serwist/next/config`) is
consumed by a `serwist build` step appended to the `build` script (`next build && serwist build serwist.config.mjs`), so
the Next build stays on Turbopack. Source is `app/sw.ts` (`webworker` lib added to `tsconfig.json`); it precaches the
shell, Next's hashed assets, the icons, and `/sounds/*.wav`, and routes `/build-info.json` through `NetworkFirst` so the
§update-check poll still detects new deploys offline-safely. Deps: `serwist` + `@serwist/next` (runtime), `@serwist/cli`
(dev). The generated `public/sw.js` (+ `.map`, `swe-worker-*.js`) is a build artifact — gitignored and excluded from
prettier/eslint, exactly like `public/build-info.json`.

**Active-timer safety:** `skipWaiting: false` and `<SerwistProvider reloadOnOnline={false}>` (whose library default is
`true`) mean the only reload path is the user clicking the update banner's **Refresh**, which runs `useApplyUpdate()`'s
skip-waiting handshake (`AppShell → TimerList → UpdateBanner`) — a network reconnect or background SW update never
auto-reloads, so a running in-memory timer is never silently discarded. Full design in
`specs/features/0004-pwa-offline.md`.

### Key data models (`specs/requirements.md` §7)

`TimerConfig` (persisted) holds `id`, `name`, `durationSeconds`, the alert flags `flash`/`sound`/`soundId`/`soundRepeat`
(integer 1–5, default 1)/`countUp`, a `hideName` flag (hides the timer name on the run view), `notify`/`notifyMode`
(system notification on expiry — see §17 and below), and timestamps. `SoundId` is one of
`'bell' | 'beep' | 'chime' | 'buzzer' | 'ding'`. `NotifyMode` is `'always' | 'hidden'`. `ActiveTimerState.status` is
`'idle' | 'running' | 'paused' | 'expired'`.

Preference types: `AccentColor = 'indigo' | 'amber' | 'teal' | 'rose' | 'green'`; `TimerNumeralFont = 'mono' | 'sans'`.
Both live in `types/timer.ts` alongside `TimerFontSize` and `ThemePreference`.

localStorage keys for preferences:

| Key                            | Value / type                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `countdown_timers`             | `JSON.stringify(TimerConfig[])`                                              |
| `countdown_theme`              | `ThemePreference` (`'light'` \| `'dark'` \| `'system'`)                      |
| `countdown_timer_font_size`    | `TimerFontSize` (`'sm'` \| `'md'` \| `'lg'` \| `'xl'`)                       |
| `countdown_accent`             | `AccentColor` (`'indigo'` \| `'amber'` \| `'teal'` \| `'rose'` \| `'green'`) |
| `countdown_timer_numeral_font` | `TimerNumeralFont` (`'mono'` \| `'sans'`)                                    |

All types live in `types/timer.ts`. There is no `src/` directory — code is in top-level `app/`, `components/`,
`contexts/` (the five context providers), `hooks/`, `lib/` (constants, time helpers, `build-info`, `cn` util), and
`types/`. Note the split: the context object lives in `contexts/*Context.tsx`, while the matching `hooks/use*.ts` is the
thin consumer (e.g. `TimerStoreContext.tsx` + `useTimerStore.ts`).

### Expiry behavior (§4.3)

At `00:00`, all enabled alerts fire together: flash alternates the viewport background at 2 Hz for 3 seconds; the
selected sound plays `soundRepeat` times (1–5, default 1) with 500 ms between plays, and can be re-triggered manually
(single play); if count-up is enabled the display continues upward prefixed with `+` (styled distinctly), otherwise it
freezes at `00:00`. Flash and sound fire only inside RunView. System notifications (`notify`/`notifyMode`) are handled
by `useExpiryNotification`, which is always mounted in `AppShell` (independent of the current view), so they fire even
when the user is on the Timer List or a different tab. `useNotificationPermission`, also mounted in `AppShell`, requests
permission reactively whenever a stored timer has `notify: true` and permission is still `'default'`.

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
- `lib/preferencesSchema.ts` provides four Zod enums (`themePreferenceSchema`, `timerFontSizeSchema`,
  `accentColorSchema`, `timerNumeralFontSchema`) used as the `parse` option in all four preference `useLocalStorage`
  calls, so any unrecognised stored value falls back to the type default.
- Any `eslint-disable` requires a justification comment on the same line.
- Tests are co-located with source as `*.test.ts(x)`.
- Layout must work at ≥375px wide; the run-view display scales with the viewport (fluid typography via `clamp`/Tailwind
  responsive variants).
- All UI surfaces — shadcn components, flash overlay, count-up display — must respect the active color scheme.

## CI/CD

- `.github/workflows/pr.yml` — runs on every PR: commitlint (range), `renovate-config-validator`, `format:ci`, `type`,
  `lint:ci`, `test:ci`, `build`, then publishes a Vitest JUnit report and coverage comment. Also runs a non-blocking
  semantic-release dry-run (`continue-on-error: true`) to surface the predicted next version in the job summary.
- `.github/workflows/release.yml` — runs on push to `main`: shallow-fetches commits since the last release tag (avoids
  full-history clone); runs a semantic-release dry-run to determine the next version; if a new release is warranted,
  builds and pushes a multi-arch (`linux/amd64,linux/arm64`) Docker image to GHCR (`ghcr.io`) with tags `v<version>`,
  `v<major>.<minor>`, `v<major>`, `latest`, and `sha-<short>` (passing `BUILD_VERSION`/`GIT_SHA` as build-args via QEMU
  - Buildx); creates the GitHub Release with generated notes; force-moves the rolling git tags; then a downstream
    `deploy-pages` job (gated on `new_release_published`) builds the static export and deploys `out/` to GitHub Pages at
    `binome.dearden.dev` (`public/CNAME`). The `deploy-pages` job holds `pages: write` + `id-token: write`; those
    permissions are **not** on the top-level block.
- Both set `HUSKY=0` and use the Node version pinned in `.nvmrc` (24).

## Versioning & Build Info

Versioning is tracked in **GitHub Releases** (latest tag = current version), computed by semantic-release from
conventional commits (every type triggers at least a patch; `feat` → minor; breaking → major). Each release sets
Docker + git tags: immutable `vX.Y.Z` plus rolling `vX.Y`, `vX`, and `latest`. A zod-validated `public/build-info.json`
(served at `/build-info.json`) carries the version, full + short commit hash, and a link to the GitHub Release; the
build reads `BUILD_VERSION`/`GIT_SHA` env (Docker build-args) with a local git fallback, and the app raises a `sonner`
toast if it fails to load/validate. Full design in `specs/features/0001-versioning-and-releases.md`, tasks in
`specs/tasks/0001-versioning-and-releases-tasks.md`.

## Import / Export

Users can export their timer library to a downloaded `binome.json` (a top-level object with a `timers` key, leaving room
for future data) and import one back. Import validates JSON + envelope shape (distinct `sonner` toasts on failure), then
reuses the lenient `parseTimerList` (drops bad timers, keeps the rest), and prompts the user with a selection dialog
before applying — timers whose `id` collides with an existing one are flagged as overwrites and unchecked by default.
Merge is id-keyed via a `useTimerStore` `importTimers` operation. Full design in `specs/features/0002-import-export.md`,
tasks in `specs/tasks/0002-import-export-tasks.md`.

## Out of Scope for v1

No auth/accounts/cloud sync, no server-side timer state, no custom audio upload, no recurring timers, no URL/hosted-link
sharing (file-based export/import _is_ supported — see above). See `specs/requirements.md` §13.
