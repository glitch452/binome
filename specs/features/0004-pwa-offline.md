# Feature Spec — Progressive Web App (Offline & Install)

Status: **planned** · Owner: glitch452 · Related: `specs/requirements.md` §16, `specs/tasks/0004-pwa-offline-tasks.md`

## 1. Summary

Binome is already a fully client-side SPA — all state lives in `localStorage`, there are no API routes, and every
interactive component is `'use client'`. This feature adds the thin delivery layer that turns it into an installable,
offline-capable **Progressive Web App**: a Web App Manifest (so browsers offer "Install"), PWA icons, and a
build-integrated **service worker** (via [Serwist](https://serwist.pages.dev/)) that precaches the app shell, JS/CSS
chunks, sounds, and icons so a previously-loaded install launches and runs with no network. Crucially, the service
worker is co-designed with the existing `useUpdateCheck` banner so the two update mechanisms cooperate rather than
fight: `/build-info.json` stays network-first so version detection keeps working, and the banner's **Refresh** button
activates the waiting service worker before reloading so the new code is actually served. No timer behavior changes; the
app logic that already runs offline-by-architecture simply becomes reachable offline.

Key decisions confirmed during planning: service worker built with **Serwist** (`@serwist/next`, the maintained next-pwa
successor) precaching the build output — the one deliberate exception to the repo's "prefer no new deps" rule, justified
by reliable precaching of Next's content-hashed assets; the existing build-info banner remains the update **signal** and
gains a SW skip-waiting **handshake** on Refresh; and installation relies on the **browser's native** install affordance
(no in-app install button).

## 2. Goals

- Ship a valid **Web App Manifest** (`app/manifest.ts` → `/manifest.webmanifest`) plus PNG icons so Chromium/Android and
  desktop browsers present their native **Install** UI and the installed app opens in a standalone window.
- Register a **Serwist** service worker that **precaches** the app shell (`/`), Next's hashed JS/CSS, the built-in
  sounds in `/public/sounds/`, and the PWA icons — so a previously-loaded install **launches and runs fully offline**.
- Keep `/build-info.json` **network-first** so `useUpdateCheck` continues to detect newly-deployed versions, and never
  serve a stale version that would suppress the update banner.
- Make the update banner's **Refresh** action perform a **skip-waiting handshake**: tell the waiting service worker to
  activate, then reload — so the user lands on the new code, not a stale precache.
- **Protect a running timer**: the active timer is in-memory (`ActiveTimerContext`, not persisted), so the SW must never
  trigger an automatic reload (`reloadOnOnline: false`); a page reload only ever happens on the user's explicit Refresh,
  exactly as today.
- Remain **client-side only** with **no change to the timer data model** or `localStorage` schema, and respect every
  existing convention (color scheme, ≥375px, accessibility, co-located tests).
- Keep the **standalone Docker** image working: the generated `public/sw.js`, manifest, and icons are served from the
  runner stage.

## 3. Non-Goals (v1 of this feature)

- A **custom in-app install button** or `beforeinstallprompt` capture — installation uses the browser's native UI only.
- **Push notifications** or **Background Sync / Periodic Background Sync** (browser notifications are already out of
  scope per requirements §13; periodic background update checks are not added — the existing 60-minute poll stands).
- A **dedicated offline fallback page** distinct from the app. The app is a single client-rendered page with no
  URL-based routing (view switching is client state), so precaching `/` is sufficient; there is no separate route to
  fall back to.
- **Driving the banner from service-worker lifecycle events** (`updatefound`/`waiting`). The existing `/build-info.json`
  poll remains the update signal; the SW only contributes the activation handshake on Refresh.
- An **iOS programmatic install prompt** — none exists on iOS. iOS users install via Share → "Add to Home Screen";
  precaching still gives them offline once installed. No iOS-specific UI is added beyond standard `apple-touch-icon` /
  `appleWebApp` metadata (the apple-touch-icon already ships).
- Any change to timer logic, alert behavior, audio priming, or persistence.

## 4. Web App Manifest & Icons

### 4.1 Manifest

Add `app/manifest.ts` — a Next.js App Router
[metadata route](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) exporting a default
function that returns a typed `MetadataRoute.Manifest`. Next serves it at `/manifest.webmanifest` and auto-injects the
`<link rel="manifest">`, so no manual `<head>` wiring is needed. Shape:

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Binome',
    short_name: 'Binome',
    description: 'A countdown timer application. Every second counts.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5', // indigo-600 — matches the logo background
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

`app/layout.tsx` additionally declares the theme color and Apple PWA metadata so the installed app is branded
consistently:

- Add `manifest` is implicit (Next links the metadata route automatically), but add
  `appleWebApp: { capable: true, title: 'Binome', statusBarStyle: 'default' }` to the existing `metadata` object.
- Add a Next `export const viewport: Viewport = { themeColor: '#4f46e5' }` (theme color belongs on `viewport`, not
  `metadata`, in the App Router).

### 4.2 Icons

The existing branding source is `public/logo.svg` / `app/icon.svg` (both a 512×512 rounded indigo square with the
"binome" mark). Generate PNG icons from that source and **commit them** to `public/icons/`:

- `icon-192.png` (192×192, `purpose: any`)
- `icon-512.png` (512×512, `purpose: any`)
- `maskable-512.png` (512×512, `purpose: maskable`) — rendered with ~10% interior padding (safe zone) so the mark is not
  clipped by circular/squircle adaptive-icon masks.

Generation is a **one-off** step (e.g. an `npx`-invoked SVG→PNG converter); it must **not** add a runtime or build
dependency — the committed PNGs are the deliverable. The existing `public/apple-touch-icon.png` (180×180) and
`public/favicon.ico` are kept as-is and continue to serve iOS / favicon needs.

## 5. Service Worker & Caching (Serwist)

### 5.1 Build integration (`next.config.ts`)

Wrap the existing config with `@serwist/next`'s initializer. `next.config.ts` is ESM/TypeScript, so use the default
import:

```ts
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: false, // never auto-reload — would discard an in-memory running timer
  register: false, // registration is handled by <SerwistProvider> so useSerwist() works
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist({ output: 'standalone' });
```

Notes:

- `register: false` is deliberate: `SerwistProvider` (see §7) performs registration so the `useSerwist()` hook is
  available for the Refresh handshake. Leaving the plugin's auto-register on would double-register.
- `disable` in development avoids the service worker interfering with Turbopack HMR. Offline + install are
  production-only behaviors; `npm run build` + `npm run start` (or Docker) exercise them.
- Serwist emits `public/sw.js` (and a source map) during `next build`. These are **build artifacts** — see §5.4.

### 5.2 Service-worker source (`app/sw.ts`)

A Serwist worker built from the precache manifest Serwist injects at build time:

```ts
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // wait — the banner's Refresh drives activation (§7)
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Always go to the network for version detection; fall back to cache only when offline.
      matcher: ({ url }) => url.pathname === '/build-info.json',
      handler: new NetworkFirst({ cacheName: 'build-info' }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
```

### 5.3 Caching strategy

- **Precache** (`self.__SW_MANIFEST`, injected by Serwist): the document for `/`, Next's hashed `.next/static` JS/CSS,
  the icons, and the built-in sounds in `/public/sounds/` — everything required to cold-start the app offline.
- **`/build-info.json` → `NetworkFirst`**: the update poll always prefers the network so a new deploy is detected
  promptly; offline it falls back to the last cached copy, which equals the running version, so no false-positive
  banner. This is the single most important rule — without it the precached/stale build-info would defeat
  `useUpdateCheck`.
- **`defaultCache`** (`@serwist/next/worker`): Serwist's curated runtime strategies for Next.js assets (static media,
  fonts, etc.), applied after the build-info rule.

### 5.4 Dev disable, ignores & Docker

- The generated `public/sw.js` (+ `.map`) must be ignored by version control and the formatters/linters, mirroring how
  `public/build-info.json` is already gitignored: add `public/sw.js` and `public/sw.js.map` (and any
  `public/swe-worker-*.js` Serwist emits) to `.gitignore`, `.prettierignore`, and the `ignores` array in
  `eslint.config.mjs`.
- **TypeScript**: `app/sw.ts` references web-worker globals (`ServiceWorkerGlobalScope`) not present under the current
  `lib: ["dom","dom.iterable","esnext"]`. Configure TypeScript so `app/sw.ts` type-checks under `npm run type` per
  Serwist's Next.js + TypeScript guidance (its `@serwist/next` typings plus a `webworker` lib reference for the worker
  file), resolving any DOM/WebWorker lib conflict. `npm run type` is the gate.
