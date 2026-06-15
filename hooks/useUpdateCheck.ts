'use client';

import { useSerwist } from '@serwist/next/react';
import { useEffect, useRef, useState } from 'react';

import { type BuildInfo, buildInfoSchema } from '@/lib/build-info';
import { BUILD_INFO_URL, UPDATE_POLL_INTERVAL_MS } from '@/lib/constants';

export interface UseUpdateCheckResult {
  update: BuildInfo | null;
  dismissUpdate: () => void;
}

async function fetchBuildInfo(): Promise<BuildInfo | null> {
  try {
    const res = await fetch(BUILD_INFO_URL, { cache: 'no-cache' });
    if (!res.ok) {
      return null;
    }
    const result = buildInfoSchema.safeParse(await res.json());
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export function useUpdateCheck(): UseUpdateCheckResult {
  const { serwist } = useSerwist();
  const [detectedUpdate, setDetectedUpdate] = useState<BuildInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const initialVersion = useRef<string | null>(null);
  const swWaiting = useRef(false);

  // Service-worker-driven detection — the definitive signal in production. A waiting
  // worker IS a downloaded update, and it is exactly what useApplyUpdate's skip-waiting
  // handshake activates. The 'waiting' event fires both when a new worker installs while
  // the app is open and (via wasWaitingBeforeRegister) when one was already parked at
  // launch — the case where the app shell itself is served from the stale precache, so
  // version comparison against a fetched baseline can never detect the update.
  useEffect(() => {
    if (serwist === null) {
      return undefined;
    }

    const onWaiting = () => {
      swWaiting.current = true;
      void fetchBuildInfo().then((info) => {
        if (info !== null) {
          setDetectedUpdate(info);
        }
      });
    };

    serwist.addEventListener('waiting', onWaiting);
    return () => {
      serwist.removeEventListener('waiting', onWaiting);
    };
  }, [serwist]);

  useEffect(() => {
    void fetchBuildInfo().then((info) => {
      if (info !== null) {
        initialVersion.current = info.version;
      }
    });

    const intervalId = setInterval(() => {
      // Ask the browser to check for a new sw.js so a long-open tab discovers a deploy;
      // a found update installs, parks (skipWaiting: false), and fires 'waiting' above.
      void serwist?.update().catch(() => undefined);

      void fetchBuildInfo().then((info) => {
        if (info === null) {
          return;
        }

        if (swWaiting.current) {
          // Retry path: 'waiting' fired but its build-info fetch failed at that moment.
          setDetectedUpdate((prev) => prev ?? info);
          return;
        }

        if (initialVersion.current === null) {
          // First successful poll after a failed initial fetch — set baseline silently.
          initialVersion.current = info.version;
          return;
        }

        // Version-compare fallback for when no service worker is registered.
        if (info.releaseUrl !== null && info.version !== initialVersion.current) {
          setDetectedUpdate(info);
        }
      });
    }, UPDATE_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [serwist]);

  const update = detectedUpdate !== null && detectedUpdate.version !== dismissedVersion ? detectedUpdate : null;

  const dismissUpdate = () => {
    if (detectedUpdate !== null) {
      setDismissedVersion(detectedUpdate.version);
    }
  };

  return { update, dismissUpdate };
}
