'use client';

import { useSerwist } from '@serwist/next/react';
import { useEffect, useState } from 'react';

import { type BuildInfo, buildInfoSchema, getRunningBuildInfo } from '@/lib/build-info';
import { BUILD_INFO_URL, UPDATE_POLL_INTERVAL_MS } from '@/lib/constants';

export interface UseUpdateCheckResult {
  update: BuildInfo | null;
  dismissUpdate: () => void;
}

async function fetchBuildInfo(): Promise<BuildInfo | null> {
  try {
    // `no-store` (not `no-cache`) so no conditional `If-None-Match` is sent: the server always
    // returns a full 200, never a 304. A 304 has no body, and when the service worker intercepts
    // and re-fetches, handing a bare 304 back to the page fails ("error loading resource").
    const res = await fetch(BUILD_INFO_URL, { cache: 'no-store' });
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

  // Flag an update only when the server reports a version *different* from the running one.
  // A waiting worker is a downloaded update, but in production it always carries a different
  // version (every release bumps it), so confirming against the inlined running constant is
  // safe — and it suppresses the spurious "update to the version you're already on" banner from
  // a same-version local rebuild, a duplicate registration, or a worker parked for the version
  // the gate already revealed. An absent running constant means we can't compare, so we don't
  // flag from version numbers alone.
  const flagIfNewer = (info: BuildInfo | null) => {
    const runningVersion = getRunningBuildInfo()?.version;
    if (info !== null && runningVersion !== undefined && info.version !== runningVersion) {
      setDetectedUpdate(info);
    }
  };

  // Service-worker-driven detection: a waiting worker fires this both for mid-session installs
  // and (via wasWaitingBeforeRegister) for one parked at page load — the launch gate handles
  // the latter before AppShell mounts, so mid-session updates are the only remaining case here.
  useEffect(() => {
    if (serwist === null) {
      return undefined;
    }

    const onWaiting = () => {
      void fetchBuildInfo().then(flagIfNewer);
    };

    serwist.addEventListener('waiting', onWaiting);
    return () => {
      serwist.removeEventListener('waiting', onWaiting);
    };
  }, [serwist]);

  // Mount fetch + periodic poll: compare server version to the inlined running constant.
  useEffect(() => {
    const checkForUpdate = async () => {
      flagIfNewer(await fetchBuildInfo());
    };

    void checkForUpdate();

    // Close the missed-`waiting`-event race (§5.4): a worker that parked during the launch gate
    // fired its `waiting` event before this hook mounted, and serwist.update() won't re-fire it
    // for an already-waiting worker, so the live listener above never sees it. Inspect the
    // current registration on mount and run the same detection path. Detection only — never
    // applies — and gated by flagIfNewer, so it can't raise a same-version banner.
    if (serwist !== null && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting !== null && registration?.waiting !== undefined) {
          void fetchBuildInfo().then(flagIfNewer);
        }
      });
    }

    const intervalId = setInterval(() => {
      // Ask the browser to check for a new sw.js so a long-open tab discovers a deploy;
      // a found update installs, parks (skipWaiting: false), and fires 'waiting' above.
      void serwist?.update().catch(() => undefined);
      void checkForUpdate();
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
