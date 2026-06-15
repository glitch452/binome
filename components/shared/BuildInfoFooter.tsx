'use client';

import { useState } from 'react';
import { useBuildInfo } from '@/hooks/useBuildInfo';
import { AboutDialog } from './AboutDialog';

const FALLBACK_VERSION = '0.0.0';
// Matches X.Y.Z with an optional leading 'v' — produced by semantic-release
// (BUILD_VERSION) or git describe (v1.2.3 / v1.2.3-5-gabcdef).
const SEMVER_RE = /^v?(\d+\.\d+\.\d+)/;

/**
 * Strips a leading `v` to avoid doubling it in the label, and falls back to
 * `0.0.0` when the stored version is the dev sentinel or a raw git SHA.
 * @param version
 */
function resolveDisplayVersion(version: string): string {
  const match = SEMVER_RE.exec(version);
  return match?.[1] ?? FALLBACK_VERSION;
}

export function BuildInfoFooter() {
  const buildInfo = useBuildInfo();
  const [open, setOpen] = useState(false);

  if (!buildInfo) {
    return null;
  }

  const displayVersion = resolveDisplayVersion(buildInfo.version);

  return (
    <>
      <footer className="text-muted-foreground py-2 text-center text-xs" aria-label={`App version: v${displayVersion}`}>
        <button type="button" onClick={() => setOpen(true)} className="cursor-pointer hover:underline">
          v{displayVersion}
        </button>
      </footer>

      <AboutDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
