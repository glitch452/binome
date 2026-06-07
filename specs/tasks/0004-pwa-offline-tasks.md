# Progressive Web App (Offline & Install) — Task List

Derived from `specs/features/0004-pwa-offline.md`. Tasks are ordered so each builds on the previous. Each is small,
independently testable, and references the files it touches. Check off (`[x]`) as completed.

Convention (same as `TASKS.md`): logic-producing tasks land with a co-located `*.test.ts(x)` (Vitest + RTL, jsdom);
tasks marked **(no unit test)** are wiring/scaffolding verified by a build or manual check.

---

## Phase A — Build integration & service worker

> **Implementation note (deviation from spec §5.1):** `@serwist/next`'s `withSerwistInit` is a **webpack** plugin and
> does **not** run under Next 16's default **Turbopack** build, so it never emits `public/sw.js`. We instead use
> Serwist's bundler-agnostic **configurator mode**: a `serwist.config.mjs` (`@serwist/next/config`) consumed by an
> external `serwist build` step appended to the `build` script (`next build && serwist build serwist.config.mjs`). This
> keeps the Next build on Turbopack. The runtime options the spec put on `withSerwistInit` (`reloadOnOnline: false`,
> `cacheOnNavigation: true`, `register`, `disable`) move onto **`<SerwistProvider>`** props in **PWA-06** — that is
> where the active-timer-safety `reloadOnOnline: false` now lives. A new **devDependency** `@serwist/cli` (build-only;
> `@serwist/next`'s own peer) was added alongside `serwist` + `@serwist/next`.

- [x] **PWA-01** Add the `serwist` and `@serwist/next` dependencies to `package.json` (the one deliberate exception to
      the no-new-deps rule, per spec §13), plus the build-only `@serwist/cli` devDependency (configurator mode — see
      note). **(no unit test)** **Verify:** `npm install` then `npm run type`.
- [x] **PWA-02** ~~Wrap `next.config.ts` with `withSerwistInit`~~ → **configurator mode**: `next.config.ts` stays plain
      (`output: 'standalone'`); add `serwist.config.mjs` exporting
      `serwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })` from `@serwist/next/config`, and change the `build`
      script to `next build && serwist build serwist.config.mjs`. **(no unit test)** **Verify:** `npm run build`
      completes and writes `public/sw.js`.
- [x] **PWA-03** Add `app/sw.ts`: a Serwist worker over `self.__SW_MANIFEST` with `skipWaiting: false`,
      `clientsClaim: true`, `navigationPreload: true`, and `runtimeCaching` of
      `[{ matcher: url.pathname === '/build-info.json' → new NetworkFirst(...) }, ...defaultCache]` (from
      `@serwist/next/worker`). Adjust `tsconfig.json` so the worker globals (`ServiceWorkerGlobalScope`) type-check: add
      `webworker` to `lib` (the dom/webworker conflict is suppressed by the existing `skipLibCheck`); no `types`
      restriction (it would drop the auto-included node/test globals). **(no unit test)** **Verify:** `npm run type` and
      `npm run build`.
- [x] **PWA-04** Ignore the generated service-worker artifacts (`public/sw.js`, `public/sw.js.map`, any
      `public/swe-worker-*.js`) in `.gitignore`, `.prettierignore`, and the `ignores` array in `eslint.config.mjs`
      (mirroring how `public/build-info.json` is already gitignored). **(no unit test)** **Verify:** `npm run lint` and
      `npm run format:check` after a build (the generated `sw.js` is skipped by both).

## Phase B — Manifest & icons

- [x] **PWA-05** Add `app/manifest.ts` — a Next metadata route returning a `MetadataRoute.Manifest` with
      `name: 'Binome'`, `short_name`, `description`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`,
      `background_color: '#ffffff'`, `theme_color: '#4f46e5'`, and `icons` (192 + 512 `any`, plus a 512 `maskable`).
      Co-locate `app/manifest.test.ts`: asserts name/`start_url`/`scope`/`display`, that `icons` contains a 192×192 PNG,
      a 512×512 PNG, and a `purpose: 'maskable'` entry, and that the theme/background colors are set. **Verify:**
      `npm run type`.
- [x] **PWA-06** Edit `app/layout.tsx`: wrap the existing provider tree in
      `<SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === 'development'} reloadOnOnline={false} cacheOnNavigation>`
      (from `@serwist/next/react`) inside `<body>` — `reloadOnOnline={false}` (active-timer safety) and
      `cacheOnNavigation` are now provider props under configurator mode (see Phase A note); add
      `appleWebApp: { capable: true, title: 'Binome', statusBarStyle: 'default' }` to the existing `metadata`; add
      `export const viewport: Viewport = { themeColor: '#4f46e5' }`. **(no unit test)** **Verify:** `npm run type` and
      `npm run build`. _Note:_ `reloadOnOnline={false}` needs an inline
      `// eslint-disable-next-line react/jsx-boolean-value` (with justification) — spartan's rule uses
      `assumeUndefinedIsFalse` and would otherwise strip the prop, but `SerwistProvider`'s default is `true`, so
      omitting it would silently re-enable reconnect auto-reload.