- **Docker**: no Dockerfile change is required. `next build` runs in the builder stage and writes `public/sw.js`; the
  runner stage already `COPY`s `public/` (the same line that carries `build-info.json`), so the SW, manifest output, and
  icons are served. Confirm during verification.

## 6. Offline Behavior

- After the first successful load while online, the precache holds the full app shell; subsequent launches (including
  the installed standalone app) work with the network fully off — create/edit/run timers, alerts (flash, the precached
  sounds, count-up), theme, font-size, and import/export all function because they are pure client logic over
  `localStorage`.
- The version footer / About dialog and the update banner depend on `/build-info.json`: offline, the `NetworkFirst` rule
  serves the cached copy so the footer still shows the running version and no spurious update banner appears.
- A device that has **never** loaded the app online cannot start it offline (nothing is cached yet) — expected and
  documented, not an error path.

## 7. Update Handshake (banner Refresh ↔ service worker)

The existing flow stays the **detection** path: `useUpdateCheck` polls `/build-info.json` (now network-first) and, when
a newer tagged release is seen, `AppShell` renders `UpdateBanner` in the Timer List view (unchanged). What changes is
the banner's **Refresh** action, which today calls `window.location.reload()` directly — with a waiting service worker
that would reload into the **stale precache**.

### 7.1 Registration

