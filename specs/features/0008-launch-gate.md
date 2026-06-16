# Feature Spec — Launch Gate

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §20, `specs/tasks/0008-launch-gate-tasks.md`

## 1. Summary

A dark **launch gate** that holds a skeleton of the app on screen until two things are true: the user's preferences have
hydrated from `localStorage` (so we never paint the wrong theme/accent), and the app is confirmed to be running the
**latest** version (so a launch after a deploy lands the user on the new build, not the cached old one). It folds in two
related pieces of work:

1. **A version-display fix.** Excluding `/build-info.json` from the precache (feature 0007/the update-check fix) made it
   NetworkFirst, so the footer and About dialog — which read it — now show the **server's** version instead of the
   **running** app's. This spec re-separates the two: the running version is **inlined into the bundle at build time**
   (so it is precached with the code and always matches it), while `/build-info.json` stays NetworkFirst as the
   **server/next** version for the update banner.
2. **A unified update flow.** The update banner now appears whenever **either** a service worker is waiting **or** the
   server reports a newer version than the running build, and the banner's action differentiates the two cases —
   activating an already-downloaded waiting worker, or forcing the download first when only the server is ahead.

It supersedes the launch-only auto-update added previously (the `updateAtLaunch` flag + the `AppShell` auto-apply
effect): the launch gate is the better home for "apply the update before the user sees the app," so that logic moves
into the gate and `updateAtLaunch` is removed.

There are three distinct "versions" in play — the **running** build (executing now, served from the active precache),
the **server** build (deployed now, reachable only over the network), and a **waiting** build (a new worker already
downloaded and parked by the browser, `skipWaiting: false`). The running build cannot introspect its own version, so it
must be told at build time; everything else follows from those three.

## 2. Goals

- The footer and About dialog show the **running** app's version — the one that matches the loaded code — sourced from a
  build-time constant inlined into the bundle (no runtime fetch, no failure toast).
- `/build-info.json` (NetworkFirst) remains the **server/next** version, used only by the update banner and the gate's
  comparison.
- A **dark** skeleton is the app's **initial paint**, eliminating today's white flash and the defaults→stored
  theme/accent flash.
- The gate reveals the real app only after **both**: preferences have hydrated from `localStorage`, **and** the version
  check has resolved.
- On launch, if the app is behind the server, the gate **downloads and applies** the new version (skip-waiting handshake
  - reload) **before** revealing — the user always starts on the latest build.
- The gate never hangs: a **capped wait** (per the agreed policy) reveals the cached app on slow/offline/stuck cases and
  falls back to the manual banner.
- The update banner shows on **either** a waiting worker **or** server-version-ahead; its action handles both
  (activate-waiting, or force-download-then-activate; plain reload only when no service worker is registered).
- Entirely client-side, respects the active color scheme, works at ≥375px, and preserves the active-timer-safety
  guarantee (a mid-session update is never auto-reloaded — only the manual banner applies it).

## 3. Non-Goals (v1 of this feature)

- **No second version file.** The running version is a build-inlined constant, not a precached `version.json`. (This
  approach was chosen over a second file during design.)
- **No periodic/background version polling beyond what exists.** Detection stays navigation-driven plus the existing
  60-minute `useUpdateCheck` poll; no Periodic Background Sync.
- **No mid-session auto-reload.** A worker that installs while the app is open still routes to the manual banner, never
  an automatic reload — a running timer is never silently discarded.
- **No skeleton theme-matching.** The skeleton is always dark (the agreed choice); it does not try to match a
  light-theme preference before reveal.
- **No offline forced-update.** When offline, the gate reveals the cached app; it does not block waiting for a network
  it cannot reach.
- **No new "what's new"/changelog UI.** The banner keeps its existing version + Release Notes link.
- **No persisted gate/dismissal state.** Banner dismissal stays per-version in React state (does not survive reload), as
  today.

## 4. The three versions and how each is sourced

