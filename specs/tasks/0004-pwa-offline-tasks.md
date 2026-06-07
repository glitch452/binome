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

- [ ] **PWA-05** Add `app/manifest.ts` — a Next metadata route returning a `MetadataRoute.Manifest` with
      `name: 'Binome'`, `short_name`, `description`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`,
      `background_color: '#ffffff'`, `theme_color: '#4f46e5'`, and `icons` (192 + 512 `any`, plus a 512 `maskable`).
      Co-locate `app/manifest.test.ts`: asserts name/`start_url`/`scope`/`display`, that `icons` contains a 192×192 PNG,
      a 512×512 PNG, and a `purpose: 'maskable'` entry, and that the theme/background colors are set. **Verify:**
      `npm run type`.
- [ ] **PWA-06** Edit `app/layout.tsx`: wrap the existing provider tree in
      `<SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === 'development'} reloadOnOnline={false} cacheOnNavigation>`
      (from `@serwist/next/react`) inside `<body>` — `reloadOnOnline={false}` (active-timer safety) and
      `cacheOnNavigation` are now provider props under configurator mode (see Phase A note); add
      `appleWebApp: { capable: true, title: 'Binome', statusBarStyle: 'default' }` to the existing `metadata`; add
      `export const viewport: Viewport = { themeColor: '#4f46e5' }`. **(no unit test)** **Verify:** `npm run type` and
      `npm run build`.
- [ ] **PWA-07** Generate PNG icons from `public/logo.svg` and commit them to `public/icons/`: `icon-192.png` (192×192),
      `icon-512.png` (512×512), and `maskable-512.png` (512×512, ~10% safe-zone padding). Generation is a one-off
      `npx`-invoked conversion — **do not** add a runtime/build dependency. **(no unit test)** **Verify:** the three
      files exist and the manifest's icon URLs resolve in `npm run build` / `npm run start`.

## Phase C — Update handshake hook

- [ ] **PWA-08** Add `hooks/useApplyUpdate.ts` exporting `useApplyUpdate(): () => void`. The returned `applyUpdate()`:
      when `useSerwist()` (from `@serwist/next/react`) returns an instance, register a one-time `controlling` listener
      that calls `window.location.reload()` then call `serwist.messageSkipWaiting()`; when it returns `null`, call
      `window.location.reload()` directly. Co-locate `hooks/useApplyUpdate.test.tsx` (mock `useSerwist` and
      `window.location.reload`): instance path registers the `controlling` listener + calls `messageSkipWaiting`, and
      firing `controlling` reloads; null path reloads directly with no `messageSkipWaiting`. **Verify:** `npm run type`.

## Phase D — Wire the handshake into the banner

- [ ] **PWA-09** Add an `onRefresh: () => void` prop to `components/timer-list/UpdateBanner.tsx` and call it from the
      Refresh button, replacing the inline `window.location.reload()`. Extend `UpdateBanner.test.tsx`: the Refresh
      button calls `onRefresh`; the existing version-string, release-notes-link, and dismiss-button (with its
      `aria-label`) assertions still pass.
- [ ] **PWA-10** Edit `components/timer-list/TimerList.tsx` to accept `onRefresh: () => void` and forward it to
      `<UpdateBanner>`. Extend `TimerList.test.tsx`: when `update` is non-null, the rendered `UpdateBanner` receives the
      `onRefresh` passed to `TimerList`.
- [ ] **PWA-11** Edit `components/AppShell.tsx` to call `useApplyUpdate()` and pass the result as `onRefresh` to
      `<TimerList>` (alongside `update` / `onDismissUpdate`). Extend `AppShell.test.tsx` (mock `useApplyUpdate`):
      `TimerList` receives a non-null `onRefresh` when the list view is active. **Verify:** `npm run test`.

## Phase E — Documentation

- [ ] **PWA-12** Add `specs/requirements.md` §16 (Progressive Web App — manifest, Serwist precache + `/build-info.json`
      network-first rule, the Refresh skip-waiting handshake, `reloadOnOnline: false` active-timer safety); update
      `CLAUDE.md` (PWA/Serwist architecture note, revise the "client-side SPA … no service worker" framing, note the
      generated `public/sw.js` artifact + ignore entries); add a brief Install/Offline note to `README.md` if warranted.
      Confirm all match the implementation. **(no unit test)**

## Phase F — Verification

- [ ] **PWA-13** Full gate: `npm run type`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.
      Manual (`npm run start` or Docker, production build): the browser offers **Install** and the installed app opens
      standalone with the correct name/icon; load once online, then go offline and confirm the app still launches and
      timers run (create/run/expiry alerts incl. sounds, theme, font-size, import/export); confirm the version footer
      still renders offline and **no** spurious update banner appears; simulate a new deploy (bump `build-info.json` to
      a tagged version) and confirm the banner appears and **Refresh** activates the new worker then reloads onto fresh
      assets; confirm reconnecting to the network does **not** auto-reload a running timer. **(no unit test)**
