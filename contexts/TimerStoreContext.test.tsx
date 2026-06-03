import { renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { TimerStoreContext, TimerStoreProvider } from './TimerStoreContext';

const SAMPLE_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
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

  describe('localStorage validation', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns an empty array when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, 'not-valid-json{');
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toStrictEqual([]);
    });

    it('returns an empty array when localStorage contains a non-array value', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify({ name: 'oops' }));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toStrictEqual([]);
    });

    it('drops invalid timers and keeps only valid ones', () => {
      const invalid = { name: '', durationSeconds: 60 }; // empty name
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER, invalid]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toHaveLength(1);
    });

    it('retains the id of the surviving valid timer', () => {
      const invalid = { name: '', durationSeconds: 60 };
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER, invalid]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers[0]?.id).toBe(SAMPLE_TIMER.id);
    });

    it('loads a timer that has only the required fields', () => {
      const minimal = { name: 'Minimal', durationSeconds: 45 };
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([minimal]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers).toHaveLength(1);
    });

    it('defaults flash to false for a timer missing optional fields', () => {
      const minimal = { name: 'Minimal', durationSeconds: 45 };
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([minimal]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers[0]?.flash).toBe(false);
    });

    it('defaults soundId to null for a timer missing optional fields', () => {
      const minimal = { name: 'Minimal', durationSeconds: 45 };
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([minimal]));
      const { result } = renderHook(() => useContext(TimerStoreContext), { wrapper });
      expect(result.current?.timers[0]?.soundId).toBeNull();
    });
  });
});
