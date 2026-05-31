'use client';

import { useBuildInfo } from '@/hooks/useBuildInfo';

export function BuildInfoFooter() {
  const buildInfo = useBuildInfo();

  if (!buildInfo) {
    return null;
  }

  const label = `v${buildInfo.version} (${buildInfo.commitShort})`;

  return (
    <footer className="text-muted-foreground py-2 text-center text-xs" aria-label={`App version: ${label}`}>
      {buildInfo.releaseUrl ? (
        <a href={buildInfo.releaseUrl} target="_blank" rel="noreferrer" className="hover:underline">
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
    </footer>
  );
}
