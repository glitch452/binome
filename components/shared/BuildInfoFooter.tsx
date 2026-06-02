'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBuildInfo } from '@/hooks/useBuildInfo';

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
  const repoUrl = buildInfo.releasesUrl.replace('/releases', '');
  const commitUrl = `${repoUrl}/commit/${buildInfo.commit}`;
  const releaseHref = buildInfo.releaseUrl ?? buildInfo.releasesUrl;

  return (
    <>
      <footer className="text-muted-foreground py-2 text-center text-xs" aria-label={`App version: v${displayVersion}`}>
        <button type="button" onClick={() => setOpen(true)} className="cursor-pointer hover:underline">
          v{displayVersion}
        </button>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
