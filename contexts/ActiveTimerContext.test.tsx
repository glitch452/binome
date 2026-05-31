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

  describe('FR-10 — timer persists across view switches', () => {
    it('preserves timer state after consumer re-renders within the same provider', () => {
      const { result, rerender } = renderHook(() => useContext(ActiveTimerContext), { wrapper });
      act(() => {
        result.current?.start('cfg-1', 10, false);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      rerender(); // simulate view switch — provider stays mounted, consumer re-renders
      expect(result.current?.state.remainingSeconds).toBe(7);
    });
  });
});
