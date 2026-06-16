'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `false` on the initial (server/pre-effect) render and `true` after the first
 * post-mount effect flush. Used by `LaunchGate` to confirm that preference contexts have
 * had a chance to read their stored values from `localStorage` before the app is revealed.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: no external subscription; state update IS the effect (signals post-mount)
  }, []);

  return hydrated;
}
