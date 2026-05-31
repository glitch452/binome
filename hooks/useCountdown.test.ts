import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts idle with no configId', () => {
      const { result } = renderHook(() => useCountdown());
      expect(result.current.state.status).toBe('idle');
    });

    it('starts with remainingSeconds of zero', () => {
      const { result } = renderHook(() => useCountdown());
      expect(result.current.state.remainingSeconds).toBe(0);
    });
  });

  describe('start', () => {
    it('transitions status to running', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      expect(result.current.state.status).toBe('running');
    });

    it('sets remainingSeconds to the given duration', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      expect(result.current.state.remainingSeconds).toBe(5);
    });

    it('sets configId', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('timer-abc', 5, false);
      });
      expect(result.current.state.configId).toBe('timer-abc');
    });
  });

  describe('tick behaviour', () => {
    it('decrements remainingSeconds by 1 per second', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.state.remainingSeconds).toBe(4);
    });

    it('decrements by 3 after 3 seconds', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.state.remainingSeconds).toBe(2);
    });

    it('transitions to expired when remainingSeconds reaches 0', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 3, false);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.state.status).toBe('expired');
    });

    it('freezes remainingSeconds at 0 on expiry', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 3, false);
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.state.remainingSeconds).toBe(0);
    });
  });

  describe('pause', () => {
    it('transitions status to paused', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        result.current.pause();
      });
      expect(result.current.state.status).toBe('paused');
    });

    it('halts the countdown while paused', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        result.current.pause();
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.state.remainingSeconds).toBe(4);
    });
  });

  describe('resume', () => {
    it('transitions status back to running', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        result.current.pause();
      });
      act(() => {
        result.current.resume();
      });
      expect(result.current.state.status).toBe('running');
    });

    it('continues countdown after resume', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        result.current.pause();
      });
      act(() => {
        result.current.resume();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.state.remainingSeconds).toBe(3);
    });
  });

  describe('reset', () => {
    it('restarts the countdown (status transitions back to running)', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state.status).toBe('running');
    });

    it('restores remainingSeconds to the initial duration', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 5, false);
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state.remainingSeconds).toBe(5);
    });

    it('resets elapsedAfterExpiry to zero', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 2, true);
      });
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.state.elapsedAfterExpiry).toBe(0);
    });
  });

  describe('count-up after expiry (T-26)', () => {
    it('increments elapsedAfterExpiry when countUp is true', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 2, true);
      });
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.state.elapsedAfterExpiry).toBe(2);
    });

    it('keeps elapsedAfterExpiry at zero when countUp is false', () => {
      const { result } = renderHook(() => useCountdown());
      act(() => {
        result.current.start('id1', 2, false);
      });
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.state.elapsedAfterExpiry).toBe(0);
    });
  });
});
