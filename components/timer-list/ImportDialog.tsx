'use client';

import { useState } from 'react';
import { AlertTriangle, Bell, Check, Hash, Sun, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDuration } from '@/lib/time';
import type { TimerConfig } from '@/types/timer';

export interface ImportDialogCandidate {
  timer: TimerConfig;
  /** True when the timer's id already exists in the store (overwrite). */
  conflict: boolean;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: ImportDialogCandidate[];
  /** Number of timers in the file that were invalid and skipped by `parseTimerList`. */
  droppedCount: number;
  /** Called with the subset of candidates the user chose to import. */
  onConfirm: (selected: TimerConfig[]) => void;
}

/**
 * Non-conflicting candidates are checked by default; conflicting ones are not.
 * @param candidates
 */
function initChecked(candidates: ImportDialogCandidate[]): Set<string> {
  return new Set(candidates.filter((c) => !c.conflict).map((c) => c.timer.id));
}

/**
 * Selection dialog shown before an import is applied.
 * Each candidate row is pre-checked based on conflict status; the user can
 * adjust before confirming. The Import button is disabled when nothing is selected.
 * @param root0
 * @param root0.open
 * @param root0.onOpenChange
 * @param root0.candidates
 * @param root0.droppedCount
 * @param root0.onConfirm
 */
export function ImportDialog({ open, onOpenChange, candidates, droppedCount, onConfirm }: ImportDialogProps) {
  // State is seeded once on mount. The parent remounts this component (via `key`)
  // each time a new file is picked so initChecked always reflects the latest candidates.
  const [checked, setChecked] = useState<Set<string>>(() => initChecked(candidates));

  const toggle = (id: string, value: boolean | 'mixed') => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value === true) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(candidates.filter((c) => checked.has(c.timer.id)).map((c) => c.timer));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Timers</DialogTitle>
          {droppedCount > 0 && (
            <DialogDescription>
              {droppedCount} timer{droppedCount !== 1 ? 's' : ''} in the file were invalid and skipped.
            </DialogDescription>
          )}
        </DialogHeader>

        <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto py-1">
          {candidates.map(({ timer, conflict }) => (
            <li key={timer.id} className="flex items-start gap-3">
              <Checkbox
                checked={checked.has(timer.id)}
                onCheckedChange={(value) => toggle(timer.id, value)}
                aria-label={timer.name}
                className="mt-0.5 shrink-0"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm leading-none font-medium">{timer.name}</span>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span>{formatDuration(timer.durationSeconds)}</span>
                  {!!timer.flash && <Sun className="size-3" aria-label="Flash on expiry" />}
                  {!!timer.sound && <Bell className="size-3" aria-label="Sound on expiry" />}
                  {!!timer.countUp && <Hash className="size-3" aria-label="Count up after expiry" />}
                </div>
                {!!conflict && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                    <span>Overwrites existing</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                <X aria-hidden="true" />
                Cancel
              </Button>
            }
          />
          <Button type="button" disabled={checked.size === 0} onClick={handleConfirm}>
            <Check aria-hidden="true" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
