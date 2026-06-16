import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheBustingReload } from '@/lib/cacheBustingReload';
import { UPDATE_APPLY_TIMEOUT_MS } from '@/lib/constants';

import { useApplyUpdate } from './useApplyUpdate';

const { useSerwistMock } = vi.hoisted(() => ({ useSerwistMock: vi.fn() }));

vi.mock('@serwist/next/react', () => ({
  useSerwist: useSerwistMock,
}));

vi.mock('@/lib/cacheBustingReload', () => ({ cacheBustingReload: vi.fn() }));

interface MockSerwist {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  messageSkipWaiting: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  fire: (type: string) => void;
}

function createSerwist(): MockSerwist {
  const handlers = new Map<string, Set<() => void>>();
  return {
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: () => void) => {
      handlers.get(type)?.delete(handler);
    }),
    messageSkipWaiting: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    fire: (type: string) => {
      handlers.get(type)?.forEach((h) => h());
    },
  };
}

describe('useApplyUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('no service worker (dev / unsupported)', () => {
    it('cache-busting reloads when serwist is null', () => {
      useSerwistMock.mockReturnValue({ serwist: null });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();

      expect(cacheBustingReload).toHaveBeenCalled();
    });
  });

  describe('banner mode (reloadNow)', () => {
    it('nudges skip-waiting and reloads the page', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current({ reloadNow: true });

      expect({
        skipWaiting: serwist.messageSkipWaiting.mock.calls.length,
        reloaded: reloadMock.mock.calls.length,
      }).toStrictEqual({ skipWaiting: 1, reloaded: 1 });
    });

    it('does not register controlling/waiting listeners or a timeout', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current({ reloadNow: true });
      // Advancing time must not produce extra behavior — the banner path is a one-shot reload.
      act(() => {
        vi.advanceTimersByTime(UPDATE_APPLY_TIMEOUT_MS);
      });

      expect({
        addedListeners: serwist.addEventListener.mock.calls.length,
        reloaded: reloadMock.mock.calls.length,
      }).toStrictEqual({ addedListeners: 0, reloaded: 1 });
    });
  });

  describe('launch gate (no options) — activate and reload once', () => {
    it('registers a controlling listener and calls messageSkipWaiting + update', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();

      expect({
        controllingListener: serwist.addEventListener.mock.calls.some((c) => c[0] === 'controlling'),
        skipWaiting: serwist.messageSkipWaiting.mock.calls.length > 0,
        updated: serwist.update.mock.calls.length > 0,
      }).toStrictEqual({ controllingListener: true, skipWaiting: true, updated: true });
    });

    it('reloads when the controlling event fires', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();
      serwist.fire('controlling');

      expect(reloadMock).toHaveBeenCalled();
    });

    it('does not reload before the controlling event fires', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();

      expect(reloadMock).not.toHaveBeenCalled();
    });

    it('re-sends skip-waiting when a worker parks (waiting), then reloads on controlling', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();
      const skipWaitingAfterApply = serwist.messageSkipWaiting.mock.calls.length;
      act(() => {
        serwist.fire('waiting');
      });
      serwist.fire('controlling');

      expect({
        reSentSkipWaiting: serwist.messageSkipWaiting.mock.calls.length > skipWaitingAfterApply,
        reloaded: reloadMock.mock.calls.length,
      }).toStrictEqual({ reSentSkipWaiting: true, reloaded: 1 });
    });

    it('gives up without reloading after UPDATE_APPLY_TIMEOUT_MS, removing the listeners', () => {
      // Active-timer safety: a late activation must not reload after the gate has revealed the app.
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();
      act(() => {
        vi.advanceTimersByTime(UPDATE_APPLY_TIMEOUT_MS);
      });

      expect({
        reloaded: reloadMock.mock.calls.length,
        removedControlling: serwist.removeEventListener.mock.calls.some((c) => c[0] === 'controlling'),
        removedWaiting: serwist.removeEventListener.mock.calls.some((c) => c[0] === 'waiting'),
      }).toStrictEqual({ reloaded: 0, removedControlling: true, removedWaiting: true });
    });

    it('does not reload when controlling fires after the give-up timeout', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });

      const { result } = renderHook(() => useApplyUpdate());
      result.current();
      act(() => {
        vi.advanceTimersByTime(UPDATE_APPLY_TIMEOUT_MS);
      });
      serwist.fire('controlling'); // listener was removed at give-up

      expect(reloadMock).not.toHaveBeenCalled();
    });
  });
});
