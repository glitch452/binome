# Feature Spec — Update Check

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §15, `specs/tasks/0003-update-check-tasks.md`

## 1. Summary

Because Binome is a browser SPA, users who leave the page open get the version that was loaded at page start — they
never see updates until they reload. This feature lets the app detect when a new release has been deployed and notify
the user with a dismissible banner in the Timer List view. The app polls `/build-info.json` every 60 minutes and
compares the **server** version against the **running** version inlined into the bundle at build time. When they differ,
a banner appears with the new version number, a link to the GitHub Release notes, and a one-click **Update** action.

**Post-PWA amendment:** once the service-worker precache shipped (feature 0004) the detection picked up a second trigger
— the service worker's `waiting` event, the signal that survives a reload onto a stale precache. Both triggers route
through one `flagIfNewer` guard against the inlined running constant. See §4.

**Post-launch-gate amendment:** with the launch gate (feature 0008) owning launch-time detection and the auto-update on
a worker parked at launch, `useUpdateCheck` is now purely the **mid-session** path, which always routes to the manual
banner (active-timer safety). See §4 and `specs/features/0008-launch-gate.md`.

## 2. Goals

- Poll `/build-info.json` every **60 minutes** after the page loads to detect a newly-deployed version.
- Trigger the banner only when the **server** version differs from the **inlined running** version (`flagIfNewer`);
  never when they match.
- Surface a **non-intrusive, dismissible banner** at the top of the Timer List view only — never in the Run View.
- Banner shows the **new version number**, a **link to the GitHub Release notes** (`releaseUrl`), and an **Update**
  button that invokes `useApplyUpdate()`'s differentiated action (§5.1).
- Dismissal is **per-version**: clicking X hides the banner for that version. If a subsequent poll detects a still-newer
  release, the banner reappears.
- Polling continues even while the Run View is active so the banner is ready when the user returns to the list.
- All implementation is **client-side only** — no backend, no additional persistence. Dismissal state lives in React
  memory and does not survive a page reload (which would bring the latest code anyway).
- Failed polls are **silently ignored** — no toast, no error state — so transient network issues do not disturb the
  user.

## 3. Non-Goals (v1 of this feature)

- Persisting the dismissal across page reloads or tabs (a reload always loads the latest version, so persistence adds no
  value).
- Polling while the page is hidden / backgrounded with reduced frequency (standard `setInterval` is used; browsers
  throttle or pause timers in inactive tabs, which is acceptable behaviour here).
- Showing the banner in the Run View.
- Custom poll intervals set by the user.
- A "What's new" changelog inline in the app (the link to GitHub Releases covers this).
- Downgrade detection or rollback support.

## 4. Update Detection

`useUpdateCheck` flags a mid-session update by comparing the **server** version (fetched from `/build-info.json`,
NetworkFirst) against the **running** version inlined into the bundle at build time (`getRunningBuildInfo()?.version`).
The running constant is the authoritative baseline — there is no fetched `initialVersion` ref and no `swWaiting` retry
bookkeeping. (Removing them eliminated the "poisoned-baseline" failure mode: with the precache serving the old shell
after a deploy, a fetched baseline captured at page start would equal the new server version and the compare could never
fire. The inlined constant always reflects the loaded code, so the compare is reliable.)

The two runtime states are **SW-controlled** (a service worker is registered — every production return visit, and the
rest of a session after first install) and **no-SW** (development, where the worker is disabled, or an unsupported
browser; `serwist === null`). Detection is identical in both: the `waiting`-event trigger simply doesn't fire in the
no-SW state. (Launch-time detection and the auto-update on a waiting-at-launch worker are owned by `LaunchGate` /
`useLaunchUpdate` — see `specs/features/0008-launch-gate.md`; `useUpdateCheck` handles only mid-session updates, which
always route to the manual banner.)

### 4.1 The single guard: `flagIfNewer`

A shared guard `flagIfNewer(info)` is the only path to `setDetectedUpdate`. It flags the update only when **all** hold:

- `info !== null` (the fetch succeeded and validated against `buildInfoSchema`);
- `getRunningBuildInfo()?.version` is known (the inlined running constant is present); and
- `info.version !== runningVersion`.

