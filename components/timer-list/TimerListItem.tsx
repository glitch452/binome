'use client';

import { useState } from 'react';
import { Bell, Copy, Hash, MessageSquareText, MoreHorizontal, Pencil, Play, Sun, Trash2, X } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MenuItem, MenuPopup, MenuPortal, MenuPositioner, MenuRoot, MenuTrigger } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <li className="flex flex-col gap-3 rounded-md border p-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{timer.name}</span>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <span>{formatDuration(timer.durationSeconds)}</span>
          {!!timer.flash && <Sun className="size-3.5" aria-label="Flash on expiry" />}
          {!!timer.sound && <Bell className="size-3.5" aria-label="Sound on expiry" />}
          {!!timer.countUp && <Hash className="size-3.5" aria-label="Count up after expiry" />}
          {!!timer.notify && <MessageSquareText className="size-3.5" aria-label="Notify on expiry" />}
        </div>
      </div>

      <div className="flex gap-2">
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

        <MenuRoot>
          <MenuTrigger
            render={
              // Plain <button> so base-ui can attach its own event handlers without
              // conflicting with another base-ui component (same pattern as ImportExportMenu).
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                aria-label={`More options for ${timer.name}`}
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
            }
          />
          <MenuPortal>
            <MenuPositioner sideOffset={8} align="end">
              <MenuPopup>
                <MenuItem onClick={() => onEdit(timer)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </MenuItem>
                <MenuItem onClick={() => onClone(timer)}>
                  <Copy aria-hidden="true" />
                  Copy
                </MenuItem>
                <MenuItem onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 aria-hidden="true" />
                  Delete
                </MenuItem>
              </MenuPopup>
            </MenuPositioner>
          </MenuPortal>
        </MenuRoot>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
    </li>
  );
}
