import { act, renderHook } from '@testing-library/react';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { STORAGE_KEY_ACCENT } from '@/lib/constants';
import { useAccent } from '@/hooks/useAccent';

import { AccentContext, AccentProvider } from './AccentContext';

function wrapper({ children }: { children: ReactNode }) {
  return <AccentProvider>{children}</AccentProvider>;
}

describe('AccentContext', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.accent;
  });

  afterEach(() => {
    delete document.documentElement.dataset.accent;
  });

  it('defaults to "indigo" when no stored value', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    expect(result.current?.accent).toBe('indigo');
  });

  it('applies data-accent to documentElement on mount', () => {
    renderHook(() => useContext(AccentContext), { wrapper });
    expect(document.documentElement.dataset.accent).toBe('indigo');
  });

  it('applies data-accent matching a hydrated stored value', () => {
    localStorage.setItem(STORAGE_KEY_ACCENT, JSON.stringify('teal'));
    renderHook(() => useContext(AccentContext), { wrapper });
    expect(document.documentElement.dataset.accent).toBe('teal');
  });

  it('hydrates accent state from localStorage', () => {
    localStorage.setItem(STORAGE_KEY_ACCENT, JSON.stringify('rose'));
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    expect(result.current?.accent).toBe('rose');
  });

  it('updates state when setAccent is called', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    act(() => result.current?.setAccent('amber'));
    expect(result.current?.accent).toBe('amber');
  });

  it('persists to localStorage when setAccent is called', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    act(() => result.current?.setAccent('green'));
    expect(localStorage.getItem(STORAGE_KEY_ACCENT)).toBe('"green"');
  });

  it('updates data-accent when setAccent is called', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    act(() => result.current?.setAccent('rose'));
    expect(document.documentElement.dataset.accent).toBe('rose');
  });

  it('falls back to "indigo" when stored value is an unknown accent', () => {
    localStorage.setItem(STORAGE_KEY_ACCENT, JSON.stringify('blue'));
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    expect(result.current?.accent).toBe('indigo');
  });

  it('falls back to "indigo" when stored value is wrong type', () => {
    localStorage.setItem(STORAGE_KEY_ACCENT, JSON.stringify(42));
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    expect(result.current?.accent).toBe('indigo');
  });

  it('applies a valid cross-tab storage event', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_ACCENT, newValue: JSON.stringify('teal') }));
    });
    expect(result.current?.accent).toBe('teal');
  });

  it('ignores a cross-tab storage event with an unknown accent', () => {
    const { result } = renderHook(() => useContext(AccentContext), { wrapper });
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORAGE_KEY_ACCENT, newValue: JSON.stringify('purple') }),
      );
    });
    expect(result.current?.accent).toBe('indigo');
  });

  describe('useAccent', () => {
    it('throws when used outside AccentProvider', () => {
      expect(() => renderHook(() => useAccent())).toThrow('useAccent must be used within an AccentProvider');
    });
  });
});