`app/layout.tsx` wraps the app in `<SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === 'development'}>`
(from `@serwist/next/react`), placed inside `<body>` around the existing provider tree. It registers the worker after
window load and exposes the Serwist window instance via the `useSerwist()` hook.

### 7.2 Applying an update

Add `hooks/useApplyUpdate.ts` exporting `useApplyUpdate(): () => void`. The returned `applyUpdate()`:

- If `useSerwist()` returns a Serwist instance (SW supported and enabled): register a one-time `controlling` listener
  that calls `window.location.reload()`, then call `serwist.messageSkipWaiting()` so the waiting worker activates and
  claims the page; the `controlling` event then triggers the reload onto the new precache.
- If `useSerwist()` returns `null` (dev, or no service worker support): fall back to a plain `window.location.reload()`
  — identical to today's behavior.

### 7.3 Wiring

- `components/AppShell.tsx` calls `useApplyUpdate()` and passes the result as `onRefresh` to `<TimerList>` (alongside
  the existing `update` / `onDismissUpdate`).
- `components/timer-list/TimerList.tsx` forwards `onRefresh` to `<UpdateBanner>`.
- `components/timer-list/UpdateBanner.tsx` gains an `onRefresh: () => void` prop and calls it from the Refresh button,
  replacing the inline `window.location.reload()`.

### 7.4 Active-timer safety

Because `reloadOnOnline: false` and `skipWaiting: false`, the only reload path is the user clicking **Refresh** — the
same explicit, user-initiated action that already reloads (and discards the in-memory running timer) today. Reconnecting
to the network, a background SW update, or a poll detecting a new version never reloads on their own. The feature
therefore introduces **no new way** to lose a running timer.

## 8. Data Models & Validation

No change to `types/timer.ts`, `lib/timerSchema.ts`, or `lib/build-info.ts`. No new `localStorage` key. The manifest is
a static metadata route (no Zod needed); `/build-info.json` is still validated by the existing `buildInfoSchema` inside
`useUpdateCheck`. The PWA layer adds delivery/runtime concerns only — it touches no persisted data.

## 9. App Integration & Components

**New files**

- `app/manifest.ts` — Next metadata route returning the `MetadataRoute.Manifest` (§4.1). Co-located unit test.
- `app/sw.ts` — Serwist service-worker source: precache + runtime caching with the `/build-info.json` `NetworkFirst`
  rule; `skipWaiting: false`, `clientsClaim: true` (§5.2). Compiled to `public/sw.js` by Serwist; not unit-tested
  (worker-global module verified by build).
- `hooks/useApplyUpdate.ts` — `useApplyUpdate()` returning `applyUpdate()` that performs the skip-waiting handshake via
  `useSerwist()`, with a plain-reload fallback (§7.2). Co-located test.
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png` — committed PNG icons
  generated from `logo.svg` (§4.2). No unit test.

**Edited files**

- `next.config.ts` — wrap with `withSerwistInit` (§5.1).
- `app/layout.tsx` — add `<SerwistProvider>` around the provider tree; add `appleWebApp` to `metadata` and a `viewport`
  export with `themeColor` (§4.1, §7.1).
- `components/AppShell.tsx` — call `useApplyUpdate()`; pass `onRefresh` to `<TimerList>` (§7.3).
- `components/timer-list/TimerList.tsx` — accept and forward `onRefresh` to `<UpdateBanner>` (§7.3).
- `components/timer-list/UpdateBanner.tsx` — add `onRefresh` prop; call it from the Refresh button instead of reloading
  inline (§7.3).
- `tsconfig.json` — make `app/sw.ts` type-check (web-worker lib handling, §5.4).
- `.gitignore`, `.prettierignore`, `eslint.config.mjs` — ignore the generated `public/sw.js` (+ map / worker files,
  §5.4).
- `package.json` — add `serwist` and `@serwist/next` dependencies (§13).

## 10. UX Notes

- **Install**: no new in-app control. The browser's native install affordance (address-bar icon / menu, Android "Install
  app") appears once the manifest + SW + installability criteria are met. Installed, the app opens standalone using the
  manifest `name`, `theme_color`, and icons.
- **No visual change** to any existing surface in the common case. `UpdateBanner` looks and behaves identically; only
  the Refresh handler is rerouted through the SW handshake.
- The banner, footer, and all surfaces continue to honor the active color scheme and ≥375px layout — this feature adds
  no new rendered UI to style.
- Accessibility of the existing banner is unchanged (`role="status"`, the `aria-label="Dismiss update notification"`
  dismiss button, keyboard-accessible Refresh/links). The Refresh button stays a real `<button>` and keeps its visible
  focus ring.
- `theme_color`/`background_color` are chosen to match the brand (indigo `#4f46e5`) and a neutral splash (`#ffffff`);
  they affect the OS install splash / title bar, not in-page theming, so they do not conflict with light/dark mode.

