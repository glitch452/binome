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

### Launch Gate

`LaunchGate` (`components/LaunchGate.tsx`, `'use client'`) wraps `children` in `app/layout.tsx` — inside the providers,
above `AppShell`. It renders `AppSkeleton` until `useHydrated() && useLaunchUpdate().ready`; once both are true it
renders `children`. Return type is `ReactNode` so `children` can be returned directly without a wrapper element. On
reveal an effect adds the `app-ready` class to `<html>`, which switches the document background from the loading-phase
dark to the active accent (see the `globals.css` note below). A **dev-only** escape hatch — `localhost:3000/?skeleton`
(guarded by `NODE_ENV === 'development'`, so it is dead-code-eliminated in production) — pins the skeleton on screen for
visual inspection, since dev disables the service worker and the gate otherwise resolves in one tick.

`AppSkeleton` (`components/shared/AppSkeleton.tsx`) is the always-dark full-viewport skeleton shown during the gate.
Uses explicit Tailwind neutral classes (`bg-neutral-950`, `bg-neutral-800`, etc.) — **not** CSS-custom-property-based
theme tokens — so it is reliably dark before `useTheme`'s effect runs. `role="status"` + `aria-busy` + `sr-only`
"Loading Binome" for screen readers. Rough Timer-List shape: header bar with logo-chip and two menu circles, four
`animate-pulse` rows, footer line.

`app/globals.css` sets `html { background-color: oklch(0.07 0 0) }` (near-black neutral) as a hardcoded default in
`@layer base`. This ensures the document is dark in the tiny window between HTML delivery and CSS class application —
the `AppSkeleton` covers the viewport once mounted, but the document color is the safety net before that paint. Once the
gate reveals, `LaunchGate` adds `app-ready` to `<html>` and the `html.app-ready { background-color: var(--acc) }` rule
takes over, so the overscroll/rubber-band area shows the active accent (`--acc`, set per `[data-accent]`) rather than
the loading dark.

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
the `<h1>Binome</h1>` wordmark and "Every second counts" subtitle. It accepts an optional `onClick` prop; when provided,
the entire Brand is wrapped in a `<button>` (aria-label "About Binome") that opens the About dialog.

`TimerForm` (`components/timer-list/TimerForm.tsx`) uses **React Hook Form** (`useForm` + `useWatch` + `Controller`)
with a **`zodResolver`** backed by `lib/timerFormSchema.ts`. The form schema (`timerFormSchema`) is intentionally
separate from the storage schema (`timerConfigSchema` in `lib/timerSchema.ts`): the form schema has no
`id`/`createdAt`/`updatedAt` fields and no `.optional()` or `.default()` modifiers — every field is required with the
form's specific constraints. `TimerFormValues` is `z.infer<typeof timerFormSchema>` and re-exported from `TimerForm.tsx`
for existing consumers. The Save button's disabled state is computed manually from `useWatch` values (not from RHF's
`formState.isValid`) so it works correctly on the initial render before any validation run. `formState.isDirty` drives
the `onDirtyChange` callback used by `TimerFormSheet`'s discard-changes guard.

The **"About Binome" dialog** is implemented as `components/shared/AboutDialog.tsx` (`props: { open, onOpenChange }`,
calls `useBuildInfo()` internally). It is used in two places: `BuildInfoFooter` (triggered by clicking the version
number in the footer) and `TimerList` (triggered by clicking the Brand in the header, with `aboutOpen` state managed
locally in `TimerList`).

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