When the running version is unknown (absent `NEXT_PUBLIC_BUILD_INFO`), neither trigger flags from version numbers alone
— the feature stays dormant rather than raising a false banner. The flagged value is the **server `BuildInfo`** (its
`version` text and `releaseUrl` drive the banner).

**The version guard on the `waiting` trigger is deliberate.** A waiting worker is a fully downloaded update, but **in
production it always carries a newer version** (every release bumps it). Confirming against the running constant
therefore suppresses a spurious "update to the version you're already on" banner from a same-version local rebuild, a
duplicate registration, or a worker parked for the version the launch gate already revealed — without affecting the real
production case.

### 4.2 The two triggers

Both triggers route through `flagIfNewer`:

1. **Serwist `waiting` event** (SW-controlled only). `useUpdateCheck` subscribes to the Serwist window instance
   (`useSerwist()`); on `waiting` it fetches `/build-info.json` and calls `flagIfNewer`. In production this fires for a
   worker that installs and parks **mid-session** (`skipWaiting: false`, §16) — a worker parked **at launch** is handled
   by the gate before `AppShell` mounts.
2. **Mount fetch + 60-minute poll.** On mount and on every `UPDATE_POLL_INTERVAL_MS` (60 minutes) tick, the hook fetches
   `/build-info.json` and calls `flagIfNewer`. Each poll tick first calls `serwist?.update()` so a long-open tab asks
   the browser to look for a new `sw.js` (a found update installs, parks, and fires `waiting` above).

### 4.3 Mount inspection of `registration.waiting`

There is a race the live `waiting` listener cannot catch: `useUpdateCheck` mounts only **after** the launch gate
reveals, so a worker that parked **during** the gate has already fired its `waiting` event, and `serwist.update()` will
not re-fire it for an already-waiting worker. The banner would never appear until a still-newer deploy.

To close it, the mount effect — when `serwist !== null` and `'serviceWorker' in navigator` — also calls
`navigator.serviceWorker.getRegistration()` and, if `registration?.waiting` is present, runs the same
`fetchBuildInfo().then(flagIfNewer)` path. This is **detection only**: it never applies an update (active-timer safety)
and is still gated by `flagIfNewer`, so it cannot raise a same-version banner.

### 4.4 Dismissal

`useUpdateCheck` holds a `dismissedVersion: string | null` in React state. The computed `update` that callers receive is
`detectedUpdate` when `detectedUpdate !== null && detectedUpdate.version !== dismissedVersion`, otherwise `null`.
Calling `dismissUpdate()` sets `dismissedVersion = detectedUpdate.version`, hiding the banner. If a later poll sets
`detectedUpdate` to a different version string, `update` becomes non-null again and the banner reappears.

## 5. Update Banner

### 5.1 Content and layout

`UpdateBanner` is a full-width, visually distinct strip rendered above the main Timer List content. It contains:

- A brief message: `"A new version of Binome is available: vX.Y.Z"` where `X.Y.Z` is extracted from the polled `version`
  string (same `SEMVER_RE` logic used in `BuildInfoFooter` to strip the `v` prefix and fall back to the raw string if
  parsing fails).
- A `"Release Notes"` link (`<a href={update.releaseUrl} target="_blank" rel="noreferrer">`) with a small `ExternalLink`
  icon (matching the style in `BuildInfoFooter`).
- An **"Update"** button that invokes the `onRefresh` prop. `UpdateBanner` stays presentational — `AppShell` composes
  `onRefresh` as `() => applyUpdate({ reloadNow: true })`, so in the SW-controlled state the apply just reloads onto the
  new build (`messageSkipWaiting()` + `window.location.reload()`): a reload reliably adopts the parked/active worker
  even on Safari, where `skipWaiting()` is ignored while a client is open, and the launch gate guarantees the fresh page
  loads the newest version. (The launch gate shares the same `applyUpdate` but passes no options, keeping its
  activate-and-reload-once handshake.) In the no-SW state `applyUpdate` does a cache-busting reload instead. On click
  the button shows a disabled "Updating…" loading state (`isApplyingUpdate`, owned by `AppShell` and threaded down). See
  `specs/requirements.md` §16.4 and §20.3.
- An X (`"Dismiss"`) icon button on the trailing edge that calls `onDismiss`.

