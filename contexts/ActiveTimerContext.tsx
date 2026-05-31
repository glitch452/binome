'use client';

import { type ReactNode, createContext } from 'react';

import { type UseCountdownReturn, useCountdown } from '@/hooks/useCountdown';

export type ActiveTimerContextValue = UseCountdownReturn;

export const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const countdown = useCountdown();
  return <ActiveTimerContext.Provider value={countdown}>{children}</ActiveTimerContext.Provider>;
}
