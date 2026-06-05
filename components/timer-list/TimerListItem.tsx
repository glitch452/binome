'use client';

import { Bell, Copy, Hash, Pencil, Play, Sun, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDuration } from '@/lib/time';
import type { TimerConfig } from '@/types/timer';

interface TimerListItemProps {
  timer: TimerConfig;
  isActive?: boolean;
  onEdit: (timer: TimerConfig) => void;
  onClone: (timer: TimerConfig) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
}

export function TimerListItem({ timer, isActive = false, onEdit, onClone, onDelete, onStart }: TimerListItemProps) {
  return (
    <li className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{timer.name}</span>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <span>{formatDuration(timer.durationSeconds)}</span>
          {!!timer.flash && <Sun className="size-3.5" aria-label="Flash on expiry" />}
          {!!timer.sound && <Bell className="size-3.5" aria-label="Sound on expiry" />}
          {!!timer.countUp && <Hash className="size-3.5" aria-label="Count up after expiry" />}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(timer)}
          aria-label={`Edit ${timer.name}`}
        >
          <Pencil />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onClone(timer)}
          aria-label={`Copy ${timer.name}`}
        >
          <Copy />
          Copy
        </Button>
        <Dialog>
          <DialogTrigger
            render={
              <Button type="button" variant="outline" size="sm" aria-label={`Delete ${timer.name}`}>
                <Trash2 />
                Delete
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Timer</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &ldquo;{timer.name}&rdquo;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    <X />
                    Cancel
                  </Button>
                }
              />
              <DialogClose
                render={
                  <Button type="button" variant="destructive" onClick={() => onDelete(timer.id)}>
                    <Trash2 />
                    Delete
                  </Button>
                }
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          size="sm"
          onClick={() => onStart(timer.id)}
          disabled={isActive}
          aria-label={`Start ${timer.name}`}
        >
          <Play />
          Start
        </Button>
      </div>
    </li>
  );
}