### 5.2 Placement

`UpdateBanner` is rendered inside `TimerList`, in a shared sticky wrapper that also contains the existing list
`<header>`. Both elements are children of a single `<div className="sticky top-0 z-10">` container (the `z-10` moves
from the header element itself to this wrapper; the header is no longer independently sticky). The banner is the first
child of the wrapper so it appears above the header:

```tsx
<div className="sticky top-0 z-10">
  {update !== null && <UpdateBanner update={update} onDismiss={onDismissUpdate} />}
  <header className="bg-background border-b ...">…</header>
</div>
```

This approach ensures the banner and header always stick as a single unit — no dynamic height measurement or CSS
variable is needed to keep the header from sliding behind the banner.

`AppShell` passes `update: BuildInfo | null` and `onDismissUpdate: () => void` as new props to `TimerList`. The hook
remains in `AppShell` so polling continues while the Run View is shown; these props are only forwarded when `TimerList`
is rendered (the Run View does not receive them). When `update` is `null`, the wrapper renders only the header and is
visually identical to the current layout.

## 6. Data Models & Validation

No change to `types/timer.ts` or any existing data schema. No new `localStorage` key.

The polling response is validated with the existing `buildInfoSchema` from `lib/build-info.ts` — no new Zod schema
needed.

## 7. App Integration & Components

- **`hooks/useUpdateCheck.ts`** — new hook; routes the Serwist `waiting` event, the mount fetch + 60-minute poll, and
  the mount `registration.waiting` inspection (§4.2–4.3) through the single `flagIfNewer` guard (§4.1); holds
  `detectedUpdate: BuildInfo | null` and `dismissedVersion: string | null` in state; exposes
  `{ update: BuildInfo | null, dismissUpdate: () => void }`. `UPDATE_POLL_INTERVAL_MS` lives in `lib/constants.ts` (60
  minutes; overridable via `NEXT_PUBLIC_UPDATE_POLL_INTERVAL_MS` for local testing).
- **`components/timer-list/UpdateBanner.tsx`** — new component; props
  `{ update: BuildInfo; onDismiss: () => void; ... }`. Renders the message, release-notes link, the **Update** button
  (invokes its `onRefresh` prop — presentational only, see §5.1), and the dismiss button. Full color-scheme and ≥375px
  support. Co-located test.
- **`components/timer-list/TimerList.tsx`** — edited; accepts new props `update: BuildInfo | null` and
  `onDismissUpdate: () => void`; wraps the existing `<header>` and `<UpdateBanner>` in a shared `sticky top-0 z-10`
  container (removing `sticky`/`z-10` from the `<header>` element itself).
- **`components/AppShell.tsx`** — edited; mounts `useUpdateCheck`; passes `update` and `dismissUpdate` to `<TimerList>`.

## 8. UX Notes

