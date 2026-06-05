'use client';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/time';
import type { TimerFontSize, TimerStatus } from '@/types/timer';

// cqw values are relative to the nearest container-type:inline-size ancestor,
// which is placed inside RunView's padding so 100cqw = available text width.
// Values ≤ 18cqw keep even a 9-character "+00:00:00" on-screen at any viewport.
const FONT_SIZE_CLASS: Record<TimerFontSize, string> = {
  sm: '[font-size:min(9cqw,4rem)]',
  md: '[font-size:min(13cqw,7rem)]',
  lg: '[font-size:min(17cqw,10rem)]',
  xl: '[font-size:min(18cqw,13rem)]',
};

interface CountdownDisplayProps {
  remainingSeconds: number;
  elapsedAfterExpiry: number;
  status: TimerStatus;
  countUp?: boolean;
  fontSize?: TimerFontSize;
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
  fontSize = 'md',
}: CountdownDisplayProps) {
  const displayValue = getDisplayValue(status, remainingSeconds, elapsedAfterExpiry, countUp);

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums select-none',
        FONT_SIZE_CLASS[fontSize],
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
