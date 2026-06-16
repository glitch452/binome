import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHydrated } from './useHydrated';

describe('useHydrated', () => {
  it('returns false on the initial render before effects run', () => {
    const renders: boolean[] = [];
    renderHook(() => {
      const hydrated = useHydrated();
      renders.push(hydrated);
      return hydrated;
    });
    expect(renders[0]).toBe(false);
  });

  it('returns true after the first post-mount effect', () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });
});