- The banner and the list header stick together as a unit via their shared `sticky top-0 z-10` wrapper — the banner
  stays visible whenever the header is visible, and scrolls away together with the header if the wrapper were ever made
  non-sticky (it won't be, but the coupling is intentional).
- The banner must be visually distinguishable from the rest of the page without relying on color alone — an icon (e.g.
  `Info` or `RefreshCw` from `lucide-react`) alongside the text satisfies this.
- At ≥375px, the message, links, and dismiss button must remain readable without overflow. If necessary, the version and
  links may wrap to a second line; the dismiss button stays on the trailing edge.
- The banner must respect the active color scheme. Use semantic Tailwind tokens (`bg-muted`, `border`, etc.) rather than
  hard-coded colors.
- The **"Update"** and `"Release Notes"` actions must be keyboard-accessible with visible focus rings.
- The dismiss button must have an `aria-label="Dismiss update notification"`.
- The banner as a whole should have `role="status"` or `role="alert"` so screen readers announce it.

## 9. Testing Strategy

- **`hooks/useUpdateCheck.ts`**
  - Mount fetch returns a version different from the running constant → `update` exposes the fetched `BuildInfo`.
  - Server version equals the running version → `update` is `null` (gated by `flagIfNewer`).
  - Running constant absent → `update` stays `null` even when versions differ (no flagging from version numbers alone).
  - `dismissUpdate()` called after update detected → `update` becomes `null` for that version; a later trigger with a
    still-newer version re-shows the banner.
  - Failed fetch (network error or non-ok response) is silently ignored; `update` does not change.
  - Interval is set to `UPDATE_POLL_INTERVAL_MS`; `clearInterval` is called on unmount.
  - `waiting` event with a different server version → `update` exposes the fetched `BuildInfo`; same-version waiting
    worker → no banner (the guard suppresses it).
  - Mount `registration.waiting` set → `update` exposes the fetched `BuildInfo`; no waiting worker → no banner from this
    path; same server/running version → still no banner (gated by `flagIfNewer`).
  - `serwist.update()` is called on each poll tick, and not before the first tick.
  - The `waiting` listener is registered on mount and removed on unmount.
- **`components/timer-list/UpdateBanner.tsx`**
  - Renders the version string extracted from `update.version`.
  - Release-notes link uses `update.releaseUrl`, opens in a new tab, has `ExternalLink` icon.
  - The **"Update"** button calls its `onRefresh` prop.
  - Dismiss button calls `onDismiss`.
  - Dismiss button has `aria-label="Dismiss update notification"`.
- **`components/timer-list/TimerList.tsx`** (extend existing tests)
  - `UpdateBanner` is rendered inside the sticky wrapper when `update` prop is non-null.
  - `UpdateBanner` is absent when `update` prop is null; only the header is in the wrapper.
- **`components/AppShell.tsx`** (extend existing tests)
  - `TimerList` receives a non-null `update` prop when the hook returns one and the list view is active.
  - `TimerList` receives a null `update` prop when no update is available.
  - `TimerList` is not rendered when the run view is active (banner never appears in the run view by construction).

## 10. Edge Cases

- **Stale precache at launch (e.g. a Safari refresh after a deploy)** — the old shell loads from the precache while
  `/build-info.json` already reports the new version. Because detection compares the **server** version against the
  **inlined running constant** (not a fetched baseline), the compare fires correctly: server ≠ running → banner. The
  waiting worker, if present, also drives the banner via the `waiting` trigger or the mount `registration.waiting`
  inspection (§4.3).
- **Worker parks during the launch gate** — the gate may reveal before `useUpdateCheck` subscribes, so the live
  `waiting` listener misses the already-fired event. The mount `registration.waiting` inspection (§4.3) surfaces the
  banner anyway.
- **Server build-info ahead of the deployed `sw.js` (CDN/deploy lag)** — the poll flags the banner (server ≠ running);
  the user clicks **Update**, which reloads the page (§5.1). The reloaded launch gate finds no new worker either and
  reveals the same build, so the banner reappears on the next poll until the new `sw.js` actually deploys. No silent
  no-op — the reload is always a real navigation.
- **Poll network error** — caught, silently ignored, next poll fires in 60 minutes.
- **Server rolled back to an older version** — still triggers the banner (`version` differs from running). The user
  updates, loads the rolled-back version, and the next poll shows no update. Acceptable.
- **User on Run View when a trigger fires** — `detectedUpdate` is set in state; the banner is ready for the next time
  the user returns to the list view (it never renders in the Run View).
- **Same update detected on consecutive polls** — `setDetectedUpdate` is called with an equal-version object each time;
  the rendered banner is identical. Benign.
- **Absent running constant** (`NEXT_PUBLIC_BUILD_INFO` unset) — `flagIfNewer` never flags from version numbers; the
  feature stays dormant rather than showing a false banner.
- **First-ever visit** — the page arrives over the network, so running == server, no banner; the gate reveals
  immediately while the worker installs in the background. Not a distinct runtime state (see §4).
- **Tab backgrounded overnight** — browsers throttle `setInterval` in inactive tabs; the poll may fire less frequently
  than 60 minutes. Acceptable — the update check is best-effort.

## 11. Rollout Notes

- No new runtime dependencies.
- `specs/requirements.md`: add **§15 Update Check** describing the 60-minute polling behavior, trigger conditions, and
  banner. Implement during the build phase, not at spec time.
- `CLAUDE.md`: add a brief note about `useUpdateCheck` and `UpdateBanner` to the architecture section. Implement during
  the build phase.
- No persisted-data migration required.