`useUpdateCheck` (in `hooks/useUpdateCheck.ts`) exposes `{ update: BuildInfo | null, dismissUpdate: () => void }`.
`update` is non-null when the fetched server `build-info.json` reports a version **different from**
`getRunningBuildInfo()?.version` (the inlined running constant) — checked via a shared `flagIfNewer(info)` guard on both
triggers: the Serwist `waiting` event and the mount/60-min poll. The version guard on the `waiting` trigger matters —
without it a waiting worker for the **same** version (a same-version local rebuild, a duplicate registration, or a
worker parked for the version the gate already revealed) would surface a spurious "update to the version you're already
on" banner; in production a waiting worker always carries a newer version, so the guard only suppresses these non-update
cases (and does nothing when the running constant is absent). The value is the **server `BuildInfo`** (version text +
`releaseUrl` for the banner). On mount and every `UPDATE_POLL_INTERVAL_MS` (60 min default; overridable for local
testing via the `NEXT_PUBLIC_UPDATE_POLL_INTERVAL_MS` env var — see `lib/constants.ts`) a poll calls `serwist.update()`
(browser SW check) and fetches `/build-info.json`. The mount effect also inspects
`navigator.serviceWorker.getRegistration()?.waiting` (when `serwist !== null && 'serviceWorker' in navigator`) and runs
the same `fetchBuildInfo().then(flagIfNewer)` path — this closes the race where a worker parks **during the launch
gate** (its `waiting` event fired before this hook mounted, and `serwist.update()` won't re-fire it for an
already-waiting worker); detection only, never applies, still gated by `flagIfNewer`. There is no `initialVersion`
baseline or `swWaiting` retry — the inlined constant removes the "poisoned baseline" failure mode. `dismissUpdate()`
suppresses by version (React state, per reload). Called in `AppShell` so detection continues while the Run View is
active. `AppShell` passes `update`/`dismissUpdate`/`onRefresh` to `TimerList` → `UpdateBanner`; a mid-session deploy
surfaces the manual banner only (no auto-reload, active-timer safety). Full design in
`specs/features/0003-update-check.md` §4.

`useApplyUpdate` (in `hooks/useApplyUpdate.ts`) returns `applyUpdate(options?: { reloadNow?: boolean })`, the "get me to
the latest" action behind the banner's **Update** button and the launch gate. Three behaviors:

- **No-SW** (dev/unsupported; `serwist === null`) → `cacheBustingReload()` (`lib/cacheBustingReload.ts`), which rebuilds
  the URL with a refreshed `_` cache-bust param (replace, not stack) and `location.replace`s.
- **Banner (`reloadNow: true`)** → `messageSkipWaiting()` then `window.location.reload()`. A **reload** — not a
  skip-waiting/`controlling` handshake — is what reliably adopts a new worker: **Safari/WebKit ignores `skipWaiting()`
  while a client is open**, so messaging the parked worker never activates it, but a reload navigation drops the old
  client and lets the parked/active worker serve the new page; and if the new worker is already active with only the
  in-memory page stale, a reload picks it up immediately. The launch gate guarantees the newest version loads on the
  fresh page, so the banner just delegates to a reload. (The earlier skip-waiting + poll + reload-to-adopt + "not ready"
  toast machinery was **removed** — it failed on Safari and on the "worker already active, page stale" case, both of
  which a plain reload handles.) Safe because the banner only renders on the Timer List, where `backToList` has stopped
  any running timer.
