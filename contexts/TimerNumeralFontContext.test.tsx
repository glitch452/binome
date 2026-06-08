import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY_TIMER_NUMERAL_FONT } from '@/lib/constants';
import { useTimerNumeralFont } from '@/hooks/useTimerNumeralFont';

import { TimerNumeralFontContext, TimerNumeralFontProvider } from './TimerNumeralFontContext';

function wrapper({ children }: { children: ReactNode }) {
  return <TimerNumeralFontProvider>{children}</TimerNumeralFontProvider>;
}

describe('TimerNumeralFontContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to "mono" when no stored value', () => {
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    expect(result.current?.numeralFont).toBe('mono');
  });

  it('hydrates numeralFont from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_TIMER_NUMERAL_FONT, JSON.stringify('sans'));
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    expect(result.current?.numeralFont).toBe('sans');
  });

  it('updates state when setNumeralFont is called', () => {
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    act(() => result.current?.setNumeralFont('sans'));
    expect(result.current?.numeralFont).toBe('sans');
  });

  it('persists to localStorage when setNumeralFont is called', () => {
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    act(() => result.current?.setNumeralFont('sans'));
    expect(localStorage.getItem(STORAGE_KEY_TIMER_NUMERAL_FONT)).toBe('"sans"');
  });

  it('falls back to "mono" when stored value is malformed', () => {
    localStorage.setItem(STORAGE_KEY_TIMER_NUMERAL_FONT, JSON.stringify('serif'));
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    expect(result.current?.numeralFont).toBe('mono');
  });

  it('falls back to "mono" when stored value is wrong type', () => {
    localStorage.setItem(STORAGE_KEY_TIMER_NUMERAL_FONT, JSON.stringify(true));
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    expect(result.current?.numeralFont).toBe('mono');
  });

  it('applies a valid cross-tab storage event', () => {
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY_TIMER_NUMERAL_FONT, newValue: JSON.stringify('sans') }),
      );
    });
    expect(result.current?.numeralFont).toBe('sans');
  });

  it('ignores a cross-tab storage event with an invalid value', () => {
    const { result } = renderHook(() => useContext(TimerNumeralFontContext), { wrapper });
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY_TIMER_NUMERAL_FONT, newValue: JSON.stringify('serif') }),
      );
    });
    expect(result.current?.numeralFont).toBe('mono');
  });

  describe('useTimerNumeralFont', () => {
    it('throws when used outside TimerNumeralFontProvider', () => {
      expect(() => renderHook(() => useTimerNumeralFont())).toThrow(
        'useTimerNumeralFont must be used within a TimerNumeralFontProvider',
      );
    });
  });
});
