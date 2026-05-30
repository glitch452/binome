import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_THEME } from '@/lib/constants';
import { ThemeProvider } from '@/contexts/ThemeContext';

import { useTheme } from './useTheme';

function makeMql(matches: boolean) {
  return { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(false)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  describe('dark class side-effect', () => {
    it('adds dark class to <html> when resolvedTheme is dark', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('dark'));
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from <html> when resolvedTheme is light', () => {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('removes dark class when resolvedTheme is system and system prefers light', () => {
      document.documentElement.classList.add('dark');
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('returned values', () => {
    it('exposes preference from context', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.preference).toBe('light');
    });

    it('exposes resolvedTheme from context', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('dark'));
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('throws when used outside ThemeProvider', () => {
      expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within a ThemeProvider');
    });
  });
});
