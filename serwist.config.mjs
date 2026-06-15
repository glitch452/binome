import { serwist } from '@serwist/next/config';

// Configurator mode (bundler-agnostic): `serwist build` runs after `next build`
// and precaches the emitted output. Keeps the Next build on Turbopack, since
// `@serwist/next`'s webpack `withSerwistInit` plugin does not run under Turbopack.
// Runtime concerns (registration, reloadOnOnline, cacheOnNavigation, disable) are
// configured on <SerwistProvider> in app/layout.tsx, not here.
export default serwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Keep /build-info.json out of the precache manifest. Precaching silently registers a
  // route ahead of runtimeCaching, and the router returns on first match — so a precached
  // /build-info.json would shadow the NetworkFirst route in app/sw.ts and freeze the
  // update-check version at the *installed* worker's build time, making the banner report
  // the old version. Ignoring it lets NetworkFirst own the URL (fresh version, cache
  // fallback only when offline). Path is relative to globDirectory (cwd); public assets
  // are globbed as `public/**/*`, so the ignore pattern keeps the `public/` prefix.
  globIgnores: ['public/build-info.json'],
});
