import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';
import { UPDATE_POLL_INTERVAL_MS } from '@/lib/constants';

import { useUpdateCheck } from './useUpdateCheck';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { useSerwistMock } = vi.hoisted(() => ({ useSerwistMock: vi.fn() }));

vi.mock('@serwist/next/react', () => ({
  useSerwist: useSerwistMock,
}));

const { getRunningBuildInfoMock } = vi.hoisted(() => ({
  getRunningBuildInfoMock: vi.fn<() => BuildInfo | null>(),
}));

vi.mock('@/lib/build-info', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/build-info')>();
  return { ...actual, getRunningBuildInfo: getRunningBuildInfoMock };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface MockSerwist {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  fireWaiting: () => Promise<void>;
}

function createSerwist(): MockSerwist {
  let waitingHandler: (() => void) | undefined;
  return {
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (type === 'waiting') {
        waitingHandler = handler;
      }
    }),
    removeEventListener: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
    fireWaiting: async () => {
      await act(async () => {
        waitingHandler?.();
        await vi.advanceTimersByTimeAsync(0);
      });
    },
  };
}

const VALID_V1: BuildInfo = {
  version: '1.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch432/binome/releases/tag/v1.0.0',
  releasesUrl: 'https://github.com/glitch432/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

const VALID_V2: BuildInfo = {
  ...VALID_V1,
  version: '2.0.0',
  releaseUrl: 'https://github.com/glitch432/binome/releases/tag/v2.0.0',
};

const VALID_V3: BuildInfo = {
  ...VALID_V1,
  version: '3.0.0',
  releaseUrl: 'https://github.com/glitch432/binome/releases/tag/v3.0.0',
};

function mockOk(body: unknown) {
  return { ok: true, json: vi.fn().mockResolvedValue(body) };
}

function mockFail() {
  return { ok: false, json: vi.fn() };
}

async function advancePoll(count = 1) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(UPDATE_POLL_INTERVAL_MS * count);
  });
}

// Flush the mount-time fetch (useEffect fires on first render, fetch resolves microtask).
async function flushMount() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSerwistMock.mockReturnValue({ serwist: null });
    // Default: running version is 1.0.0
    getRunningBuildInfoMock.mockReturnValue(VALID_V1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('version-compare detection (server vs running)', () => {
    it('exposes the server BuildInfo when the server version differs from the running version', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toStrictEqual(VALID_V2);
    });

    it('keeps update null when server version matches the running version', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toBeNull();
    });

    it('keeps update null when the running version is unknown (env var absent)', async () => {
      getRunningBuildInfoMock.mockReturnValue(null);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toBeNull();
    });

    it('keeps update null on a newer poll when server version still matches running', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });

    it('exposes the update on a subsequent poll when server is now ahead', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // mount fetch: server === running → no update
          .mockResolvedValueOnce(mockOk(VALID_V2)), // poll 1: server ahead → update
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update?.version).toBe('2.0.0');
    });
  });

  describe('service worker waiting event', () => {
    it('exposes the fetched BuildInfo when a waiting service worker is detected', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // mount fetch: server === running
          .mockResolvedValueOnce(mockOk(VALID_V2)), // waiting event fetch: new deploy
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toStrictEqual(VALID_V2);
    });

    it('does not flag an update when a waiting worker reports the running version', async () => {
      // A waiting worker for the SAME version (a same-version local rebuild, a duplicate
      // registration, or a worker parked for the version the gate already revealed) is not a
      // real update. The inlined running constant is reliable, so we compare against it and
      // suppress the banner for the version already running.
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toBeNull();
    });

    it('keeps update null when the waiting-time fetch fails', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // mount fetch: server === running
          .mockResolvedValueOnce(mockFail()), // waiting event: fetch fails
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toBeNull();
    });

    it('does not call serwist.update() before the first poll tick', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      renderHook(() => useUpdateCheck());
      expect(serwist.update).not.toHaveBeenCalled();
    });

    it('calls serwist.update() on each poll tick to check for a new service worker', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      renderHook(() => useUpdateCheck());
      await advancePoll(2);
      expect(serwist.update).toHaveBeenCalledTimes(2);
    });

    it('registers the waiting listener', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      renderHook(() => useUpdateCheck());
      expect(serwist.addEventListener).toHaveBeenCalledWith('waiting', expect.any(Function));
    });

    it('removes the waiting listener on unmount', () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { unmount } = renderHook(() => useUpdateCheck());
      unmount();
      expect(serwist.removeEventListener).toHaveBeenCalledWith('waiting', expect.any(Function));
    });
  });

  describe('mount registration.waiting inspection (missed-waiting-event race)', () => {
    const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

    function stubServiceWorker(registration: { waiting: unknown } | undefined) {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistration: vi.fn().mockResolvedValue(registration) },
        configurable: true,
      });
    }

    afterEach(() => {
      if (originalServiceWorkerDescriptor === undefined) {
        // jsdom has no navigator.serviceWorker by default — remove the stub we added.
        delete (navigator as { serviceWorker?: unknown }).serviceWorker;
      } else {
        Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor);
      }
    });

    it('exposes the fetched BuildInfo when a worker is already waiting at mount', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      stubServiceWorker({ waiting: {} });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toStrictEqual(VALID_V2);
    });

    it('does not flag from the mount inspection when no worker is waiting', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      stubServiceWorker({ waiting: null });
      // Server is ahead, so only the mount fetch could flag — prove the waiting path stays quiet
      // by checking nothing surfaces beyond what the (matching) mount fetch would show.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toBeNull();
    });

    it('does not flag from the mount inspection when getRegistration resolves undefined', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      stubServiceWorker(undefined);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toBeNull();
    });

    it('stays gated by flagIfNewer: a waiting worker on the running version is no banner', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      stubServiceWorker({ waiting: {} });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      expect(result.current.update).toBeNull();
    });
  });

  describe('dismissUpdate', () => {
    it('hides the detected update', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      act(() => {
        result.current.dismissUpdate();
      });
      expect(result.current.update).toBeNull();
    });

    it('re-exposes update when a subsequent poll returns a still-newer version', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V2)) // mount fetch: server ahead
          .mockResolvedValueOnce(mockOk(VALID_V3)), // poll 1: even newer
      );
      const { result } = renderHook(() => useUpdateCheck());
      await flushMount();
      act(() => {
        result.current.dismissUpdate();
      });
      await advancePoll();
      expect(result.current.update?.version).toBe('3.0.0');
    });
  });

  describe('failed poll', () => {
    it('silently ignores a network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // mount fetch: server === running
          .mockRejectedValueOnce(new Error('network')), // poll: network error
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });

    it('silently ignores a non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // mount fetch: server === running
          .mockResolvedValueOnce(mockFail()), // poll: non-ok
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });
  });

  describe('interval lifecycle', () => {
    it('uses UPDATE_POLL_INTERVAL_MS as the interval duration', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      renderHook(() => useUpdateCheck());
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), UPDATE_POLL_INTERVAL_MS);
    });

    it('calls clearInterval on unmount', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const { unmount } = renderHook(() => useUpdateCheck());
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('result shape', () => {
    it('does not include an updateAtLaunch field', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      expect(result.current).not.toHaveProperty('updateAtLaunch');
    });
  });
});
