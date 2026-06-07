import { serwist } from '@serwist/next/config';

// Configurator mode (bundler-agnostic): `serwist build` runs after `next build`
// and precaches the emitted output. Keeps the Next build on Turbopack, since
// `@serwist/next`'s webpack `withSerwistInit` plugin does not run under Turbopack.
// Runtime concerns (registration, reloadOnOnline, cacheOnNavigation, disable) are
// configured on <SerwistProvider> in app/layout.tsx, not here.
export default serwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});
