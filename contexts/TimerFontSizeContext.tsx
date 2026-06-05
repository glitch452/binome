'use client';

import { type ReactNode, createContext, useCallback, useMemo } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEY_TIMER_FONT_SIZE } from '@/lib/constants';
import type { TimerFontSize } from '@/types/timer';

export interface TimerFontSizeContextValue {
  fontSize: TimerFontSize;
  setFontSize: (size: TimerFontSize) => void;
}

export const TimerFontSizeContext = createContext<TimerFontSizeContextValue | null>(null);

export function TimerFontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setStoredFontSize] = useLocalStorage<TimerFontSize>(STORAGE_KEY_TIMER_FONT_SIZE, 'md', {
    sync: true,
  });

  const setFontSize = useCallback(
    (size: TimerFontSize) => {
      setStoredFontSize(size);
    },
    [setStoredFontSize],
  );

  const value = useMemo(() => ({ fontSize, setFontSize }), [fontSize, setFontSize]);

  return <TimerFontSizeContext.Provider value={value}>{children}</TimerFontSizeContext.Provider>;
}
