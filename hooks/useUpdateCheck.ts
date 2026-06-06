'use client';

import { useEffect, useRef, useState } from 'react';

import { type BuildInfo, buildInfoSchema } from '@/lib/build-info';

const BUILD_INFO_URL = '/build-info.json';
export const UPDATE_POLL_INTERVAL_MS = 3_600_000;

export interface UseUpdateCheckResult {
  update: BuildInfo | null;
  dismissUpdate: () => void;
}

async function fetchBuildInfo(): Promise<BuildInfo | null> {
  try {
    const res = await fetch(BUILD_INFO_URL);
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
  const [detectedUpdate, setDetectedUpdate] = useState<BuildInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const initialVersion = useRef<string | null>(null);

  useEffect(() => {
    void fetchBuildInfo().then((info) => {
      if (info !== null) {
        initialVersion.current = info.version;
      }
    });

    const intervalId = setInterval(() => {
      void fetchBuildInfo().then((info) => {
        if (info === null) {
          return;
        }

        if (initialVersion.current === null) {
          // First successful poll after a failed initial fetch — set baseline silently.
          initialVersion.current = info.version;
          return;
        }

        if (info.releaseUrl !== null && info.version !== initialVersion.current) {
          setDetectedUpdate(info);
        }
      });
    }, UPDATE_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const update = detectedUpdate !== null && detectedUpdate.version !== dismissedVersion ? detectedUpdate : null;

  const dismissUpdate = () => {
    if (detectedUpdate !== null) {
      setDismissedVersion(detectedUpdate.version);
    }
  };

  return { update, dismissUpdate };
}
