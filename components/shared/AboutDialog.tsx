'use client';

import { ExternalLink } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBuildInfo } from '@/hooks/useBuildInfo';

const FALLBACK_VERSION = '0.0.0';
const SEMVER_RE = /^v?(\d+\.\d+\.\d+)/;

function resolveDisplayVersion(version: string): string {
  const match = SEMVER_RE.exec(version);
  return match?.[1] ?? FALLBACK_VERSION;
}

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const buildInfo = useBuildInfo();

  if (!buildInfo) {
    return null;
  }

  const displayVersion = resolveDisplayVersion(buildInfo.version);
  const repoUrl = buildInfo.releasesUrl.replace('/releases', '');
  const commitUrl = `${repoUrl}/commit/${buildInfo.commit}`;
  const releaseHref = buildInfo.releaseUrl ?? buildInfo.releasesUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="flex-row items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo.svg is a static asset; next/image adds no benefit here */}
          <img src="/logo.svg" alt="Binome logo" className="size-20 shrink-0 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <DialogTitle>Binome</DialogTitle>
            <DialogDescription>A countdown timer with configurable alerts.</DialogDescription>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          Binome is a browser-based countdown timer. Create a library of named timers, run one at a time, and get
          alerted on expiry with a screen flash, an audio sound, and an optional count-up display. All data is stored
          locally in your browser — no account or server required. The name comes from the animated series{' '}
          <a href="https://reboot.fandom.com/wiki/Binome" target="_blank" rel="noreferrer" className="underline">
            ReBoot
          </a>
          , where binomes are the small binary-coded inhabitants of Mainframe.
        </p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Version</dt>
          <dd>
            <a
              href={releaseHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              v{displayVersion}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </dd>

          <dt className="text-muted-foreground">Commit</dt>
          <dd>
            <a
              href={commitUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:underline"
            >
              {buildInfo.commitShort}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </dd>

          <dt className="text-muted-foreground">Repository</dt>
          <dd>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              glitch452/binome
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </dd>

          <dt className="text-muted-foreground">License</dt>
          <dd>
            <a
              href="https://choosealicense.com/licenses/mit/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              MIT
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </dd>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
