'use client';

import { useSerwist } from '@serwist/next/react';

/**
 * Returns `applyUpdate()`, the action behind the update banner's Refresh button.
 *
 * When a service worker is registered (production), it performs a skip-waiting
 * handshake: register a one-time `controlling` listener that reloads once the
 * waiting worker takes control, then message that worker to activate — so the
 * reload lands on the freshly-activated precache instead of the stale one. With
 * no service worker (development or unsupported), it falls back to a plain
 * reload, identical to the pre-PWA behavior.
 */
export function useApplyUpdate(): () => void {
  const { serwist } = useSerwist();

  return () => {
    if (serwist === null) {
      window.location.reload();
      return;
    }

    const onControlling = () => {
      serwist.removeEventListener('controlling', onControlling);
      window.location.reload();
    };
    serwist.addEventListener('controlling', onControlling);
    serwist.messageSkipWaiting();
  };
}
