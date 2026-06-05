'use client';

import { type ReactNode, createContext, useCallback, useMemo } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { STORAGE_KEY_THEME } from '@/lib/constants';
import type { ThemePreference } from '@/types/timer';

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(STORAGE_KEY_THEME, 'system', { sync: true });
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedTheme: 'light' | 'dark' = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      setPreference(theme);
    },
    [setPreference],
  );

  const value = useMemo(() => ({ preference, resolvedTheme, setTheme }), [preference, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
