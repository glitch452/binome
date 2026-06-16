# Launch Gate — Task List

Derived from `specs/features/0008-launch-gate.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — Running-version constant & display fix

- [x] **LG-01** Inline the running build info: in `next.config.ts`, read `public/build-info.json` (written by the
      prebuild/predev step) at config load and expose it as `env.NEXT_PUBLIC_BUILD_INFO` (a JSON string; empty string
      when the file is absent). **(no unit test)** **Verify:** `npm run build` emits the bundle with the value inlined;
      `npm run type`.
- [x] **LG-02** Add `getRunningBuildInfo(): BuildInfo | null` to `lib/build-info.ts` — parse
      `process.env.NEXT_PUBLIC_BUILD_INFO` with the existing `buildInfoSchema.safeParse`, returning the data or `null`.
      Reuse `buildInfoSchema`; do **not** add parallel validation. Co-locate in `lib/build-info.test.ts`: valid JSON →
      parsed `BuildInfo`; absent env → `null`; malformed/invalid → `null` (stub `process.env`). **Verify:**
      `npm run type`.
- [x] **LG-03** Rework `hooks/useBuildInfo.ts` to return `getRunningBuildInfo()` synchronously — remove the `fetch`,
      `useEffect`, and `sonner` toasts. Keep the `(): BuildInfo | null` signature so `BuildInfoFooter`/`AboutDialog`
      call sites are untouched. Update `hooks/useBuildInfo.test.ts`: returns the parsed running constant; returns `null`
      when the env var is absent; performs no `fetch`.

## Phase B — Constants

- [x] **LG-04** Add timeout constants to `lib/constants.ts`: `GATE_VERSION_CHECK_TIMEOUT_MS = 3_000`,
      `GATE_UPDATE_APPLY_TIMEOUT_MS = 10_000`, `UPDATE_APPLY_TIMEOUT_MS = 10_000`. Extend `lib/constants.test.ts` if it
      asserts the constant set. **Verify:** `npm run type`.

## Phase C — Update detection & action rework

- [x] **LG-05** Rework `hooks/useApplyUpdate.ts` into the differentiated action: no SW → `window.location.reload()`;
      worker waiting → one-shot `controlling` listener that reloads, then `messageSkipWaiting()`; no waiting worker →
      `serwist.update()`, wait for the `waiting` event, then the same handshake, with a `UPDATE_APPLY_TIMEOUT_MS`
      fallback to `window.location.reload()`. Track the waiting worker via its own `waiting` subscription. Update
      `hooks/useApplyUpdate.test.tsx`: each of the four branches (no-SW reload, waiting handshake, force-download-then-
      handshake, apply-timeout reload).
- [x] **LG-06** Rework `hooks/useUpdateCheck.ts` to the new contract `{ update: BuildInfo | null, dismissUpdate }` —
      **remove `updateAtLaunch`**. `update` is non-null when a worker is waiting **or** `server.version !==`
      `getRunningBuildInfo()?.version`; value is the fetched server `BuildInfo` (fetch on the `waiting` event if not yet
      fetched). Keep the 60-min poll calling `serwist.update()`. Delete the `initialVersion` baseline and `swWaiting`
      retry bookkeeping. Update `hooks/useUpdateCheck.test.ts`: waiting worker → non-null; `server !== running` →
      non-null; `server === running` && nothing waiting → `null`; `dismissUpdate` suppresses that version;
      `serwist.update()` per poll tick; `waiting` listener registered/removed; no `updateAtLaunch` field.

## Phase D — Gate hooks

- [x] **LG-07** Add `hooks/useHydrated.ts` — returns `false` on first render, `true` after the first post-mount effect.
      Co-locate `hooks/useHydrated.test.ts`: `false` initially, `true` after mount.
- [x] **LG-08** Add `hooks/useLaunchUpdate.ts` — the §6.3 state machine returning `{ ready: boolean }`: no SW → `ready`
      after hydration; worker waiting at launch → `applyUpdate()`, held; fetch `/build-info.json` and compare to
      `getRunningBuildInfo()` → equal `ready`, differ `applyUpdate()` held, fetch-fail `ready`; `GATE_VERSION_CHECK_`
      `TIMEOUT_MS` cap → `ready`; `GATE_UPDATE_APPLY_TIMEOUT_MS` cap during apply → `ready`. Consumes `useSerwist`,
      `useApplyUpdate`. Co-locate `hooks/useLaunchUpdate.test.ts` (fake timers; mock `useSerwist`/`useApplyUpdate`/
      `fetch`): all branches above.

## Phase E — Skeleton & gate component

- [x] **LG-09** Add `components/shared/AppSkeleton.tsx` — always-dark, `fixed inset-0`, full-viewport rough Timer-List
      skeleton (header chip + wordmark + two menu circles; 3–4 `animate-pulse` rows; footer line) using fixed dark
      classes (independent of the `.dark` class). `role="status"`, `aria-busy`, visually-hidden "Loading Binome".
      Co-locate test: renders the `status` region + visually-hidden label; uses the fixed dark classes (not theme
      tokens).
- [x] **LG-10** Add `components/LaunchGate.tsx` — renders `AppSkeleton` until `useHydrated()` &&
      `useLaunchUpdate().ready`, then renders `children`. Co-locate test (mock both hooks): shows skeleton while not
      ready; renders children once ready.

## Phase F — Wire into the layout & first-paint

- [x] **LG-11** Edit `app/layout.tsx` to wrap `children` in `<LaunchGate>` (inside the providers, above `AppShell`), and
      add a dark default document background in `app/globals.css` so the pre-hydration first paint is dark, never white.
      **(no unit test)** **Verify:** `npm run build`; manual — first paint is the dark skeleton.
- [x] **LG-12** Edit `components/AppShell.tsx` to remove the launch-only auto-apply effect + `autoApplying` state and
      revert `<TimerList update={...}>` to pass `update` directly (the gate now owns launch updating). Update
      `components/AppShell.test.tsx`: drop the launch-only auto-apply tests; keep banner-wiring tests (passes
      `update`/`dismissUpdate`/`onRefresh`; no auto-apply at launch). Update the `useUpdateCheck` mock shape in
      `AppShell.test.tsx` and `AppShell.integration.test.tsx` to the new `{ update, dismissUpdate }`.

## Phase G — Documentation

- [x] **LG-13** Add `specs/requirements.md` §20 (Launch Gate: three-version model, skeleton/gating, differentiated
      action) and update §15 (Update Check) + §16 (PWA) to reflect the both-triggers banner and gate-applied launch
      updates (removed `updateAtLaunch`). Update `CLAUDE.md`: build-info note (running = inlined constant, server =
      NetworkFirst), update-check note (rework + removed `updateAtLaunch`), PWA "Active-timer safety" note (gate
      replaces launch-only auto-apply), and add a Launch Gate entry. Confirm all match the implementation. **(no unit
      test)**

## Phase H — Verification

- [x] **LG-14** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual: footer/About show the **running** version (matches the build), not the server's; a fresh load shows the
      dark skeleton with no white/theme flash and reveals the app; with a newer version deployed, a launch holds the
      skeleton, downloads + applies, and reveals on the latest; offline launch reveals the cached app; a mid-session
      deploy surfaces the manual banner (no auto-reload) and the **Update** button applies it (waiting and server-ahead
      cases). **(no unit test)**