- **Launch gate (no options)** → register a one-shot `controlling` listener that reloads, then `messageSkipWaiting()` +
  `serwist.update()`; if nothing controls within `UPDATE_APPLY_TIMEOUT_MS` (10 s) it stops listening (so a late
  activation can't reload after the gate revealed the app — active-timer safety) and the banner takes over. The gate
  must **not** just reload (it would loop at launch), so this path keeps the activate-and-reload-once handshake (it
  still relies on `skipWaiting`, which works for Chrome's at-launch auto-update; on Safari the gate gives up and the
  banner's reload does the job).

The banner's **Update** button shows a disabled "Updating…" loading state on click: `AppShell` owns `isApplyingUpdate`
(set true in the handler, which calls `applyUpdate({ reloadNow: true })`) and threads it
`AppShell → TimerList → UpdateBanner` as `isApplying` (`aria-busy`). The page reloads immediately, so the state simply
persists until navigation.

`/build-info.json` is fetched with `cache: 'no-store'` (in `useUpdateCheck` and `useLaunchUpdate`), **not** `no-cache`:
a conditional request returns a body-less `304`, and when the service worker re-fetches and hands a bare `304` back to
the page the fetch errors ("error loading resource"); `no-store` forces a full `200`. The SW routes `/build-info.json`
through `NetworkFirst({ networkTimeoutSeconds: 5 })` so a hung/dead connection (e.g. a restarted local server's stale
keep-alive sockets) falls back to the cached copy instead of spinning. The entry HTML is served
`no-cache, must-revalidate` by `nginx.conf` while content-hashed `/_next/static/` stays `immutable` (see §16.4).

`useHydrated` (in `hooks/useHydrated.ts`) returns `false` on the initial render and `true` after the first post-mount
effect flush. Used by `LaunchGate` as the "preferences loaded from localStorage" signal — because all `useLocalStorage`
reads happen in post-mount effects, `useHydrated() === true` guarantees theme/accent/timer data is resolved.

`useLaunchUpdate` (in `hooks/useLaunchUpdate.ts`) returns `{ ready: boolean }`. The §6.3 state machine: starts `false`,
flips `true` once the version check resolves. Branches: (1) no SW → `true` after mount; (2) worker already waiting at
launch (`wasWaitingBeforeRegister`) → calls `applyUpdate()`, stays `false` (skeleton through reload); (3) fetch server
version — equal to running → `true`, ahead → `applyUpdate()` + hold; fetch fails → `true`. Capped by
`GATE_VERSION_CHECK_TIMEOUT_MS` (3 s, no decision → reveal) and `GATE_UPDATE_APPLY_TIMEOUT_MS` (10 s, stuck apply →
reveal + manual banner takes over). Consumes `useSerwist` and `useApplyUpdate` (captured via ref so the effect doesn't
re-run every render).

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
shell, Next's hashed assets, the icons, and `/sounds/*.wav`, and routes `/build-info.json` through
`NetworkFirst({ networkTimeoutSeconds: 5 })` so the §update-check poll still detects new deploys offline-safely (the
timeout makes a hung/dead network fall back to the cached copy instead of spinning). **`/build-info.json` must stay out
of the precache** — it is ignored via `globIgnores: ['public/build-info.json']` in `serwist.config.mjs`, because Serwist
registers the precache route ahead of `runtimeCaching` and the router returns on first match, so a precached copy would
shadow the `NetworkFirst` route and freeze the update banner's reported version at the installed worker's build time.
Deps: `serwist` + `@serwist/next` (runtime), `@serwist/cli` (dev). The generated `public/sw.js` (+ `.map`,
`swe-worker-*.js`) is a build artifact — gitignored and excluded from prettier/eslint, exactly like
`public/build-info.json`.

**`sw.js` is version-stamped on build.** After `serwist build`, `scripts/copy-sw-to-out.mjs` appends a
`// binome build <version> (<commitShort>)` line (read from `public/build-info.json`) to `public/sw.js` before copying
it to `out/`. The version already propagates into the precache manifest via the content-hashed chunk that inlines
`NEXT_PUBLIC_BUILD_INFO`, so a new release is normally already a byte-different `sw.js`; the stamp makes that an
**explicit guarantee** (new version → new `sw.js` → the browser always detects a new worker) rather than relying on that
implicit chain.

**Active-timer safety:** `skipWaiting: false` and `<SerwistProvider reloadOnOnline={false}>` (whose library default is
`true`) mean there are exactly two reload paths, both via `useApplyUpdate()`: (1) the launch gate (`LaunchGate` +
`useLaunchUpdate`), which fires **before** the app is visible so no timer is running yet; and (2) the user clicking
**Update** in the update banner (`AppShell → TimerList → UpdateBanner`), which only shows mid-session. A network
reconnect or background SW install never auto-reloads. A running in-memory timer is therefore never silently discarded.
Full design in `specs/features/0004-pwa-offline.md`.

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
- `.github/workflows/release.yml` — runs on push to `main` as a four-job chain, each downstream job gated on
  `needs.version.outputs.new_release_published == 'true'`:
  1. **`version`** — shallow-fetches commits since the last release tag (avoids full-history clone) and runs a
     semantic-release **dry-run** to determine the next version. Exposes `new_release_published`, the
     `version`/`major`/`minor` numbers, **and `new_release_notes`** (the generated changelog) as job outputs consumed by
     every other job. semantic-release runs **only here** — the dry-run is the single source of the version and notes.
  2. **`docker`** — a `fail-fast` matrix over `linux/amd64` and `linux/arm64` that builds the two architectures **in
     parallel on separate runners** (still QEMU-emulated for arm64, but no longer competing for one runner's CPU). Each
     leg pushes an **untagged, push-by-digest** image to GHCR and uploads its digest as a `digests-<platform>` artifact
     (`actions/upload-artifact@v4`). `BUILD_VERSION`/`GIT_SHA` are passed as build-args.
  3. **`release`** (`needs: [version, docker]`, so it runs only if **both** arch builds succeed) — downloads the
     digests, then `docker buildx imagetools create` stitches them into a single multi-arch manifest list tagged
     `v<version>`, `v<major>.<minor>`, `v<major>`, `latest`, and `sha-<short>` (tags from `docker/metadata-action`). It
     then creates the GitHub Release via `gh release create`, passing `new_release_version` + `new_release_notes` from
     the `version` job (identical to a fresh computation since both run at the same commit), and force-moves the rolling
     git tags. It does **not** run semantic-release or `npm ci` and needs no git history: `@semantic-release/github` is
     configured with `successComment/failComment: false` (see `release.config.mjs`), so semantic-release's only release
     effects were creating the release + tag — both reproduced by `gh`. The `v<version>` tag is created by `gh`
     (lightweight, like the rolling tags) rather than by semantic-release. Notes are passed via an `env:` var and
     referenced as `"$NOTES"` (never inline `${{ }}`) to avoid shell injection from commit-message-derived content.
  4. **`deploy-pages`** (`needs: [version, release]`) — builds the static export and deploys `out/` to GitHub Pages at
     `binome.dearden.dev` (`public/CNAME`). It holds `pages: write` + `id-token: write`; those permissions are **not**
     on the top-level block.

  The push-by-digest + manifest-merge split is the canonical Docker pattern for parallel multi-arch builds: two jobs
  cannot both push the same tag without clobbering each other, so each pushes only its digest and a final job assembles
  the tagged manifest.

- Both set `HUSKY=0` and use the Node version pinned in `.nvmrc` (24).

## Versioning & Build Info

Versioning is tracked in **GitHub Releases** (latest tag = current version), computed by semantic-release from
conventional commits (every type triggers at least a patch; `feat` → minor; breaking → major). Each release sets
Docker + git tags: immutable `vX.Y.Z` plus rolling `vX.Y`, `vX`, and `latest`. A zod-validated `public/build-info.json`
(served at `/build-info.json`) carries the version, full + short commit hash, and a link to the GitHub Release; the
build reads `BUILD_VERSION`/`GIT_SHA` env (Docker build-args) with a local git fallback. `next.config.ts` reads
`public/build-info.json` at config load and exposes it as `env.NEXT_PUBLIC_BUILD_INFO` (a JSON string), so the
**running** version is inlined into the bundle at build time. `useBuildInfo` (`hooks/useBuildInfo.ts`) returns this
inlined constant synchronously via `getRunningBuildInfo()` (`lib/build-info.ts`) — no `fetch`, no toast. The
`/build-info.json` endpoint (NetworkFirst, excluded from the precache) remains the **server/next** version, consumed by
the update banner and the launch gate. Full design in `specs/features/0001-versioning-and-releases.md`, tasks in
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
