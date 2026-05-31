import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FLASH_DURATION_MS } from '@/lib/constants';

import { useFlash } from './useFlash';

describe('useFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('is not flashing initially', () => {
      const { result } = renderHook(() => useFlash());
      expect(result.current.isFlashing).toBe(false);
    });
  });

  describe('trigger', () => {
    it('sets isFlashing to true immediately', () => {
      const { result } = renderHook(() => useFlash());
      act(() => {
        result.current.trigger();
      });
      expect(result.current.isFlashing).toBe(true);
    });

    it('stops flashing after FLASH_DURATION_MS', () => {
      const { result } = renderHook(() => useFlash());
      act(() => {
        result.current.trigger();
      });
      act(() => {
        vi.advanceTimersByTime(FLASH_DURATION_MS);
      });
      expect(result.current.isFlashing).toBe(false);
    });

    it('remains active just before FLASH_DURATION_MS elapses', () => {
      const { result } = renderHook(() => useFlash());
      act(() => {
        result.current.trigger();
      });
      act(() => {
        vi.advanceTimersByTime(FLASH_DURATION_MS - 1);
      });
      expect(result.current.isFlashing).toBe(true);
    });

    it('resets the timer when triggered again while active', () => {
      const { result } = renderHook(() => useFlash());
      act(() => {
        result.current.trigger();
      });
      act(() => {
        vi.advanceTimersByTime(FLASH_DURATION_MS - 100);
      });
      act(() => {
        result.current.trigger();
      }); // re-trigger near end
      act(() => {
        vi.advanceTimersByTime(FLASH_DURATION_MS - 1);
      }); // not yet expired
      expect(result.current.isFlashing).toBe(true);
    });
  });
});