## 11. Testing Strategy

- **`app/manifest.ts`** (`app/manifest.test.ts`)
  - Returns `name: 'Binome'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`.
  - `icons` includes a 192×192 and a 512×512 PNG entry and a `purpose: 'maskable'` entry.
  - `theme_color` and `background_color` are set.
- **`hooks/useApplyUpdate.ts`** (`hooks/useApplyUpdate.test.tsx`, mocking `@serwist/next/react`'s `useSerwist` and
  `window.location.reload`)
  - When `useSerwist()` returns an instance: `applyUpdate()` registers a one-time `controlling` listener and calls
    `messageSkipWaiting()`; firing `controlling` triggers `reload()`.
  - When `useSerwist()` returns `null`: `applyUpdate()` calls `window.location.reload()` directly (no
    `messageSkipWaiting`).
- **`components/timer-list/UpdateBanner.tsx`** (extend existing test)
  - The Refresh button calls the `onRefresh` prop (replaces the previous `window.location.reload()` assertion).
  - Existing assertions (version string, release-notes link, dismiss button + its `aria-label`) still pass.
- **`components/timer-list/TimerList.tsx`** (extend existing test)
  - `UpdateBanner` receives the `onRefresh` prop passed to `TimerList` when `update` is non-null.
- **`components/AppShell.tsx`** (extend existing tests)
  - `TimerList` receives a non-null `onRefresh` prop derived from `useApplyUpdate()` (mock the hook) when the list view
    is active.
- **`app/sw.ts`** — no unit test (service-worker module with worker globals; correctness verified by `npm run build`
  producing `public/sw.js` and the manual offline walkthrough in verification).

## 12. Edge Cases

- **First visit offline** — nothing precached yet, so the app cannot start. Expected; documented in §6.
- **Offline, app already installed** — precache serves the shell; `/build-info.json` `NetworkFirst` falls back to the
  cached copy, so the footer shows the running version and no update banner appears.
- **Running timer when the network returns** — `reloadOnOnline: false` guarantees no automatic reload; the in-memory
  timer keeps running (active-timer safety, §7.4).
- **Running timer when the user clicks Refresh** — reload discards it, exactly as today (user-initiated). Unchanged.
- **New deploy while a tab is open** — the network-first poll sees the new `build-info.json` → banner → Refresh runs the
  skip-waiting handshake → reload serves the new precache.
- **Update detected but never applied** — the user keeps running the old (still offline-capable) version; the next
  manual reload re-checks the SW. Benign.
- **Service worker disabled (dev) or unsupported** — `useSerwist()` returns `null`; Refresh falls back to a plain
  reload; no offline/install. The app works exactly as before this feature.
- **iOS** — no programmatic install prompt; install is via Share → "Add to Home Screen". Precaching and standalone
  display still apply once added; Web Audio priming on the start gesture is unchanged.
- **Stale generated `sw.js` committed by mistake** — prevented by the `.gitignore` entry; CI `format:ci`/`lint:ci` skip
  it via the ignore lists so a locally-built artifact never blocks the gate.

## 13. Rollout Notes

- **New dependencies**: `serwist` and `@serwist/next`. This is the one deliberate exception to the repo's "prefer no new
  deps" stance, taken because reliable offline precaching of Next's content-hashed build output needs build-time
  integration that a hand-rolled worker cannot match. Renovate will track them automatically (no `renovate.json5`
  change). No new dependency is added for icon generation (one-off `npx` conversion; PNGs are committed).
- **Docs**:
  - `specs/requirements.md`: add **§16 Progressive Web App (Offline & Install)** describing the manifest, Serwist
    precache + the `/build-info.json` network-first rule, the Refresh skip-waiting handshake, and `reloadOnOnline:false`
    active-timer safety. Performed during implementation, not at spec time.
  - `CLAUDE.md`: add a PWA/Serwist note to the architecture section, update the "client-side SPA … no service worker"
    framing to reflect the added worker, and note the generated `public/sw.js` artifact + its ignore entries. Performed
    during implementation.
  - `README.md`: a brief "Install / Offline" note if a README section warrants it.
- **Persisted-data migration**: none — no data model or `localStorage` change.
