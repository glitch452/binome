import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { useTimerStore } from './useTimerStore';

const BASE_INPUT = {
  name: 'My Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
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

  describe('importTimers', () => {
    /** A fully-valid timer that is NOT already in the store. */
    const INCOMING_NEW: TimerConfig = {
      id: '00000000-0000-4000-8000-000000000099',
      name: 'Imported Timer',
      durationSeconds: 90,
      flash: true,
      sound: false,
      soundId: null,
      soundRepeat: 1,
      countUp: false,
      hideName: false,
      notify: false,
      notifyMode: 'hidden',
      createdAt: '2024-06-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
    };

    it('appends a timer whose id is not already in the store', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      act(() => {
        result.current.importTimers([INCOMING_NEW]);
      });
      expect(result.current.timers).toHaveLength(1);
    });

    it('reports added: 1 for a new timer', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([INCOMING_NEW]);
      });
      expect(counts?.added).toBe(1);
    });

    it('reports overwritten: 0 when no id matches', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([INCOMING_NEW]);
      });
      expect(counts?.overwritten).toBe(0);
    });

    it('replaces an existing timer when the id matches', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId!, name: 'Replaced' };
      act(() => {
        result.current.importTimers([replacement]);
      });
      expect(result.current.getTimer(existingId!)?.name).toBe('Replaced');
    });

    it('does not change the list length on an overwrite', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId! };
      act(() => {
        result.current.importTimers([replacement]);
      });
      expect(result.current.timers).toHaveLength(1);
    });

    it('reports overwritten: 1 when the id matches', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId! };
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([replacement]);
      });
      expect(counts?.overwritten).toBe(1);
    });

    it('reports added: 0 when all ids match', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId! };
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([replacement]);
      });
      expect(counts?.added).toBe(0);
    });

    it('handles a mix of new and existing ids in one call', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId!, name: 'Replaced' };
      act(() => {
        result.current.importTimers([replacement, INCOMING_NEW]);
      });
      expect(result.current.timers).toHaveLength(2);
    });

    it('reports correct added count for a mixed import', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId! };
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([replacement, INCOMING_NEW]);
      });
      expect(counts?.added).toBe(1);
    });

    it('reports correct overwritten count for a mixed import', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let existingId: string | undefined;
      act(() => {
        existingId = result.current.addTimer(BASE_INPUT).id;
      });
      const replacement: TimerConfig = { ...INCOMING_NEW, id: existingId! };
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([replacement, INCOMING_NEW]);
      });
      expect(counts?.overwritten).toBe(1);
    });

    it('leaves untouched timers intact', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let untouchedId: string | undefined;
      act(() => {
        untouchedId = result.current.addTimer({ ...BASE_INPUT, name: 'Untouched' }).id;
        result.current.addTimer(BASE_INPUT);
      });
      act(() => {
        result.current.importTimers([INCOMING_NEW]);
      });
      expect(result.current.getTimer(untouchedId!)?.name).toBe('Untouched');
    });

    it('returns added: 0 and overwritten: 0 for an empty import', () => {
      const { result } = renderHook(() => useTimerStore(), { wrapper });
      let counts: ReturnType<typeof result.current.importTimers> | undefined;
      act(() => {
        counts = result.current.importTimers([]);
      });
      expect(counts).toStrictEqual({ added: 0, overwritten: 0 });
    });
  });
});
