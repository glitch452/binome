'use client';

import { ExternalLink, Info, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { BuildInfo } from '@/lib/build-info';

// Matches X.Y.Z with an optional leading 'v' — same pattern as BuildInfoFooter
const SEMVER_RE = /^v?(\d+\.\d+\.\d+)/;

function resolveDisplayVersion(version: string): string {
  return SEMVER_RE.exec(version)?.[1] ?? version;
}

interface UpdateBannerProps {
  update: BuildInfo;
  onDismiss: () => void;
}

export function UpdateBanner({ update, onDismiss }: UpdateBannerProps) {
  const displayVersion = resolveDisplayVersion(update.version);

  return (
    <div role="status" className="bg-muted flex items-start gap-3 border-b px-4 py-3">
      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span>A new version of Binome is available: v{displayVersion}</span>
        {update.releaseUrl !== null && (
          <a
            href={update.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
          >
            Release Notes
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            window.location.reload();
          }}
        >
          <RefreshCw />
          Refresh
        </Button>
      </div>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Dismiss update notification" onClick={onDismiss}>
        <X />
      </Button>
    </div>
  );
}
