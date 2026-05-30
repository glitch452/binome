import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('reading defaults', () => {
    it('returns defaultValue when key is absent', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('returns defaultValue for an object when key is absent', () => {
      const { result } = renderHook(() => useLocalStorage('k', { active: false }));
      expect(result.current[0]).toStrictEqual({ active: false });
    });
  });

  describe('writing and persisting', () => {
    it('updates state when setValue is called', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'old'));
      act(() => result.current[1]('new'));
      expect(result.current[0]).toBe('new');
    });

    it('persists the new value to localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'old'));
      act(() => result.current[1]('new'));
      expect(localStorage.getItem('k')).toBe('"new"');
    });

    it('accepts a function updater', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'hello'));
      act(() => result.current[1]((prev) => `${prev}!`));
      expect(result.current[0]).toBe('hello!');
    });
  });

  describe('parsing an existing value', () => {
    it('reads and deserialises a stored string', () => {
      localStorage.setItem('k', JSON.stringify('stored'));
      const { result } = renderHook(() => useLocalStorage('k', 'default'));
      expect(result.current[0]).toBe('stored');
    });

    it('reads and deserialises a stored object', () => {
      localStorage.setItem('k', JSON.stringify({ active: true }));
      const { result } = renderHook(() => useLocalStorage('k', { active: false }));
      expect(result.current[0]).toStrictEqual({ active: true });
    });

    it('returns defaultValue when the stored value is invalid JSON', () => {
      localStorage.setItem('k', 'not-json{');
      const { result } = renderHook(() => useLocalStorage('k', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });
  });

  describe('cross-tab sync', () => {
    it('updates state when a storage event fires for the same key', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'initial', { sync: true }));
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: 'k', newValue: JSON.stringify('synced') }));
      });
      expect(result.current[0]).toBe('synced');
    });

    it('ignores storage events for different keys', () => {
      const { result } = renderHook(() => useLocalStorage('k', 'initial', { sync: true }));
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: JSON.stringify('nope') }));
      });
      expect(result.current[0]).toBe('initial');
    });
  });
});
