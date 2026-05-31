'use client';

import { type ReactNode, createContext } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

export interface TimerStoreContextValue {
  timers: TimerConfig[];
  setTimers: (value: TimerConfig[] | ((prev: TimerConfig[]) => TimerConfig[])) => void;
}

export const TimerStoreContext = createContext<TimerStoreContextValue | null>(null);

export function TimerStoreProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useLocalStorage<TimerConfig[]>(STORAGE_KEY_TIMERS, []);
  return <TimerStoreContext.Provider value={{ timers, setTimers }}>{children}</TimerStoreContext.Provider>;
}
