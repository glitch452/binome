'use client';

import { type ComponentProps, useContext } from 'react';
import { Toaster as Sonner } from 'sonner';

import { ThemeContext } from '@/contexts/ThemeContext';

type ToasterProps = ComponentProps<typeof Sonner>;

/**
 * Theme-aware Toaster wrapper. Reads `resolvedTheme` from ThemeContext so the
 * toast colour scheme tracks the app theme rather than the OS preference.
 * Falls back to `'system'` when used outside a ThemeProvider.
 * @param props
 */
export function Toaster(props: ToasterProps) {
  const ctx = useContext(ThemeContext);
  return <Sonner theme={ctx?.resolvedTheme ?? 'system'} {...props} />;
}
