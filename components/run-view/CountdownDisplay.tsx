'use client';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time';
import type { TimerStatus } from '@/types/timer';

interface CountdownDisplayProps {
  remainingSeconds: number;
  elapsedAfterExpiry: number;
  status: TimerStatus;
  countUp?: boolean;
}

function getDisplayValue(
  status: TimerStatus,
  remainingSeconds: number,
  elapsedAfterExpiry: number,
  countUp: boolean,
): string {
  if (status === 'expired') {
    return countUp ? formatDuration(elapsedAfterExpiry, '+') : '00:00';
  }
  return formatDuration(remainingSeconds);
}

export function CountdownDisplay({
  remainingSeconds,
  elapsedAfterExpiry,
  status,
  countUp = false,
}: CountdownDisplayProps) {
  const displayValue = getDisplayValue(status, remainingSeconds, elapsedAfterExpiry, countUp);

  return (
    <div
      className={cn(
        'font-mono [font-size:clamp(3rem,15vw,8rem)] font-bold tabular-nums select-none',
        status === 'paused' && 'opacity-50',
        status === 'expired' && countUp && 'text-destructive',
      )}
      aria-live="polite"
      aria-label={`Timer: ${displayValue}`}
      data-testid="countdown-display"
    >
      {displayValue}
    </div>
  );
}
