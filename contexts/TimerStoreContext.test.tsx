import { renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { TimerStoreContext, TimerStoreProvider } from './TimerStoreContext';

const SAMPLE_TIMER: TimerConfig = {
  id: 'abc-123',
  name: 'Test Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function wrapper({ children }: { children: ReactNode }) {
  return <TimerStoreProvider>{children}</TimerStoreProvider>;
}

describe('TimerStoreContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('provides an empty timers array when localStorage is empty', () => {
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toStrictEqual([]);
    });

    it('provides a setTimers function', () => {
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(typeof result.current?.setTimers).toBe('function');
    });
  });

  describe('hydration from localStorage', () => {
    it('reads existing timers from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toHaveLength(1);
    });

    it('parses the stored timer data correctly', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers[0]?.id).toBe(SAMPLE_TIMER.id);
    });
  });
});
