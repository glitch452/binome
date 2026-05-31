import { useCallback, useContext } from 'react';

import { TimerStoreContext } from '@/contexts/TimerStoreContext';
import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

type NewTimerInput = Omit<TimerConfig, 'id' | 'createdAt' | 'updatedAt'>;
type TimerUpdate = Partial<Omit<TimerConfig, 'id' | 'createdAt'>>;

function now(): string {
  return new Date().toISOString();
}

function validateName(name: string): void {
  if (name.trim().length === 0 || name.length > TIMER_NAME_MAX_LENGTH) {
    throw new Error(`Timer name must be 1–${TIMER_NAME_MAX_LENGTH} characters`);
  }
}

function validateDuration(durationSeconds: number): void {
  if (durationSeconds <= 0) {
    throw new Error('Duration must be greater than 0');
  }
}

export interface UseTimerStoreReturn {
  timers: TimerConfig[];
  addTimer: (input: NewTimerInput) => TimerConfig;
  updateTimer: (id: string, update: TimerUpdate) => void;
  deleteTimer: (id: string) => void;
  getTimer: (id: string) => TimerConfig | undefined;
}

export function useTimerStore(): UseTimerStoreReturn {
  const ctx = useContext(TimerStoreContext);
  if (!ctx) {
    throw new Error('useTimerStore must be used within a TimerStoreProvider');
  }
  const { timers, setTimers } = ctx;

  const addTimer = useCallback(
    (input: NewTimerInput): TimerConfig => {
      validateName(input.name);
      validateDuration(input.durationSeconds);
      const timer: TimerConfig = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now(),
        updatedAt: now(),
      };
      setTimers((prev) => [...prev, timer]);
      return timer;
    },
    [setTimers],
  );

  const updateTimer = useCallback(
    (id: string, update: TimerUpdate): void => {
      if (update.name !== undefined) {
        validateName(update.name);
      }
      if (update.durationSeconds !== undefined) {
        validateDuration(update.durationSeconds);
      }
      setTimers((prev) => prev.map((t) => (t.id === id ? { ...t, ...update, updatedAt: now() } : t)));
    },
    [setTimers],
  );

  const deleteTimer = useCallback(
    (id: string): void => {
      setTimers((prev) => prev.filter((t) => t.id !== id));
    },
    [setTimers],
  );

  const getTimer = useCallback((id: string): TimerConfig | undefined => timers.find((t) => t.id === id), [timers]);

  return { timers, addTimer, updateTimer, deleteTimer, getTimer };
}
