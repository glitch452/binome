import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';

import { useTimerStore } from './useTimerStore';

const BASE_INPUT = {
  name: 'My Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
} as const;

function wrapper({ children }: { children: ReactNode }) {
  return <TimerStoreProvider>{children}</TimerStoreProvider>;
}

describe('useTimerStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('addTimer', () => {
    it('adds a timer to the list', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      act(() => {
        result.current.addTimer(BASE_INPUT);
      });
      expect(result.current.timers).toHaveLength(1);
    });

    it('returns the created timer with a UUID id', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let timer: ReturnType<typeof result.current.addTimer> | undefined;
      act(() => {
        timer = result.current.addTimer(BASE_INPUT);
      });
      expect(timer?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('sets createdAt as an ISO 8601 string', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let timer: ReturnType<typeof result.current.addTimer> | undefined;
      act(() => {
        timer = result.current.addTimer(BASE_INPUT);
      });
      expect(timer?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('throws when name is empty', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      expect(() =>
        act(() => {
          result.current.addTimer({ ...BASE_INPUT, name: '' });
        }),
      ).toThrow();
    });

    it('throws when name exceeds max length', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      const longName = 'a'.repeat(TIMER_NAME_MAX_LENGTH + 1);
      expect(() =>
        act(() => {
          result.current.addTimer({ ...BASE_INPUT, name: longName });
        }),
      ).toThrow();
    });

    it('throws when durationSeconds is zero', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      expect(() =>
        act(() => {
          result.current.addTimer({ ...BASE_INPUT, durationSeconds: 0 });
        }),
      ).toThrow();
    });

    it('throws when durationSeconds is negative', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      expect(() =>
        act(() => {
          result.current.addTimer({ ...BASE_INPUT, durationSeconds: -1 });
        }),
      ).toThrow();
    });
  });

  describe('updateTimer', () => {
    it('updates the name of an existing timer', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      act(() => {
        id = result.current.addTimer(BASE_INPUT).id;
      });
      act(() => {
        result.current.updateTimer(id!, { name: 'Updated' });
      });
      expect(result.current.getTimer(id!)?.name).toBe('Updated');
    });

    it('bumps updatedAt on update', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      let originalUpdatedAt: string | undefined;
      act(() => {
        const t = result.current.addTimer(BASE_INPUT);
        id = t.id;
        originalUpdatedAt = t.updatedAt;
      });
      act(() => {
        vi.advanceTimersByTime(100);
      }); // ensure Date advances
      act(() => {
        result.current.updateTimer(id!, { name: 'Changed' });
      });
      vi.useRealTimers();
      expect(result.current.getTimer(id!)?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('throws when updating to an invalid name', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      act(() => {
        id = result.current.addTimer(BASE_INPUT).id;
      });
      expect(() =>
        act(() => {
          result.current.updateTimer(id!, { name: '' });
        }),
      ).toThrow();
    });

    it('throws when updating to invalid duration', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      act(() => {
        id = result.current.addTimer(BASE_INPUT).id;
      });
      expect(() =>
        act(() => {
          result.current.updateTimer(id!, { durationSeconds: 0 });
        }),
      ).toThrow();
    });
  });

  describe('deleteTimer', () => {
    it('removes the timer from the list', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      act(() => {
        id = result.current.addTimer(BASE_INPUT).id;
      });
      act(() => {
        result.current.deleteTimer(id!);
      });
      expect(result.current.timers).toHaveLength(0);
    });

    it('leaves other timers intact', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id1: string | undefined;
      act(() => {
        id1 = result.current.addTimer(BASE_INPUT).id;
        result.current.addTimer({ ...BASE_INPUT, name: 'Other' });
      });
      act(() => {
        result.current.deleteTimer(id1!);
      });
      expect(result.current.timers).toHaveLength(1);
    });
  });

  describe('getTimer', () => {
    it('returns the timer matching the given id', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let id: string | undefined;
      act(() => {
        id = result.current.addTimer(BASE_INPUT).id;
      });
      expect(result.current.getTimer(id!)?.name).toBe(BASE_INPUT.name);
    });

    it('returns undefined for an unknown id', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      expect(result.current.getTimer('unknown')).toBeUndefined();
    });
  });
});