| Version     | What it is                                             | Source                                                    | Consumed by                                  |
| ----------- | ------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------- |
| **Running** | The code executing now (active precache)               | **Build-inlined constant** (`NEXT_PUBLIC_BUILD_INFO`)     | Footer, About dialog, banner/gate baseline   |
| **Server**  | The build deployed right now                           | `GET /build-info.json` (NetworkFirst)                     | Update banner text, gate comparison          |
| **Waiting** | A new build already downloaded + parked by the browser | The Serwist `waiting` event (its existence is the signal) | Banner trigger, apply action, gate fast-path |

Key facts that drive the design:

- The browser checks for a new `sw.js` on **navigation** (page load / refresh) and whenever `serwist.update()` is
  called; `sw.js` is served `no-cache` (nginx) so the check is always fresh. There is no built-in periodic check.
- When `sw.js` differs, the browser downloads + installs the new worker (precaching all new assets), then — because
  `skipWaiting: false` — parks it as **waiting** and fires the `waiting` event. The download is automatic; we only
  decide **when to activate** it.
- A plain `window.location.reload()` is **intercepted by the active worker** and served from the old precache, so it
  cannot by itself fetch the server's version. "Get the latest from the server" therefore means **force the download
  (`serwist.update()`) → wait for `waiting` → skip-waiting handshake**, which converges with the waiting-worker path.

## 5. Running-version sourcing & the footer/About fix

### 5.1 Build-time inlining

`scripts/generate-build-info.ts` already writes `public/build-info.json` during `prebuild`/`predev`. `next.config.ts`
reads that just-generated file at config load and exposes it to the client bundle:

```ts
// next.config.ts (sketch)
import { readFileSync } from 'node:fs';
// build-info.json is written by the prebuild/predev step that runs before next build
const buildInfoJson = (() => {
  try {
    return readFileSync('./public/build-info.json', 'utf8');
  } catch {
    return ''; // dev/edge: useBuildInfo falls back to null
  }
})();

const nextConfig: NextConfig = {
  output: 'export',
  env: { NEXT_PUBLIC_BUILD_INFO: buildInfoJson },
};
```

Next statically replaces `process.env.NEXT_PUBLIC_BUILD_INFO` at build, so the value ships **inside the precached
bundle** and always matches the running code. Crucially, `tsc`/`eslint`/`vitest` see it as ordinary `string | undefined`
env access — **no generated `.ts` file to keep in sync, no extra pre-hooks, no CI plumbing.**

### 5.2 `useBuildInfo` becomes a synchronous constant

`hooks/useBuildInfo.ts` stops fetching. It reads `process.env.NEXT_PUBLIC_BUILD_INFO`, validates it with the existing
`buildInfoSchema`, and returns the `BuildInfo` (or `null` if absent/invalid). No `useEffect`, no `fetch`, no `sonner`
toast (a precached/inlined constant cannot fail at runtime). The hook signature (`(): BuildInfo | null`) is unchanged,
so `BuildInfoFooter` and `AboutDialog` call sites are untouched. The parsing/accessor logic lives in `lib/build-info.ts`
as `getRunningBuildInfo(): BuildInfo | null` so it is unit-testable without React.

Result: the footer and About dialog show the running version again; the banner (next §) shows the server version.

## 6. Launch Gate

### 6.1 Placement & rendering

`components/LaunchGate.tsx` is a `'use client'` component that wraps `children` **inside** the existing providers in
`app/layout.tsx` (so it can read `useSerwist()` and sits above `AppShell`). Its initial render is `AppSkeleton`; once
the reveal conditions are met it renders `children`. Because the gate's first render is the skeleton, the
**static-export HTML and the first paint are the dark skeleton** — no white flash.

### 6.2 Reveal conditions

The gate reveals (`children`) only when **both** hold:

1. **Preferences hydrated** — a one-tick "mounted" signal (`hooks/useHydrated.ts`). Because every `useLocalStorage`
   reads its stored value in the first post-mount effect flush and React batches those updates into a single re-render,
   theme/accent/timers are resolved by the first post-mount render — so revealing after it cannot show default values.
