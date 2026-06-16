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
      // Always go to the network for version detection; fall back to cache only when offline. The
      // 5 s network timeout means a hung/dead connection (e.g. a server restart leaving stale
      // keep-alive sockets, or a flaky network) falls back to the cached build-info instead of
      // spinning forever — making the offline fallback actually graceful.
      matcher: ({ url }) => url.pathname === '/build-info.json',
      handler: new NetworkFirst({ cacheName: 'build-info', networkTimeoutSeconds: 5 }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

function isWindowClient(client: Client): client is WindowClient {
  return client.type === 'window';
}

// Focus an existing app window when the user clicks the expiry notification,
// or open a new one if no window is currently open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(isWindowClient);
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
