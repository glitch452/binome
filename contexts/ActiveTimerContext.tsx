'use client';

import { type ReactNode, createContext, useCallback, useMemo, useState } from 'react';

import { type UseCountdownReturn, useCountdown } from '@/hooks/useCountdown';

export type ActiveTimerContextValue = UseCountdownReturn & {
  isViewingRunView: boolean;
  backToList: () => void;
};

export const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const countdown = useCountdown();
  const [isViewingRunView, setIsViewingRunView] = useState(false);

  const start = useCallback(
    (configId: string, durationSeconds: number, countUp: boolean) => {
      countdown.start(configId, durationSeconds, countUp);
      setIsViewingRunView(true);
    },
    [countdown],
  );

  const backToList = useCallback(() => {
    countdown.stop();
    setIsViewingRunView(false);
  }, [countdown]);

  const value = useMemo(
    () => ({ ...countdown, start, isViewingRunView, backToList }),
    [countdown, start, isViewingRunView, backToList],
  );

  return <ActiveTimerContext.Provider value={value}>{children}</ActiveTimerContext.Provider>;
}
