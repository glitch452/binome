'use client';

import { useEffect, useRef, useState } from 'react';

import { useSerwist } from '@serwist/next/react';

import { type BuildInfo, buildInfoSchema, getRunningBuildInfo } from '@/lib/build-info';
import { BUILD_INFO_URL, GATE_UPDATE_APPLY_TIMEOUT_MS, GATE_VERSION_CHECK_TIMEOUT_MS } from '@/lib/constants';
import { useApplyUpdate } from './useApplyUpdate';

export interface UseLaunchUpdateResult {
  ready: boolean;
}

async function fetchServerBuildInfo(): Promise<BuildInfo | null> {
  try {
    // `no-store` (not `no-cache`): no conditional request → always a full 200, never a 304 (a 304
    // has no body and breaks when the service worker re-fetches and hands it back to the page).
    const res = await fetch(BUILD_INFO_URL, { cache: 'no-store' });
    if (!res.ok) {
      return null;
    }
    const result = buildInfoSchema.safeParse(await res.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * §6.3 version-check state machine for the launch gate.
 *
 * Returns `{ ready: false }` on the first render and flips to `{ ready: true }` once one of
 * these conditions is met:
 *   - No service worker (dev/unsupported): ready immediately after mount.
 *   - Worker waiting at launch (`wasWaitingBeforeRegister`): calls `applyUpdate()` and
 *     holds — the page reloads onto the new build, which will then resolve `ready`.
 *   - Server version === running version: up to date, reveal.
 *   - Server version !== running version: calls `applyUpdate()` and holds.
 *   - Fetch fails / offline: reveal the cached app.
 *   - `GATE_VERSION_CHECK_TIMEOUT_MS` (3 s) elapses before any decision: reveal.
 *   - `GATE_UPDATE_APPLY_TIMEOUT_MS` (10 s) elapses while applying: reveal and let the
 *     manual banner take over.
 */
export function useLaunchUpdate(): UseLaunchUpdateResult {
  const { serwist } = useSerwist();
  const applyUpdate = useApplyUpdate();
  const applyUpdateRef = useRef(applyUpdate);
  applyUpdateRef.current = applyUpdate; // eslint-disable-line react-hooks/refs -- keeps ref fresh each render without re-running the mount-only effect

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (serwist === null) {
      setReady(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: no SW means gate is trivially resolved, no external subscription needed
      return undefined;
    }

    let versionDecided = false;
    // eslint-disable-next-line prefer-const -- must be declared before the closures that call clearTimeout(versionTimerId)
    let versionTimerId: ReturnType<typeof setTimeout> | undefined;
    let applyTimerId: ReturnType<typeof setTimeout> | undefined;

    const revealNow = () => {
      if (versionDecided) {
        return;
      }
      versionDecided = true;
      clearTimeout(versionTimerId);
      setReady(true);
    };

    const startApplying = () => {
      if (versionDecided) {
        return;
      }
      versionDecided = true;
      clearTimeout(versionTimerId);
      applyUpdateRef.current();
      applyTimerId = setTimeout(() => {
        setReady(true);
      }, GATE_UPDATE_APPLY_TIMEOUT_MS);
    };

    const onWaiting = (event: { wasWaitingBeforeRegister?: boolean }) => {
      if (event.wasWaitingBeforeRegister === true) {
        startApplying();
      }
    };
    serwist.addEventListener('waiting', onWaiting);

    versionTimerId = setTimeout(revealNow, GATE_VERSION_CHECK_TIMEOUT_MS);

    void fetchServerBuildInfo().then((serverInfo) => {
      if (versionDecided) {
        return;
      }
      if (serverInfo === null) {
        revealNow();
        return;
      }
      const runningVersion = getRunningBuildInfo()?.version;
      if (runningVersion === undefined || serverInfo.version === runningVersion) {
        revealNow();
      } else {
        startApplying();
      }
    });

    return () => {
      versionDecided = true;
      clearTimeout(versionTimerId);
      clearTimeout(applyTimerId);
      serwist.removeEventListener('waiting', onWaiting);
    };
  }, [serwist]);

  return { ready };
}
