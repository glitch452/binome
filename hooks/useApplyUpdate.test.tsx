import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useApplyUpdate } from './useApplyUpdate';

const { useSerwistMock } = vi.hoisted(() => ({ useSerwistMock: vi.fn() }));

vi.mock('@serwist/next/react', () => ({
  useSerwist: useSerwistMock,
}));

interface MockSerwist {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  messageSkipWaiting: ReturnType<typeof vi.fn>;
}

function createSerwist(): MockSerwist {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    messageSkipWaiting: vi.fn(),
  };
}

describe('useApplyUpdate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('with a registered service worker', () => {
    it('registers a controlling listener', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      const { result } = renderHook(() => useApplyUpdate());

      result.current();

      expect(serwist.addEventListener).toHaveBeenCalledWith('controlling', expect.any(Function));
    });

    it('messages the waiting worker to skip waiting', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      const { result } = renderHook(() => useApplyUpdate());

      result.current();

      expect(serwist.messageSkipWaiting).toHaveBeenCalled();
    });

    it('does not reload until the worker takes control', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      useSerwistMock.mockReturnValue({ serwist: createSerwist() });
      const { result } = renderHook(() => useApplyUpdate());

      result.current();

      expect(reloadMock).not.toHaveBeenCalled();
    });

    it('reloads when the controlling event fires', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      const serwist = createSerwist();
      let controllingHandler: (() => void) | undefined;
      serwist.addEventListener.mockImplementation((type: string, handler: () => void) => {
        if (type === 'controlling') {
          controllingHandler = handler;
        }
      });
      useSerwistMock.mockReturnValue({ serwist });
      const { result } = renderHook(() => useApplyUpdate());

      result.current();
      controllingHandler?.();

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('without a service worker', () => {
    it('reloads directly', () => {
      const reloadMock = vi.fn();
      vi.stubGlobal('location', { reload: reloadMock });
      useSerwistMock.mockReturnValue({ serwist: null });
      const { result } = renderHook(() => useApplyUpdate());

      result.current();

      expect(reloadMock).toHaveBeenCalled();
    });
  });
});
