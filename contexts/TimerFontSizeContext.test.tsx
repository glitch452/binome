import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY_TIMER_FONT_SIZE } from '@/lib/constants';

import { TimerFontSizeContext, TimerFontSizeProvider } from './TimerFontSizeContext';

function wrapper({ children }: { children: ReactNode }) {
  return <TimerFontSizeProvider>{children}</TimerFontSizeProvider>;
}

describe('TimerFontSizeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('default value', () => {
    it('defaults to "md" when no stored value', () => {
      const { result } = renderHook(() => useContext(TimerFontSizeContext), { wrapper });
      expect(result.current?.fontSize).toBe('md');
    });
  });

  describe('stored value', () => {
    it('reads a stored font size from localStorage', () => {
      localStorage.setItem(STORAGE_KEY_TIMER_FONT_SIZE, JSON.stringify('lg'));
      const { result } = renderHook(() => useContext(TimerFontSizeContext), { wrapper });
      expect(result.current?.fontSize).toBe('lg');
    });
  });

  describe('setFontSize', () => {
    it('updates fontSize when setFontSize is called', () => {
      const { result } = renderHook(() => useContext(TimerFontSizeContext), { wrapper });
      act(() => result.current?.setFontSize('xl'));
      expect(result.current?.fontSize).toBe('xl');
    });
  });
});
