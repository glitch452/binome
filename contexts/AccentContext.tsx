'use client';

import { type ReactNode, createContext, useCallback, useEffect, useMemo } from 'react';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ACCENTS, DEFAULT_ACCENT, STORAGE_KEY_ACCENT } from '@/lib/constants';
import { accentColorSchema } from '@/lib/preferencesSchema';
import type { AccentColor } from '@/types/timer';

export interface AccentContextValue {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

export const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setStoredAccent] = useLocalStorage<AccentColor>(STORAGE_KEY_ACCENT, DEFAULT_ACCENT, {
    sync: true,
    parse: (raw) => accentColorSchema.parse(raw),
  });

  useEffect(() => {
    document.documentElement.dataset.accent = accent;

    // Set the theme-color to support overscroll on some versions of Safari
    const hex = ACCENTS[accent].hex;
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (metaTag) {
      metaTag.setAttribute('content', hex);
    }
  }, [accent]);

  const setAccent = useCallback(
    (newAccent: AccentColor) => {
      setStoredAccent(newAccent);
    },
    [setStoredAccent],
  );

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}
