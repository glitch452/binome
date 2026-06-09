import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from './ActiveTimerContext';

function wrapper({ children }: { children: ReactNode }) {
  return <ActiveTimerProvider>{children}</ActiveTimerProvider>;
}

describe('ActiveTimerContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('exposes idle status initially', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      expect(result.current?.state.status).toBe('idle');
    });

    it('exposes null configId initially', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      expect(result.current?.state.configId).toBeNull();
    });
  });

  describe('controls', () => {
    it('starts a timer via context', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      expect(result.current?.state.status).toBe('running');
    });

    it('pauses a running timer via context', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.pause();
      });
      expect(result.current?.state.status).toBe('paused');
    });

    it('resumes a paused timer via context', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.pause();
      });
      act(() => {
        result.current?.resume();
      });
      expect(result.current?.state.status).toBe('running');
    });

    it('resets a running timer via context', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      act(() => {
        result.current?.reset();
      });
      expect(result.current?.state.remainingSeconds).toBe(10);
    });
  });

  describe('backToList', () => {
    it('sets isViewingRunView to false', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.backToList();
      });
      expect(result.current?.isViewingRunView).toBe(false);
    });

    it('stops the timer (status becomes idle)', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.backToList();
      });
      expect(result.current?.state.status).toBe('idle');
    });

    it('resets configId to null', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.backToList();
      });
      expect(result.current?.state.configId).toBeNull();
    });

    it('halts ticking after back navigation', () => {
      const { result } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        result.current?.backToList();
      });
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current?.state.status).toBe('idle');
    });
  });
});
