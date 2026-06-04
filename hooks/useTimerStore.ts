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
  /**
   * Merge imported timers into the store by id: replace on id match, append
   * otherwise. Timers are assumed to have already passed `timerConfigSchema` —
   * no name/duration re-validation is performed.
   * @param incoming
   * @returns Counts of added (new id) and overwritten (existing id) timers.
   */
  importTimers: (incoming: TimerConfig[]) => { added: number; overwritten: number };
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

  const importTimers = useCallback(
    (incoming: TimerConfig[]): { added: number; overwritten: number } => {
      // Compute counts from the current timers snapshot so the return value is
      // available synchronously. The actual merge uses a functional updater so
      // it operates on the latest state even if React batches the update.
      const existingIds = new Set(timers.map((t) => t.id));
      let added = 0;
      let overwritten = 0;
      for (const timer of incoming) {
        if (existingIds.has(timer.id)) {
          overwritten++;
        } else {
          added++;
        }
      }
      setTimers((prev) => {
        const map = new Map<string, TimerConfig>(prev.map((t) => [t.id, t]));
        for (const timer of incoming) {
          map.set(timer.id, timer);
        }
        return Array.from(map.values());
      });
      return { added, overwritten };
    },
    [setTimers, timers],
  );

  return { timers, addTimer, updateTimer, deleteTimer, getTimer, importTimers };
}
