'use client';

import { type ReactNode, createContext, useCallback, useMemo } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DEFAULT_TIMER_NUMERAL_FONT, STORAGE_KEY_TIMER_NUMERAL_FONT } from '@/lib/constants';
import { timerNumeralFontSchema } from '@/lib/preferencesSchema';
import type { TimerNumeralFont } from '@/types/timer';

export interface TimerNumeralFontContextValue {
  numeralFont: TimerNumeralFont;
  setNumeralFont: (font: TimerNumeralFont) => void;
}

export const TimerNumeralFontContext = createContext<TimerNumeralFontContextValue | null>(null);

export function TimerNumeralFontProvider({ children }: { children: ReactNode }) {
  const [numeralFont, setStoredNumeralFont] = useLocalStorage<TimerNumeralFont>(
    STORAGE_KEY_TIMER_NUMERAL_FONT,
    DEFAULT_TIMER_NUMERAL_FONT,
    {
      sync: true,
      parse: (raw) => timerNumeralFontSchema.parse(raw),
    },
  );

  const setNumeralFont = useCallback(
    (font: TimerNumeralFont) => {
      setStoredNumeralFont(font);
    },
    [setStoredNumeralFont],
  );

  const value = useMemo(() => ({ numeralFont, setNumeralFont }), [numeralFont, setNumeralFont]);

  return <TimerNumeralFontContext.Provider value={value}>{children}</TimerNumeralFontContext.Provider>;
}
