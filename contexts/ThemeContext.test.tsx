import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_THEME } from '@/lib/constants';

import { ThemeContext, ThemeProvider } from './ThemeContext';

function makeMql(matches: boolean) {
  return { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(false)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('default preference', () => {
    it('defaults to system when no stored value', () => {
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.preference).toBe('system');
    });

    it('resolves system to light when prefers-color-scheme is light', () => {
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.resolvedTheme).toBe('light');
    });

    it('resolves system to dark when prefers-color-scheme is dark', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(true)));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.resolvedTheme).toBe('dark');
    });
  });

  describe('malformed stored value', () => {
    it('falls back to "system" when stored value is an unknown string', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('auto'));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.preference).toBe('system');
    });

    it('falls back to "system" when stored value is wrong type', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(1));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.preference).toBe('system');
    });
  });

  describe('explicit preference (FR-18)', () => {
    it('uses stored dark preference over system default', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('dark'));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.preference).toBe('dark');
    });

    it('resolves explicit dark to dark regardless of system setting', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('dark'));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.resolvedTheme).toBe('dark');
    });

    it('resolves explicit light to light regardless of system setting', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(true)));
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      expect(result.current?.resolvedTheme).toBe('light');
    });

    it('updates preference when setTheme is called', () => {
      const { result } = renderHook(() => useContext(ThemeContext), { wrapper });
      act(() => result.current?.setTheme('dark'));
      expect(result.current?.preference).toBe('dark');
    });
  });
});
