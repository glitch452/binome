import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMediaQuery } from './useMediaQuery';

type ChangeHandler = (event: { matches: boolean }) => void;

function makeMql(initialMatches: boolean) {
  let changeHandler: ChangeHandler | null = null;
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_type: string, handler: ChangeHandler) => {
      changeHandler = handler;
    }),
    removeEventListener: vi.fn(),
  };
  const fire = (matches: boolean) => changeHandler?.({ matches });
  return { mql, fire };
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when the query initially matches', () => {
    const { mql } = makeMql(true);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    expect(result.current).toBe(true);
  });

  it('returns false when the query does not initially match', () => {
    const { mql } = makeMql(false);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    expect(result.current).toBe(false);
  });

  it('updates to true when the media query fires a change event', () => {
    const { mql, fire } = makeMql(false);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    act(() => fire(true));
    expect(result.current).toBe(true);
  });

  it('removes the event listener when the hook unmounts', () => {
    const { mql } = makeMql(false);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 375px)'));
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
