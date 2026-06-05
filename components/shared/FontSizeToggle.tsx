'use client';

import { Button } from '@/components/ui/button';
import { useTimerFontSize } from '@/hooks/useTimerFontSize';
import type { TimerFontSize } from '@/types/timer';

const NEXT_SIZE: Record<TimerFontSize, TimerFontSize> = {
  sm: 'md',
  md: 'lg',
  lg: 'xl',
  xl: 'sm',
};

const ARIA_LABEL: Record<TimerFontSize, string> = {
  sm: 'Switch to medium font size',
  md: 'Switch to large font size',
  lg: 'Switch to extra large font size',
  xl: 'Switch to small font size',
};

const LABEL_CLASS: Record<TimerFontSize, string> = {
  sm: 'text-xs font-bold font-mono',
  md: 'text-sm font-bold font-mono',
  lg: 'text-base font-bold font-mono',
  xl: 'text-lg font-bold font-mono',
};

export function FontSizeToggle() {
  const { fontSize, setFontSize } = useTimerFontSize();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setFontSize(NEXT_SIZE[fontSize])}
      aria-label={ARIA_LABEL[fontSize]}
    >
      <span className={LABEL_CLASS[fontSize]} aria-hidden="true">
        A
      </span>
    </Button>
  );
}
