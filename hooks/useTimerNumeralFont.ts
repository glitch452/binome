import { useContext } from 'react';

import { TimerNumeralFontContext, type TimerNumeralFontContextValue } from '@/contexts/TimerNumeralFontContext';

export function useTimerNumeralFont(): TimerNumeralFontContextValue {
  const context = useContext(TimerNumeralFontContext);
  if (!context) {
    throw new Error('useTimerNumeralFont must be used within a TimerNumeralFontProvider');
  }
  return context;
}
