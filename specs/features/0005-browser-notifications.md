# Feature Spec — Browser Notifications on Expiry

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §17,
`specs/tasks/0005-browser-notifications-tasks.md`

## 1. Summary

Add an optional, per-timer **browser notification** that fires when a timer reaches `00:00`, so a user who has switched
to another tab, minimized the window, or navigated back to the Timer List still gets alerted — the one expiry signal the
current alerts (flash/sound, which only fire while the Run View is on-screen) cannot deliver. It is a new boolean
setting in the timer form, **off by default**. When enabled it reveals a mode selector: **Always** or **Only when the
app is in the background** (the default). Permission is requested from the browser **reactively** — whenever a timer
that needs notifications enters the store (created in the form, loaded from `localStorage` on startup, or added via
Import) and the permission is still in its default state. Delivery prefers the service worker's
`registration.showNotification()` (so it also works on Android Chrome, where the page-level `Notification` constructor
throws), falling back to `new Notification()` on platforms without an active worker.

Decisions confirmed during planning: the enabled state carries a **per-timer mode** (`always` vs `hidden`, default
`hidden`) shown as a revealed dropdown — not a single boolean; permission is requested **when a notify-requiring timer
appears in the store**, not from the form toggle and not at Start; and delivery is **service-worker-preferred with a
page-constructor fallback**, which composes with — but does not hard-depend on — the planned PWA service worker (feature
0004).

## 2. Goals

- Add `notify: boolean` (default `false`) and `notifyMode: 'always' | 'hidden'` (default `'hidden'`) to `TimerConfig`,
  validated by the existing `timerConfigSchema` with defaults so **no migration** is needed and existing stored timers
  stay valid.
- Surface the setting in `TimerForm` as a `Switch` ("Notify on expiry"), mirroring the flash/sound/count-up rows; when
  on, reveal a `Select` for the mode (Always / Only when in the background), defaulting to the latter.
- Fire the notification from an **always-mounted orchestrator** (in `AppShell`, not `RunView`) on the timer's
  `→ expired` transition, so it works regardless of which view is showing or whether the tab is focused.
- Gate firing by mode: `always` fires unconditionally; `hidden` fires only when the app is **not visible/focused**
  (`document.visibilityState === 'hidden' || !document.hasFocus()`), avoiding a redundant popup when the user is already
  watching the in-app flash/sound.
- Request permission **reactively** when any stored timer has `notify === true` and `Notification.permission` is
  `'default'` — covering the create, startup-load, and import paths with one watcher.
