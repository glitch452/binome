'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import type { ThemePreference } from '@/types/timer';

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const ARIA_LABEL: Record<ThemePreference, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
};

const ICONS: Record<ThemePreference, React.ReactElement> = {
  light: <Sun data-testid="icon-sun" aria-hidden="true" />,
  dark: <Moon data-testid="icon-moon" aria-hidden="true" />,
  system: <Monitor data-testid="icon-monitor" aria-hidden="true" />,
};

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setTheme(NEXT_THEME[preference])}
      aria-label={ARIA_LABEL[preference]}
    >
      {ICONS[preference]}
    </Button>
  );
}
