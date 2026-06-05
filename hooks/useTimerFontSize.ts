import { useContext } from 'react';

import { TimerFontSizeContext, type TimerFontSizeContextValue } from '@/contexts/TimerFontSizeContext';

export function useTimerFontSize(): TimerFontSizeContextValue {
  const context = useContext(TimerFontSizeContext);
  if (!context) {
    throw new Error('useTimerFontSize must be used within a TimerFontSizeProvider');
  }
  return context;
}
