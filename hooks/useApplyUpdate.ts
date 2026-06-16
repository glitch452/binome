'use client';

import { useSerwist } from '@serwist/next/react';

import { cacheBustingReload } from '@/lib/cacheBustingReload';
import { UPDATE_APPLY_TIMEOUT_MS } from '@/lib/constants';

export interface ApplyUpdateOptions {
  /**
   * **Banner mode.** When `true`, the action simply reloads the page to adopt the latest worker
   * instead of running the launch gate's activate-and-reload handshake. The update banner passes
   * this; the launch gate omits it. See the hook doc for why a reload is the right thing for the
   * banner.
   */
  reloadNow?: boolean;
}

/**
 * Returns `applyUpdate(options?)`, the "get me to the latest" action behind the update banner's
 * Update button and the launch gate's apply step. Three behaviors:
 *
 * - **No service worker** (dev / unsupported) → `cacheBustingReload()`; with no precache a
 *   cache-busting navigation fetches the latest entry document and assets.
 *
 * - **Banner (`reloadNow: true`)** → `messageSkipWaiting()` then `window.location.reload()`. A
 *   reload* — not a skip-waiting handshake — is what reliably adopts a new worker:
 *     - Safari/WebKit **ignores `skipWaiting()` while a client is open**, so messaging the parked
 *       worker never activates it; but a reload navigation drops the old client and lets the parked
 *       worker take over (the active worker serves the new navigation).
 *     - If the new worker is already active and only the in-memory page is stale, a reload picks up
 *       the new build immediately.
 *     - If a worker is merely waiting on Chrome, the reloaded page re-runs the launch gate, which
 *       activates it. The `messageSkipWaiting()` nudge lets Chrome usually activate in one reload.
 *   The launch gate already guarantees the newest version loads on refresh/first-load, so the banner
 *   delegates to it. Safe — the banner only renders on the Timer List, where no timer is running.
 *
 * - **Launch gate (no options)** → register a one-shot `controlling` listener that reloads, then
 *   `messageSkipWaiting()` + `serwist.update()`. If nothing takes control within
 *   `UPDATE_APPLY_TIMEOUT_MS` it stops listening (so a late activation can't reload after the gate
 *   has revealed the app — active-timer safety) and the banner takes over. It must NOT just reload
 *   (that would loop the gate at launch), which is why this path keeps the activate-and-reload-once
 *   handshake while the banner does not.
 */
export function useApplyUpdate(): (options?: ApplyUpdateOptions) => void {
  const { serwist } = useSerwist();

  return (options) => {
    if (serwist === null) {
      cacheBustingReload();
      return;
    }

    if (options?.reloadNow === true) {
      serwist.messageSkipWaiting();
      window.location.reload();
      return;
    }

    // Launch gate: activate the pending worker and reload once it takes control.
    let settled = false;

    const onWaiting = () => {
      serwist.messageSkipWaiting();
    };
    const onControlling = () => {
      if (settled) {
        return;
      }
      settled = true;
      serwist.removeEventListener('controlling', onControlling);
      serwist.removeEventListener('waiting', onWaiting);
      clearTimeout(timeoutId);
      window.location.reload();
    };

    serwist.addEventListener('controlling', onControlling);
    serwist.addEventListener('waiting', onWaiting);

    serwist.messageSkipWaiting();
    void serwist.update().catch(() => undefined);

    // Give up (stop listening) if nothing takes control in time, so a late activation can't reload
    // after the gate has revealed the app. The gate reveals the cached app and the banner takes over.
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      serwist.removeEventListener('controlling', onControlling);
      serwist.removeEventListener('waiting', onWaiting);
    }, UPDATE_APPLY_TIMEOUT_MS);
  };
}