2. **Version check resolved** — the §6.3 state machine has reached a terminal `reveal` decision (either "up to date /
   offline / capped" or, after applying an update, the post-reload run where running == server).

### 6.3 Version-check state machine (capped-wait policy)

On mount (skeleton showing), the gate runs `hooks/useLaunchUpdate.ts`, which resolves to `{ ready: boolean }`:

- **No service worker** (`serwist === null`; dev or unsupported) → no SW update path → `ready` once hydrated.
- **A worker is already waiting** (`waiting` event with `wasWaitingBeforeRegister`) → an update is downloaded → call
  `applyUpdate()` (skip-waiting + reload); keep the skeleton up through the reload.
- **Otherwise**, fetch `/build-info.json` (server) and compare its `version` to the running constant:
  - **server === running** → up to date → `ready`.
  - **server !== running** → an update exists but isn't downloaded yet → call `applyUpdate()` (which forces the download
    via `serwist.update()`, waits for `waiting`, then activates + reloads); keep the skeleton up.
  - **fetch fails / offline** → can't update → reveal the cached app (`ready`).
- **Caps** (named constants, tunable): the initial decision is bounded by `GATE_VERSION_CHECK_TIMEOUT_MS` (**3 s**) — if
  no decision by then, reveal the cached app. Once an update is being applied, the apply is bounded by
  `GATE_UPDATE_APPLY_TIMEOUT_MS` (**10 s**) — if no activation/reload by then, reveal the cached app and let the manual
  banner (next §) take over.

After `applyUpdate()` reloads, the new bundle's running constant equals the server version → the gate resolves `ready`
on that fresh load and reveals. Net launch experience: skeleton → (optional download) → app, always on the latest build.

## 7. Update detection & banner

`hooks/useUpdateCheck.ts` is reworked to use the running constant as its baseline and to fire on either trigger. New
contract (the `updateAtLaunch` field added previously is **removed**):

```ts
interface UseUpdateCheckResult {
  update: BuildInfo | null; // the server build-info when an update is available (banner text); else null
  dismissUpdate: () => void; // per-version dismissal, React state only
}
```

Behavior:

- Subscribe to the Serwist `waiting` event → a waiting worker means an update is available.
- On mount and every `UPDATE_POLL_INTERVAL_MS` (60 min): call `serwist.update()` (force an SW check so a long-open tab
  notices a deploy) and fetch `/build-info.json` (server).
