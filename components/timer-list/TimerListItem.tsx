'use client';

import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/time';
import type { TimerConfig } from '@/types/timer';

interface TimerListItemProps {
  timer: TimerConfig;
  isActive?: boolean;
  onEdit: (timer: TimerConfig) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
}

export function TimerListItem({ timer, isActive = false, onEdit, onDelete, onStart }: TimerListItemProps) {
  return (
    <li className="flex items-center justify-between rounded-md border p-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{timer.name}</span>
        <span className="text-muted-foreground text-sm">{formatDuration(timer.durationSeconds)}</span>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(timer)}
          aria-label={`Edit ${timer.name}`}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDelete(timer.id)}
          aria-label={`Delete ${timer.name}`}
        >
          Delete
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onStart(timer.id)}
          disabled={isActive}
          aria-label={`Start ${timer.name}`}
        >
          Start
        </Button>
      </div>
    </li>
  );
}
