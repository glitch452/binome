# Browser Notifications on Expiry — Task List

Derived from `specs/features/0005-browser-notifications.md`. Tasks are ordered so each builds on the previous. Each is
small, independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — Data model & validation

- [x] **BN-01** Add `export type NotifyMode = 'always' | 'hidden'` to `types/timer.ts` and add `notify: boolean` +
      `notifyMode: NotifyMode` to the `TimerConfig` interface. **(no unit test)** **Verify:** `npm run type`.
- [x] **BN-02** Extend `timerConfigSchema` in `lib/timerSchema.ts` with `notify: z.boolean().optional().default(false)`
      and `notifyMode: z.enum(['always','hidden']).optional().default('hidden')` (reusing the existing
      optional-with-default pattern so `parseTimerList` and import/export keep working unchanged). Extend
      `lib/timerSchema.test.ts`: a timer object omitting both fields parses to
      `{ notify: false, notifyMode: 'hidden' }`; an invalid `notifyMode` value causes the record to be rejected (dropped
      by `parseTimerList`). **Verify:** `npm run type`.
- [x] **BN-03** Add a `NOTIFY_MODES` labels lookup to `lib/constants.ts` (e.g.
      `{ hidden: 'Only when the app is in the background', always: 'Always' }`, typed by `NotifyMode`). Extend
      `lib/constants.test.ts` to assert it has a label for each `NotifyMode`. **Verify:** `npm run type`.

## Phase B — Notification helper

- [x] **BN-04** Add `lib/notifications.ts` exporting `isNotificationSupported()`, `getNotificationPermission()`,
      `requestNotificationPermission()`, and `showExpiryNotification(timer)`. `showExpiryNotification` builds the
      `hideName`-aware title/body, `icon: '/apple-touch-icon.png'`, and `tag: 'binome-expiry-' + timer.id`; prefers
      `(await navigator.serviceWorker?.getRegistration?.())?.showNotification(...)`, else `new Notification(...)` in a
      `try/catch` with an `onclick` that focuses and closes. Co-locate `lib/notifications.test.ts` (stub
      `window.Notification` and `navigator.serviceWorker`): support/permission reflect the stub incl. `'unsupported'`;
      `requestNotificationPermission` short-circuits when unsupported; `showExpiryNotification` uses `showNotification`
      when a registration resolves, falls back to the constructor otherwise, swallows a throwing constructor, and builds
      the named vs `hideName` content + tag. **Verify:** `npm run type`.

## Phase C — Permission & firing hooks

- [x] **BN-05** Add `hooks/useNotificationPermission.ts` — reads `timers` from `useTimerStore`, and when notifications
      are supported, `Notification.permission === 'default'`, and `timers.some((t) => t.notify)`, calls
      `requestNotificationPermission()` once per rising edge (ref-guarded; re-attempts after a later list change while
      still `default`). Co-locate `hooks/useNotificationPermission.test.tsx`: requests on mount with a stored notify
      timer + `default` permission; does not request with no notify timer, with `granted`/`denied`, or when unsupported;
      re-requests after a new notify timer is added while still `default`; does not spam on unrelated re-renders.
- [x] **BN-06** Add `hooks/useExpiryNotification.ts` — reads `ActiveTimerContext` + `useTimerStore().getTimer`, tracks
      `prevStatusRef`, and on the `→ expired` transition calls `showExpiryNotification(timer)` when `timer.notify`,
      `getNotificationPermission() === 'granted'`, and the mode allows it (`always`, or `hidden` with
      `document.visibilityState === 'hidden' || !document.hasFocus()`). Co-locate
      `hooks/useExpiryNotification.test.tsx`: fires once on `→ expired` for `always` + granted; for `hidden` fires only
      when hidden/unfocused; never fires when `notify` false, permission not granted, or on subsequent count-up ticks.
      **Verify:** `npm run type`.

## Phase D — Form & list UI

- [ ] **BN-07** Edit `components/timer-list/TimerForm.tsx`: add `notify` + `notifyMode` to `TimerFormValues` and state
      (defaults `false` / `'hidden'`); add a "Notify on expiry" `Switch` row with a `BellRing` icon; when `notify` is
      on, reveal an indented (`border-l-2 pl-4`) mode `Select` bound to `notifyMode` using `NOTIFY_MODES` labels
      (default `hidden`); include both in `handleSubmit`. Extend `TimerForm.test.tsx`: switch defaults off; toggling on
      reveals the mode `Select` defaulting to `hidden`; submitted values include `notify` and `notifyMode`.
- [ ] **BN-08** Edit `components/timer-list/TimerFormSheet.tsx` to map `notify` + `notifyMode` from the source timer
      into `initialValues` (edit and clone paths). Extend `TimerFormSheet.test.tsx`: edit and clone pre-fill `notify` /
      `notifyMode`.
- [ ] **BN-09** Edit `components/timer-list/TimerListItem.tsx` to render a `BellRing` icon (with
      `aria-label="Notify on expiry"`) in the enabled-settings row when `timer.notify`. Extend `TimerListItem.test.tsx`:
      the icon renders when `notify` is true and is absent otherwise.

## Phase E — Wire into the app shell

- [ ] **BN-10** Edit `components/AppShell.tsx` to call `useNotificationPermission()` and `useExpiryNotification()`
      (always mounted, independent of the run-view/list switch). Extend `AppShell.test.tsx` /
      `AppShell.integration.test.tsx`: an expired notify timer while the document is hidden triggers
      `showExpiryNotification` (mock `lib/notifications`); no notification when the active timer's `notify` is false.
      **Verify:** `npm run test`.
- [ ] **BN-11** **Only if `app/sw.ts` exists** (feature 0004 has landed): add a `notificationclick` handler to it that
      focuses an existing client (or opens `/`). If the file does not exist, skip this task and leave SW-path
      click-to-focus as a documented follow-up (the notification still displays). **(no unit test)** **Verify:**
      `npm run type` (only when the file exists).

## Phase F — Documentation

- [ ] **BN-12** Update `specs/requirements.md`: remove the "Browser notifications (Notification API)" bullet from §13
      and add §17 (Browser Notifications — per-timer `notify`/`notifyMode`, reactive permission model,
      background-only-vs- always firing, SW-preferred delivery). Update `CLAUDE.md` (§4.3/alerts + data-model notes:
      `notify`/`notifyMode`, the always-mounted `useExpiryNotification` vs RunView-only flash/sound, the
      `useNotificationPermission` watcher, and the §13 change). Add a brief note to `README.md` if a feature list is
      maintained. Confirm all match the implementation. **(no unit test)**

## Phase G — Verification

- [ ] **BN-13** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual (production build or dev): create a timer with Notify on + mode "Only when in the background" → on first
      notify-timer presence the browser prompts for permission; start it, switch to another tab, let it expire → a
      notification appears; repeat with mode "Always" and confirm it fires while the app is foregrounded; confirm a
      `notify: false` timer never notifies; deny permission and confirm no notification and no error; reload with a
      stored notify timer and confirm the permission request behavior; import a file containing a notify timer and
      confirm the fields round-trip and the watcher requests permission. **(no unit test)**
