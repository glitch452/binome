# Feature Spec — Update Check

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §15, `specs/tasks/0003-update-check-tasks.md`

## 1. Summary

Because Binome is a browser SPA, users who leave the page open get the version that was loaded at page start — they
never see updates until they reload. This feature lets the app detect when a new tagged release has been deployed and
notify the user with a dismissible banner in the Timer List view. The app polls `/build-info.json` every 60 minutes and
compares the response to the version captured on page load. When the server is running a newer release (identified by a
non-null `releaseUrl` and a changed `version` string), a banner appears with the new version number, a link to the
GitHub Release notes, and a one-click "Refresh" action.

## 2. Goals

- Poll `/build-info.json` every **60 minutes** after the page loads to detect a newly-deployed version.
- Trigger the banner only for **tagged releases** (polled `releaseUrl !== null`), not for intermediate dev builds.
- Surface a **non-intrusive, dismissible banner** at the top of the Timer List view only — never in the Run View.
- Banner shows the **new version number**, a **link to the GitHub Release notes** (`releaseUrl`), and a **Refresh**
  button that calls `window.location.reload()`.
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

### 4.1 Initial capture

When `useUpdateCheck` mounts, it immediately fetches `/build-info.json` and validates the response against the existing
`buildInfoSchema`. On success the `version` string is stored in a ref (`initialVersion`) for the lifetime of the hook.
This fetch is intentionally separate from the one in `useBuildInfo` (used by `BuildInfoFooter`) to keep the hooks
independent; the small duplicate request is acceptable for a single-user app. **The polling interval is started
regardless of whether this initial fetch succeeds.** If it fails or returns an invalid response, `initialVersion` stays
`null` — the first successful poll will then establish the baseline (see §4.2).

### 4.2 Polling

A `setInterval` fires every `UPDATE_POLL_INTERVAL_MS` (60 minutes). Each tick:

1. `fetch('/build-info.json')` — if the response is not `ok`, silently skip.
2. `buildInfoSchema.safeParse(await res.json())` — if validation fails, silently skip.
3. If `initialVersion === null`, **set `initialVersion` to the polled `version` and stop** — this is the first
   successful response after a failed initial fetch; it establishes the baseline silently without flagging an update.
4. Compare: the update is flagged when both of these conditions hold:
   - `polled.releaseUrl !== null` (the deployed build is a properly-tagged release)
   - `polled.version !== initialVersion` (it differs from the baseline established at or shortly after page start)
5. If flagged, call `setDetectedUpdate(polledBuildInfo)`.

The interval is started once (inside a single `useEffect`) and cleared on unmount. Polling continues even after an
update is detected so that a still-newer release can be caught after the user dismisses the first banner.

### 4.3 Dismissal

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
- A `"Refresh"` button that calls `window.location.reload()`.
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

- **`hooks/useUpdateCheck.ts`** — new hook; performs the initial fetch, manages the `setInterval`, holds
  `detectedUpdate: BuildInfo | null` and `dismissedVersion: string | null` in state; exposes
  `{ update: BuildInfo | null, dismissUpdate: () => void }`. Exports `UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000` as a
  named constant (used by tests to assert interval length without magic numbers).
- **`components/timer-list/UpdateBanner.tsx`** — new component; props `{ update: BuildInfo; onDismiss: () => void }`.
  Renders the message, release-notes link, refresh button, and dismiss button. Full color-scheme and ≥375px support.
  Co-located test.
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
- The `"Refresh"` and `"Release Notes"` actions must be keyboard-accessible with visible focus rings.
- The dismiss button must have an `aria-label="Dismiss update notification"`.
- The banner as a whole should have `role="status"` or `role="alert"` so screen readers announce it.

## 9. Testing Strategy

- **`hooks/useUpdateCheck.ts`**
  - Initial fetch failure → `initialVersion` stays null → interval still starts → first successful poll sets
    `initialVersion` silently (no banner); second poll with a different tagged version then flags the update.
  - Initial fetch succeeds; poll returns same version → `update` is `null`.
  - Initial fetch succeeds; poll returns a tagged release with a different version → `update` exposes the polled
    `BuildInfo`.
  - Poll returns a different version but with `releaseUrl === null` → `update` is `null` (dev build, not flagged).
  - `dismissUpdate()` called after update detected → `update` becomes `null` for that version.
  - After dismissal, poll returns a still-newer tagged version → `update` becomes non-null again.
  - Failed poll (network error or non-ok response) is silently ignored; `update` does not change.
  - Interval is set to `UPDATE_POLL_INTERVAL_MS`; `clearInterval` is called on unmount.
- **`components/timer-list/UpdateBanner.tsx`**
  - Renders the version string extracted from `update.version`.
  - Release-notes link uses `update.releaseUrl`, opens in a new tab, has `ExternalLink` icon.
  - `"Refresh"` button calls `window.location.reload()`.
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

- **Initial fetch fails** — `initialVersion` stays null; polling still starts. The first successful poll establishes the
  baseline silently; subsequent polls can then detect updates normally.
- **Poll network error** — caught, silently ignored, next poll fires in 60 minutes.
- **Server rolled back to an older tagged version** — still triggers the banner (`version` changed and
  `releaseUrl !== null`). The user refreshes, loads the rolled-back version, and the next poll will show no update.
  Acceptable.
- **User on Run View when poll fires** — `detectedUpdate` is set in state; banner is ready for the next time the user
  returns to the list view.
- **Same update detected on consecutive polls** — `setDetectedUpdate` is called with an equal object each time; React
  bails out only if referential identity is preserved. Since each fetch creates a new object, state updates fire, but
  the rendered output is identical (version string is the same). This is benign.
- **No initial build-info (truly blank dev environment)** — `useBuildInfo` may not have loaded either; the feature stays
  dormant. No collision.
- **Tab backgrounded overnight** — browsers throttle `setInterval` in inactive tabs; the poll may fire less frequently
  than 60 minutes. This is acceptable — the update check is best-effort.

## 11. Rollout Notes

- No new runtime dependencies.
- `specs/requirements.md`: add **§15 Update Check** describing the 60-minute polling behavior, trigger conditions, and
  banner. Implement during the build phase, not at spec time.
- `CLAUDE.md`: add a brief note about `useUpdateCheck` and `UpdateBanner` to the architecture section. Implement during
  the build phase.
- No persisted-data migration required.
