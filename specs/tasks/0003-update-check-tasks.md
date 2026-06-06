# Update Check — Task List

Derived from `specs/features/0003-update-check.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — Hook

- [x] **UC-01** Add `hooks/useUpdateCheck.ts`: export `UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000` and implement
      `useUpdateCheck()` returning `{ update: BuildInfo | null, dismissUpdate: () => void }`. On mount, fetch
      `/build-info.json`, validate with `buildInfoSchema`, and store the `version` string in a ref (`initialVersion`).
      Start a `setInterval` at `UPDATE_POLL_INTERVAL_MS` **regardless** of whether the initial fetch succeeds. On each
      tick: fetch and validate `/build-info.json`; if `initialVersion === null`, set it to the polled `version` and
      return (establishes the baseline silently, no banner); otherwise call `setDetectedUpdate(polled)` only when
      `polled.releaseUrl !== null && polled.version !== initialVersion`. Silently ignore all fetch/parse errors. Hold
      `detectedUpdate: BuildInfo | null` and `dismissedVersion: string | null` in React state. Expose `update` as
      `detectedUpdate` when `detectedUpdate !== null && detectedUpdate.version !== dismissedVersion`, else `null`.
      `dismissUpdate()` sets `dismissedVersion = detectedUpdate.version`. Clear the interval on unmount. Co-locate
      `hooks/useUpdateCheck.test.ts`: initial fetch failure → interval still starts → first successful poll sets
      baseline silently (no banner) → second poll with newer tagged version flags the update; initial fetch succeeds,
      poll returns same version → `update` null; new tagged version on poll → `update` exposes the polled `BuildInfo`;
      polled version with `releaseUrl === null` → `update` null; `dismissUpdate()` hides that version; subsequent poll
      with a newer version re-exposes; failed poll silently ignored; interval duration equals `UPDATE_POLL_INTERVAL_MS`;
      `clearInterval` called on unmount. **Verify:** `npm run type`.

## Phase B — Banner component

- [ ] **UC-02** Implement `components/timer-list/UpdateBanner.tsx` — props
      `{ update: BuildInfo; onDismiss: () => void }`. Extract the display version from `update.version` using the same
      `SEMVER_RE` pattern as `BuildInfoFooter` (strip leading `v`, fall back to the raw string). Render: an info-style
      icon (`Info` from `lucide-react`) + text `"A new version of Binome is available: vX.Y.Z"`; an
      `<a href={update.releaseUrl} target="_blank"     rel="noreferrer">` `"Release Notes"` link with a trailing
      `ExternalLink` icon; a `"Refresh"` button that calls `window.location.reload()`; an icon button on the trailing
      edge with `aria-label="Dismiss update notification"` that calls `onDismiss`. Apply `role="status"` on the banner
      container. Use semantic Tailwind tokens (`bg-muted`, `border`, etc.) for color-scheme safety. Ensure content wraps
      gracefully at ≥375px. Co-locate `components/timer-list/UpdateBanner.test.tsx`: renders extracted version string;
      release-notes link points to `update.releaseUrl` and has `target="_blank"`; Refresh button calls
      `window.location.reload()`; dismiss button calls `onDismiss`; dismiss button has the correct `aria-label`.
      **Verify:** `npm run type`.

## Phase C — Wire into AppShell

- [ ] **UC-03** Edit `components/timer-list/TimerList.tsx`: add props `update: BuildInfo | null` and
      `onDismissUpdate: () => void`; wrap the existing `<header>` in a new `<div className="sticky top-0 z-10">`
      container, removing `sticky` and `z-10` from the `<header>` element itself; render
      `{update !== null && <UpdateBanner update={update} onDismiss={onDismissUpdate} />}` as the first child of that
      wrapper, above the header. Edit `components/AppShell.tsx`: call `useUpdateCheck()` and pass `update` and
      `dismissUpdate` as props to `<TimerList>`. Extend `components/TimerList.test.tsx`: banner renders inside the
      sticky wrapper when `update` prop is non-null; banner is absent when `update` is null. Extend
      `components/AppShell.test.tsx`: `TimerList` receives a non-null `update` prop when the hook reports one; receives
      null when no update is available. **(no unit test for wiring itself; assertions are in the component tests)**
      **Verify:** `npm run type`.

## Phase D — Documentation

- [ ] **UC-04** Add `specs/requirements.md` §15 (Update Check): describe the 60-minute poll of `/build-info.json`, the
      tagged-release trigger (`releaseUrl !== null` + changed `version`), the dismissible banner, and the per-version
      dismissal memory. Update `CLAUDE.md`: add a brief note about `useUpdateCheck` and `UpdateBanner` to the
      architecture section (alongside the `TimerFontSizeContext` / `FontSizeToggle` note). Confirm both match the
      implementation. **(no unit test)**

## Phase E — Verification

- [ ] **UC-05** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual: leave the app open; mock or temporarily reduce `UPDATE_POLL_INTERVAL_MS` to verify the banner appears when
      the served `build-info.json` is replaced with a newer tagged version; confirm the banner does not appear for a dev
      build (`releaseUrl: null`); dismiss the banner and confirm it hides; swap to a still-newer version and confirm the
      banner reappears; confirm the banner is absent in the Run View; confirm the Release Notes link opens the correct
      GitHub Release; confirm Refresh reloads the page. **(no unit test)**