- Deliver via `navigator.serviceWorker` `registration.showNotification()` when a worker is registered, else
  `new Notification()` (wrapped in `try/catch` so Android Chrome's illegal-constructor throw is swallowed).
- Remain **client-side only**, respect light/dark and ≥375px, and add **no runtime dependency**.

## 3. Non-Goals (v1 of this feature)

- **Scheduled / background-delivered** notifications. The countdown is in-memory JS that only runs while the page is
  alive; the notification is shown from the live page. If the tab is fully closed/discarded, no notification fires (the
  timer isn't running either). No Push API, no background timers, no `setTimeout` in the service worker.
- **A separate global "enable notifications" preference or settings screen.** The only control is the per-timer toggle;
  there is no app-level notification on/off, no new `localStorage` key.
- **In-form permission UI** (warnings, "blocked" banners, a request button in the sheet). Permission is requested by the
  reactive watcher, not the form; the form toggle is a pure config boolean.
- **Re-prompting after a hard block.** If the user has set the browser permission to `denied`, the app does not nag; it
  simply does not fire notifications. (Only the `default` → prompt transition is driven.)
- **Notification actions / buttons** (e.g. "Restart", "Dismiss") or rich notification payloads beyond title, body, icon,
  and a coalescing tag.
- Changing flash/sound/count-up behavior, the data persisted for them, or making them fire outside the Run View.

## 4. Notification Setting in the Timer Form

### 4.1 Toggle + revealed mode

`TimerForm` gains a row identical in shape to the existing flash/sound/count-up rows: a `Label` with an icon (`BellRing`
from `lucide-react`, distinct from sound's `Bell`) reading **"Notify on expiry"** and a `Switch` bound to a new `notify`
state (default from `initialValues?.notify ?? false`).

When `notify` is on, reveal an indented block (the same `border-l-2 pl-4` treatment used by the sound options) holding a
`Select` bound to `notifyMode`:

- `hidden` → label **"Only when the app is in the background"** (default, preselected when the toggle is first switched
  on)
- `always` → label **"Always"**

When `notify` is switched off the mode block is hidden; `notifyMode` retains its value in state (so toggling back on
restores the prior choice) and is still submitted, but is irrelevant while `notify` is false.

### 4.2 Submission

`TimerFormValues` gains `notify: boolean` and `notifyMode: NotifyMode`. `handleSubmit` includes both in the object
passed to `onSubmit`. No permission request happens here — see §5.

## 5. Permission Model (reactive request)

Permission is **never** requested from the form toggle or the Start action. Instead, a watcher requests it whenever the
library contains a timer that needs it and the browser hasn't decided yet.

### 5.1 The watcher

A new hook `hooks/useNotificationPermission.ts`, mounted in `AppShell`, reads `timers` from `useTimerStore` and computes
`anyNotify = timers.some((t) => t.notify)`. An effect runs the request when **all** hold:

1. Notifications are supported (`'Notification' in window`).
2. `Notification.permission === 'default'` (not yet granted or denied).
3. `anyNotify === true`.

This single condition covers the three trigger points the user specified, because each changes one of the inputs:

- **Startup load** — the store hydrates from `localStorage` (`countdown_timers`); if a stored timer has `notify`, the
  effect fires on mount.
- **Create / edit** — `addTimer`/`updateTimer` change `timers`; the effect re-evaluates.
- **Import** — `importTimers` changes `timers`; the effect re-evaluates.

The request is issued **once per rising edge** of the condition (tracked with a ref) so a `default`-state browser is not
spammed on every render; if the user adds another notify timer while still `default`, that list change permits a fresh
attempt (useful for the gesture caveat below).

### 5.2 Gesture caveat (documented, not blocking)

`Notification.requestPermission()` is honored without a user gesture in Chromium, but **Safari and Firefox require
transient user activation**. An auto-request fired right after `localStorage` hydration (no gesture) may therefore be
ignored on those browsers, leaving the permission at `default`. Because the watcher retries on the next qualifying list
change — and creating/importing a timer is itself a click — the prompt typically appears the next time a notify timer is
added through a real interaction. This is an accepted limitation, not a bug; the spec notes it so the implementer
doesn't try to "fix" the no-prompt-on-load case.

### 5.3 Helper API

`lib/notifications.ts` centralizes the platform calls so hooks and tests don't touch `window.Notification` directly:

- `isNotificationSupported(): boolean` — `'Notification' in window`.
- `getNotificationPermission(): NotificationPermission | 'unsupported'`.
- `requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'>` — returns early if unsupported;
  otherwise `Notification.requestPermission()`.

## 6. Expiry Notification Firing

### 6.1 Orchestrator placement

A new hook `hooks/useExpiryNotification.ts` is called in `AppShell` (always mounted, independent of `showRunView`). It
mirrors the `→ expired` detection already used in `RunView`
([RunView.tsx:54-66](../../components/run-view/RunView.tsx#L54)): a `prevStatusRef` guards so the effect fires exactly
once on the transition into `expired`, not on every subsequent count-up tick. It reads the active timer state from
`ActiveTimerContext` and resolves the config with `useTimerStore().getTimer(state.configId)`.

### 6.2 Firing condition

On the `→ expired` transition, fire when **all** hold:

1. The active timer's config has `notify === true`.
2. `getNotificationPermission() === 'granted'`.
3. The mode allows it: `notifyMode === 'always'`, **or** (`notifyMode === 'hidden'` **and** the app is backgrounded:
   `document.visibilityState === 'hidden' || !document.hasFocus()`).

When the condition holds, call `showExpiryNotification(timer)` (§6.3). Firing is independent of flash/sound, which
continue to run only in `RunView` — so a backgrounded or list-view expiry produces a notification even though it
produces no flash/sound. That asymmetry is intentional and is the feature's reason to exist.

### 6.3 Delivery

`lib/notifications.ts` exposes `showExpiryNotification(timer: TimerConfig): Promise<void>`:

- **Content**: `tag: 'binome-expiry-' + timer.id` (coalesces duplicates); `icon: '/apple-touch-icon.png'` (a raster that
  ships today; if feature 0004's `/icons/icon-192.png` is present it is an equally valid choice, but this feature does
  not depend on it). Respecting `hideName`: when `timer.hideName` is `true`, use `title: 'Binome'`,
  `body: 'Your timer has finished.'`; otherwise `title: timer.name`, `body: 'Timer finished.'`.
- **Service-worker-preferred**: `const reg = await navigator.serviceWorker?.getRegistration?.()`. If `reg` exists, call
  `reg.showNotification(title, options)`. `getRegistration()` resolves immediately (it does not hang waiting for a
  worker), so this is safe whether or not feature 0004 has shipped.
- **Fallback**: otherwise construct `new Notification(title, options)` inside a `try/catch`; the catch swallows Android
  Chrome's `TypeError: Illegal constructor` so a missing worker on mobile degrades to "no notification" rather than a
  thrown error. For the page-constructor path, set
  `notification.onclick = () => { window.focus(); notification.close(); }` so clicking focuses the app.
- **Click-to-focus on the SW path** requires a `notificationclick` listener in the service worker. If `app/sw.ts` exists
  at implementation time (feature 0004 landed), add a `notificationclick` handler there that focuses an existing client
  (or opens `/`). If it does not exist yet, the notification still displays; SW-path click-focus is deferred and noted
  as a follow-up — it does not block this feature.

## 7. Data Models & Validation

`types/timer.ts` — add the mode type and two fields:

```ts
export type NotifyMode = 'always' | 'hidden';

export interface TimerConfig {
  // …existing fields…
  notify: boolean;
  notifyMode: NotifyMode;
}
```

`lib/timerSchema.ts` — extend `timerConfigSchema`, reusing the existing optional-with-default pattern so
`parseTimerList` keeps working unchanged and stored/imported timers missing the fields are filled in:

```ts
notify: z.boolean().optional().default(false),
notifyMode: z.enum(['always', 'hidden']).optional().default('hidden'),
```

No new `localStorage` key. **No migration**: `parseTimerList` already fills missing optional fields with defaults, so
existing `countdown_timers` entries become `{ notify: false, notifyMode: 'hidden' }`. Import/Export needs no change —
its `exportFileSchema` validates `timers` as `z.array(z.unknown())` and then runs `parseTimerList`, so the new fields
round- trip automatically. `useTimerStore`'s `NewTimerInput`/`TimerUpdate` are derived from `TimerConfig`, so they widen
to include the new fields with no code change to the store.

`lib/constants.ts` — add a `NOTIFY_MODES` lookup for the form `Select` (value → label), e.g.
`{ hidden: 'Only when the app is in the background', always: 'Always' }`, to keep the labels out of the component.

## 8. App Integration & Components

**New files**

- `lib/notifications.ts` — `isNotificationSupported`, `getNotificationPermission`, `requestNotificationPermission`,
  `showExpiryNotification`. Co-located test.
- `hooks/useNotificationPermission.ts` — reactive permission watcher (§5). Co-located test.
- `hooks/useExpiryNotification.ts` — always-mounted expiry → notification orchestrator (§6). Co-located test.

**Edited files**

- `types/timer.ts` — add `NotifyMode`; add `notify` + `notifyMode` to `TimerConfig`.
- `lib/timerSchema.ts` — add `notify` + `notifyMode` validators (optional-with-default).
- `lib/constants.ts` — add `NOTIFY_MODES` labels lookup.
- `components/timer-list/TimerForm.tsx` — add the "Notify on expiry" `Switch` + revealed mode `Select`; extend
  `TimerFormValues` and `handleSubmit`.
- `components/timer-list/TimerFormSheet.tsx` — map `notify` + `notifyMode` into `initialValues` for edit/clone.
- `components/timer-list/TimerListItem.tsx` — add a `BellRing` alert icon (with `aria-label="Notify on expiry"`) to the
  enabled-settings row when `timer.notify`.
- `components/AppShell.tsx` — call `useNotificationPermission()` and `useExpiryNotification()`.
- `app/sw.ts` — **only if it already exists** (feature 0004): add a `notificationclick` handler that focuses a client.
  Otherwise skipped (see §6.3).

## 9. UX Notes

- The new form row matches the existing toggle rows: icon + `Label` on the left, `Switch` on the right; the revealed
  mode `Select` sits in the same indented `border-l-2 pl-4` block the sound options use, so the form stays visually
  consistent and works at ≥375px (the `Select` is full-width within the block).
- `BellRing` is visually close to sound's `Bell`; the two are disambiguated by their `aria-label`s ("Notify on expiry"
  vs "Sound on expiry") and by appearing in the form with their text labels — the not-color-alone rule is satisfied
  because each alert icon carries an `aria-label` and the form rows are textual.
- All new UI (`Switch`, `Select`, list icon) uses existing shadcn/Base-UI primitives and semantic Tailwind tokens, so
  light/dark is respected with no extra work.
- The system notification itself is rendered by the OS/browser, not styled by the app; only its title/body/icon are set.
- The mode `Select` and toggle are keyboard-accessible via the existing primitives and carry labels (`Label htmlFor` +
  `aria-label` on the trigger, as the sound-repeat `Select` already does).

## 10. Testing Strategy

- **`lib/notifications.ts`** (`lib/notifications.test.ts`, jsdom; stub `window.Notification` /
  `navigator.serviceWorker`)
  - `isNotificationSupported` / `getNotificationPermission` reflect the stubbed `Notification` (incl. `'unsupported'`
    when absent).
  - `requestNotificationPermission` returns `'unsupported'` without calling anything when `Notification` is absent;
    otherwise delegates to `Notification.requestPermission`.
  - `showExpiryNotification` uses `registration.showNotification` when `getRegistration()` resolves a registration;
    falls back to `new Notification` otherwise; swallows a constructor that throws; builds the `hideName` vs named
    title/body and the `binome-expiry-<id>` tag.
- **`hooks/useNotificationPermission.ts`** (`useNotificationPermission.test.tsx`)
  - Requests on mount when a stored timer has `notify` and permission is `default`.
  - Does **not** request when no timer has `notify`, or when permission is `granted`/`denied`, or when unsupported.
  - Requests again after a new notify timer is added while still `default`; does not spam on unrelated re-renders.
- **`hooks/useExpiryNotification.ts`** (`useExpiryNotification.test.tsx`)
  - Fires once on `→ expired` when `notify` + permission `granted` + mode `always`.
  - Mode `hidden`: fires when `document.visibilityState === 'hidden'` (or `hasFocus()` is false); does **not** fire when
    visible and focused.
  - Does not fire when `notify` is false, permission not granted, or already expired (no duplicate on count-up ticks).
- **`components/timer-list/TimerForm.tsx`** (extend test)
  - "Notify on expiry" switch defaults off; toggling on reveals the mode `Select` defaulting to `hidden`; submitted
    values include `notify` and `notifyMode`.
- **`components/timer-list/TimerFormSheet.tsx`** (extend test)
  - Edit and clone pre-fill `notify` / `notifyMode` from the source timer.
- **`components/timer-list/TimerListItem.tsx`** (extend test)
  - The `BellRing` icon (with its `aria-label`) renders when `timer.notify` and is absent otherwise.
- **`components/AppShell.tsx`** (extend test) — the two hooks are invoked (e.g. an expired notify timer while the
  document is hidden triggers `showExpiryNotification`); no notification when the active timer has `notify` false.
- **`lib/timerSchema.ts`** (extend test) — a timer object without `notify`/`notifyMode` parses to the defaults; an
  invalid `notifyMode` is rejected.

## 11. Edge Cases

- **Permission `denied` / unsupported** — `showExpiryNotification` no-ops (condition gate or `try/catch`); the toggle
  still saves harmlessly; no nagging re-prompt.
- **No user gesture on load (Safari/Firefox)** — auto-request may not prompt; retried on the next notify-timer add
  (§5.2).
- **Mode `hidden`, app foreground at expiry** — no notification (flash/sound already alert the watching user).
- **Mode `hidden`, user on the Timer List (not Run View)** — `document` is still "visible", so it does **not** fire;
  `hidden` means tab backgrounded/unfocused, not "not on the run screen". Users who want a list-view alert choose
  `always`. (Documented so the distinction is explicit.)
- **Back to list / another tab while running, then expiry** — orchestrator is always mounted, so the notification fires
  (the headline scenario). Flash/sound do not, by existing design.
- **Count-up after expiry** — the `prevStatusRef` guard fires the notification once on entering `expired`, not on each
  count-up tick.
- **Reset / restart** — a fresh `→ expired` transition fires a new notification; the shared `tag` replaces the prior OS
  notification rather than stacking.
- **Android Chrome without a registered SW** — `getRegistration()` returns undefined → page-constructor path →
  `try/catch` swallows the illegal-constructor throw → no notification (acceptable until feature 0004's worker exists).
- **Active-timer safety** — notifications never touch countdown state; nothing about firing or permission-requesting can
  pause, reset, or reload a running timer.

## 12. Rollout Notes

- **New dependencies**: none. Uses the platform `Notification` API and the existing `navigator.serviceWorker`.
- **Docs**:
  - `specs/requirements.md`: **remove** the "Browser notifications (Notification API)" bullet from §13 Out of Scope, and
    add **§17 Browser Notifications** describing the per-timer `notify`/`notifyMode` setting, the reactive permission
    model, the background-only-vs-always firing rule, and SW-preferred delivery. (Predicts §17 on the assumption feature
    0004 lands §16 first; renumber if 0005 ships earlier.) Performed during implementation, not at spec time.
  - `CLAUDE.md`: extend §4.3 / the alerts notes and the data-model summary to mention `notify`/`notifyMode`, the
    always-mounted `useExpiryNotification` orchestrator (contrast with `RunView`-only flash/sound), and the reactive
    `useNotificationPermission` watcher; update the §13 out-of-scope mention. Performed during implementation.
  - `README.md`: a brief note that timers can raise a browser notification on expiry, if a feature list is maintained.
- **Persisted-data migration**: none — additive optional-with-default schema fields; existing `countdown_timers` data
  stays valid.
