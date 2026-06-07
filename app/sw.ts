import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by Serwist at build time (the InjectManifest `injectionPoint`).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // wait — the update banner's Refresh drives activation
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