- [x] **PWA-07** Generate PNG icons from `public/logo.svg` and commit them to `public/icons/`: `icon-192.png` (192×192),
      `icon-512.png` (512×512), and `maskable-512.png` (512×512, ~10% safe-zone padding). Generation is a one-off
      conversion via the transitively-installed `sharp` (a throwaway script — **no** runtime/build dependency added; the
      maskable variant is a full-bleed indigo SVG with the mark scaled to 80% so an adaptive-icon mask can't clip it).
      **(no unit test)** **Verify:** the three files exist and the manifest's icon URLs resolve in `npm run build` /
      `npm run start` (confirmed: all three are in the `public/sw.js` precache).

## Phase C — Update handshake hook

- [x] **PWA-08** Add `hooks/useApplyUpdate.ts` exporting `useApplyUpdate(): () => void`. The returned `applyUpdate()`:
      when `useSerwist()` (from `@serwist/next/react`) returns an instance, register a one-time `controlling` listener
      that calls `window.location.reload()` then call `serwist.messageSkipWaiting()`; when it returns `null`, call
      `window.location.reload()` directly. Co-locate `hooks/useApplyUpdate.test.tsx` (mock `useSerwist` and
      `window.location.reload`): instance path registers the `controlling` listener + calls `messageSkipWaiting`, and
      firing `controlling` reloads; null path reloads directly with no `messageSkipWaiting`. **Verify:** `npm run type`.
      _Note:_ `useSerwist()` actually returns `{ serwist: Serwist | null }` (destructure `serwist`), not the instance
      directly; the `controlling` listener self-removes via `removeEventListener` (the `addEventListener` signature
      takes no `{ once }` option).

## Phase D — Wire the handshake into the banner

- [x] **PWA-09** Add an `onRefresh: () => void` prop to `components/timer-list/UpdateBanner.tsx` and call it from the
      Refresh button, replacing the inline `window.location.reload()`. Extend `UpdateBanner.test.tsx`: the Refresh
      button calls `onRefresh`; the existing version-string, release-notes-link, and dismiss-button (with its
      `aria-label`) assertions still pass.
- [x] **PWA-10** Edit `components/timer-list/TimerList.tsx` to accept `onRefresh: () => void` and forward it to
      `<UpdateBanner>`. Extend `TimerList.test.tsx`: when `update` is non-null, clicking the rendered banner's Refresh
      calls the `onRefresh` passed to `TimerList`.
- [x] **PWA-11** Edit `components/AppShell.tsx` to call `useApplyUpdate()` and pass the result as `onRefresh` to
      `<TimerList>` (alongside `update` / `onDismissUpdate`). Extend `AppShell.test.tsx` (mock `useApplyUpdate`):
      clicking the banner's Refresh calls the mocked `applyUpdate` when the list view is active. **Verify:**
      `npm run test`. _Note:_ `useSerwist()` **throws** outside a `SerwistProvider` (its context default is `null`), so
      `AppShell.integration.test.tsx` — which renders the real `AppShell` — also had to stub `@/hooks/useApplyUpdate`.
      In production `AppShell` is always inside the layout's provider, so this only affects tests.

## Phase E — Documentation

- [x] **PWA-12** Add `specs/requirements.md` §16 (Progressive Web App — manifest, Serwist precache + `/build-info.json`
      network-first rule, the Refresh skip-waiting handshake, `reloadOnOnline: false` active-timer safety); update
      `CLAUDE.md` (PWA/Serwist architecture note, revise the "client-side SPA" framing to mention the worker, note the
      generated `public/sw.js` artifact + ignore entries); add a brief Install/Offline note to `README.md`. Also
      narrowed the requirements §2 "PWA offline support" non-goal and added §15/§16 to the requirements TOC (§15 had
      been missing). Confirm all match the implementation. **(no unit test)**

## Phase F — Verification

- [x] **PWA-13** Full gate **passed**: `npm run type`, `npm run lint`/`lint:ci`, `npm run format:check`, `npm run test`
      (479 passing), `npm run build` (emits `public/sw.js`, 27 URLs precached). **Browser-verified** against a
      production `npm run start` via Playwright: the SW registers and reaches `activated`, scope `/`, and **controls**
      the page (clientsClaim); the precache holds 27 entries including the document, all five `/sounds/*.wav`, and the
      icons; `<link rel="manifest">` → `/manifest.webmanifest` and `<meta name="theme-color">` = `#4f46e5`. With the
      network set **offline** and reloaded, the app shell still launches (heading + New Timer render) and
      `/build-info.json` resolves via the `NetworkFirst` cache fallback (no spurious banner); reconnecting did **not**
      auto-reload (`reloadOnOnline:     false`). _Known benign offline gap:_ `/manifest.webmanifest` and `/icon.svg` are
      not in the precache scope, so they fail on a cold offline load (install-time/decorative only; `defaultCache` picks
      them up on a later online visit). **Still requires a human** (not headless-verifiable): the browser's native
      **Install** affordance + standalone window with the correct name/icon, iOS Share → "Add to Home Screen", and a
      full live new-deploy → banner → Refresh skip-waiting activation cycle (the handshake logic itself is unit-tested
      in `useApplyUpdate.test.tsx`). **(no unit test)**