- **`update` is non-null when either** a worker is waiting **or** `server.version !== runningVersion` (the inlined
  constant). The value is the **server `BuildInfo`** (for the banner's version text + `releaseUrl`); if a `waiting`
  event arrives before a server fetch has succeeded, fetch `/build-info.json` to obtain the text (a real deploy's server
  version equals the waiting build).
- `dismissUpdate()` suppresses the banner for that server version (until a newer one appears), as today.
- The old `initialVersion` "first-fetch baseline" and the `swWaiting` retry bookkeeping are deleted — the running
  constant is the baseline, which removes the original "poisoned baseline" failure mode entirely.

Because `LaunchGate` resolves before `AppShell` (and thus `useUpdateCheck`) mounts, any launch-time update has already
been applied or dismissed-as-up-to-date; `useUpdateCheck` therefore handles **mid-session** updates → the manual banner,
preserving active-timer safety. `AppShell` passes `update`/`dismissUpdate`/`onRefresh` to `TimerList` → `UpdateBanner`
exactly as now; the auto-apply effect and `autoApplying` state added previously are removed.

## 8. Differentiated update action

`hooks/useApplyUpdate.ts` becomes the single "get me to the latest" action, self-contained (it tracks the waiting worker
via its own `waiting` subscription so it can branch without extra props):

1. **No service worker** (`serwist === null`) → `window.location.reload()`. With no precache, a plain reload genuinely
   fetches the latest (dev / unsupported).
2. **A worker is waiting** → register a one-shot `controlling` listener that reloads, then `messageSkipWaiting()`.
   Instant; the new build is already downloaded.
3. **No waiting worker** (server-ahead case) → `serwist.update()` to force the download, wait for the `waiting` event,
   then run the same skip-waiting handshake. Bounded by `UPDATE_APPLY_TIMEOUT_MS` (**10 s**) → on timeout, fall back to
   `window.location.reload()`.

This one action serves both the banner's **Update** button and the gate's apply step. Branches 2 and 3 differ only by
"is it downloaded yet?" and both end in the skip-waiting handshake.

## 9. Data Models & Validation

No change to `types/timer.ts` or `TimerConfig`. Reuses the existing `buildInfoSchema` (`lib/build-info.ts`) for both the
inlined running constant and the fetched server build-info — no parallel validation.

- `lib/build-info.ts` — add `getRunningBuildInfo(): BuildInfo | null` that parses `process.env.NEXT_PUBLIC_BUILD_INFO`
  with `buildInfoSchema.safeParse` and returns the data or `null`. Pure/testable; no React.
- `lib/constants.ts` — add `GATE_VERSION_CHECK_TIMEOUT_MS = 3_000`, `GATE_UPDATE_APPLY_TIMEOUT_MS = 10_000`, and
  `UPDATE_APPLY_TIMEOUT_MS = 10_000` (the force-download cap in `useApplyUpdate`). `BUILD_INFO_URL` already exists and
  stays the server endpoint.

## 10. App Integration & Components

- **`next.config.ts`** — read `public/build-info.json` at config load; expose it as `env.NEXT_PUBLIC_BUILD_INFO`.
- **`lib/build-info.ts`** — add `getRunningBuildInfo()` (§9).
- **`hooks/useBuildInfo.ts`** — return `getRunningBuildInfo()` synchronously; drop the fetch + toast + `useEffect`.
- **`hooks/useHydrated.ts`** (new) — returns `false` on first render, `true` after the first post-mount effect; the
  gate's "preferences hydrated" signal.
- **`hooks/useLaunchUpdate.ts`** (new) — the §6.3 state machine; consumes `useSerwist`, `useApplyUpdate`, the running
  constant, and a `/build-info.json` fetch; returns `{ ready: boolean }`.
- **`components/shared/AppSkeleton.tsx`** (new) — the always-dark, full-viewport skeleton (§11).
- **`components/LaunchGate.tsx`** (new) — renders `AppSkeleton` until `useHydrated()` && `useLaunchUpdate().ready`, then
  `children`.
- **`app/layout.tsx`** — wrap `children` in `<LaunchGate>` (inside the providers, above `AppShell`).
- **`app/globals.css`** — set a dark default document background so any pre-hydration sliver is dark, never white.
- **`hooks/useApplyUpdate.ts`** — the differentiated action (§8).
- **`hooks/useUpdateCheck.ts`** — the reworked detection (§7); remove `updateAtLaunch`.
- **`components/AppShell.tsx`** — remove the launch-only auto-apply effect + `autoApplying` state; revert
  `<TimerList update={...}>` to pass `update` directly.

## 11. UX Notes

- **Skeleton:** always dark (explicit dark neutral colors, independent of the `.dark` class so it is dark before
  `useTheme`'s effect runs), `fixed inset-0`, full viewport. Rough Timer-List shape: a header bar (logo-chip + wordmark
  placeholders + two menu-button circles), a width-limited column of 3–4 `animate-pulse` rounded-rectangle rows, and a
  footer line. No real text/data. `role="status"` + a visually-hidden "Loading Binome" for screen readers; `aria-busy`
  while shown.
- **No white flash:** the skeleton is the initial render (static HTML) and `globals.css` carries a dark default
  background, so the first paint is dark regardless of the resolved theme.
- **Reveal:** swap to the app once conditions are met; the app renders in the already-resolved theme/accent, so there is
  no second flash.
- **Banner:** unchanged placement (above the sticky header in the Timer List view), color-scheme-compliant, keyboard
  accessible; the action remains the single underlined **Update** control.
- All new surfaces respect light/dark and work at ≥375px.

## 12. Testing Strategy

- **`lib/build-info.ts`** — `getRunningBuildInfo`: valid `NEXT_PUBLIC_BUILD_INFO` JSON → parsed `BuildInfo`; absent →
  `null`; malformed/invalid → `null` (stub `process.env`).
- **`hooks/useBuildInfo.ts`** — returns the parsed running constant; returns `null` when the env var is absent; no fetch
  is performed (no `fetch` spy calls).
- **`hooks/useHydrated.ts`** — `false` on initial render, `true` after mount.
- **`hooks/useLaunchUpdate.ts`** — (fake timers + mocked `useSerwist`/`fetch`/`useApplyUpdate`):
  - no SW → `ready` true after hydration;
  - worker waiting at launch → calls `applyUpdate`, stays not-`ready` (skeleton held);
  - server === running → `ready`, no `applyUpdate`;
  - server !== running → calls `applyUpdate`, held;
  - fetch fails/offline → `ready` (reveal cached);
  - version-check cap (3 s) with no decision → `ready`;
  - apply cap (10 s) with no activation → `ready` + (banner fallback path exercised).
- **`components/shared/AppSkeleton.tsx`** — renders the `role="status"` region and the visually-hidden label; uses the
  fixed dark classes (not theme-token classes).
- **`components/LaunchGate.tsx`** — shows `AppSkeleton` while not ready; renders `children` once `useHydrated` &&
  `useLaunchUpdate().ready` (mock both hooks).
- **`hooks/useApplyUpdate.ts`** — no SW → `location.reload()`; waiting worker → `messageSkipWaiting()` + reload on
  `controlling`; no waiting worker → `serwist.update()` then handshake on `waiting`; apply-timeout → `location.reload()`
  fallback.
- **`hooks/useUpdateCheck.ts`** — `update` non-null when a worker is waiting; non-null when `server !== running`; `null`
  when `server === running` and nothing waiting; `dismissUpdate` suppresses that version; `serwist.update()` called per
  poll tick; `waiting`-listener registered/removed on mount/unmount; **no** `updateAtLaunch` in the result.
- **`components/AppShell.tsx`** — passes `update`/`dismissUpdate`/`onRefresh` to `TimerList`; no auto-apply at launch
  (the old launch-only tests are removed, since the gate owns that now).

## 13. Edge Cases

- **Offline launch** — `/build-info.json` NetworkFirst falls back to its runtime cache or fails; the gate reveals the
  cached app; no update is attempted.
- **Up-to-date launch** — server === running; the gate reveals as soon as the (fast) check resolves; no flash.
- **Deploy with byte-identical `sw.js`** (only `build-info.json` changed) — no new worker ever appears; the gate's apply
  cap (10 s) elapses → reveal cached app + banner. (Should not occur for a real deploy, which changes hashed assets.)
- **Stuck/slow SW download** — apply cap elapses → reveal + manual banner.
- **Slow network on an up-to-date app** — version-check cap (3 s) elapses → reveal cached app (correct, since it is the
  latest).
- **Mid-session deploy** — detected by the 60-min poll / next navigation → manual banner only; never an auto-reload
  (active-timer safety).
- **Dev (`disable` SW)** — no SW path; running constant and dev-served `/build-info.json` match → instant reveal after
  hydration; no gating.
- **Missing/!invalid `NEXT_PUBLIC_BUILD_INFO`** — `useBuildInfo` returns `null` (footer/About hide the version, as they
  already handle null); the gate treats an unknown running version as "cannot compare" and relies on the SW waiting
  signal + caps.

## 14. Rollout Notes

- **No new runtime dependencies** — reuses `serwist`/`@serwist/next`, `zod` (`buildInfoSchema`), and existing hooks.
- **Docs (planned, performed during implementation):** add **`specs/requirements.md` §20 (Launch Gate)** describing the
  three-version model, the skeleton/gating behavior, and the differentiated update action; update the **§15 Update
  Check** and **§16 PWA** sections to reflect that the banner now fires on waiting-worker-or-server-ahead and that
  launch updates are applied by the gate (not the removed `updateAtLaunch`). Update **`CLAUDE.md`**: the versioning/
  build-info note (running = inlined constant, server = NetworkFirst), the update-check note (rework + removed
  `updateAtLaunch`), the PWA "Active-timer safety" note (gate replaces the launch-only auto-apply), and add a Launch
  Gate entry.
- **No persisted-data migration** — no `localStorage` schema change; preference keys and `TimerConfig` are unchanged.
- **Supersedes prior work:** removes `updateAtLaunch` from `useUpdateCheck` and the `AppShell` launch-only auto-apply
  effect, folding launch-time updating into `LaunchGate`.
