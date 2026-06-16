'use client';

import { type ReactNode, useEffect } from 'react';

import { useHydrated } from '@/hooks/useHydrated';
import { useLaunchUpdate } from '@/hooks/useLaunchUpdate';
import { AppSkeleton } from './shared/AppSkeleton';

interface LaunchGateProps {
  children: ReactNode;
}

/**
 * Dev-only escape hatch: `localhost:3000/?skeleton` pins the loading skeleton on screen so it
 * can be inspected/iterated on (in dev the service worker is disabled, so the gate normally
 * resolves in one tick and the skeleton is never visible). The `NODE_ENV` guard short-circuits
 * to `false` in production builds, so the `window` read is dead-code-eliminated there.
 */
function isSkeletonPreview(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('skeleton')
  );
}

export function LaunchGate({ children }: LaunchGateProps): ReactNode {
  const hydrated = useHydrated();
  const { ready } = useLaunchUpdate();
  const revealed = hydrated && ready;
  const forcePreview = isSkeletonPreview();

  // Mark <html> as ready on reveal so the overscroll/rubber-band area switches from the
  // loading-phase dark background to the active accent (see app/globals.css `html.app-ready`).
  // Skipped while previewing so the skeleton's authentic dark loading state is preserved.
  useEffect(() => {
    if (revealed && !forcePreview) {
      document.documentElement.classList.add('app-ready');
    }
  }, [revealed, forcePreview]);

  if (forcePreview || !revealed) {
    return <AppSkeleton />;
  }

  return children;
}
