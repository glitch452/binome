import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UPDATE_POLL_INTERVAL_MS } from '@/lib/constants';

import { useUpdateCheck } from './useUpdateCheck';

const { useSerwistMock } = vi.hoisted(() => ({ useSerwistMock: vi.fn() }));

vi.mock('@serwist/next/react', () => ({
  useSerwist: useSerwistMock,
}));

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

const VALID_V1: Record<string, unknown> = {
  version: '1.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v1.0.0',
  releasesUrl: 'https://github.com/glitch452/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

const VALID_V2: Record<string, unknown> = {
  ...VALID_V1,
  version: '2.0.0',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v2.0.0',
};

const VALID_V2_DEV: Record<string, unknown> = {
  ...VALID_V1,
  version: '2.0.0',
  releaseUrl: null,
};

const VALID_V3: Record<string, unknown> = {
  ...VALID_V1,
  version: '3.0.0',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v3.0.0',
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

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSerwistMock.mockReturnValue({ serwist: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('initial fetch failure', () => {
    it('starts the interval even when the initial fetch fails', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFail()));
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      renderHook(() => useUpdateCheck());
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), UPDATE_POLL_INTERVAL_MS);
    });

    it('establishes baseline silently on first poll after failed initial fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockFail()) // initial fetch fails
          .mockResolvedValueOnce(mockOk(VALID_V1)), // poll 1: baseline
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });

    it('flags update on second poll after baseline established from failed initial fetch', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockFail()) // initial fetch fails
          .mockResolvedValueOnce(mockOk(VALID_V1)) // poll 1: baseline
          .mockResolvedValueOnce(mockOk(VALID_V2)), // poll 2: newer tagged release
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll(2);
      expect(result.current.update?.version).toBe('2.0.0');
    });
  });

  describe('initial fetch succeeds', () => {
    it('keeps update null when poll returns the same version', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
          .mockResolvedValueOnce(mockOk(VALID_V1)), // poll: same version
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });

    it('exposes the polled BuildInfo when a newer tagged version is detected', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
          .mockResolvedValueOnce(mockOk(VALID_V2)), // poll: newer tagged release
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toStrictEqual(VALID_V2);
    });

    it('keeps update null when the polled version differs but releaseUrl is null (dev build)', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
          .mockResolvedValueOnce(mockOk(VALID_V2_DEV)), // poll: different version, no releaseUrl
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
      expect(result.current.update).toBeNull();
    });
  });

  describe('dismissUpdate', () => {
    it('hides the detected update', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
          .mockResolvedValueOnce(mockOk(VALID_V2)), // poll: update detected
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
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
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
          .mockResolvedValueOnce(mockOk(VALID_V2)) // poll 1: update detected
          .mockResolvedValueOnce(mockOk(VALID_V3)), // poll 2: even newer version
      );
      const { result } = renderHook(() => useUpdateCheck());
      await advancePoll();
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
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
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
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch
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

  describe('service worker waiting event', () => {
    it('exposes the fetched BuildInfo when a waiting service worker is detected', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch: baseline
          .mockResolvedValueOnce(mockOk(VALID_V2)), // waiting event: new deploy's build info
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toStrictEqual(VALID_V2);
    });

    it('exposes the update even when the fetched version matches the baseline', async () => {
      // The stale-precache launch case: the running shell is old, but build-info.json is
      // NetworkFirst, so both fetches return the *new* version — comparison can't detect
      // the update, only the waiting service worker can.
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toStrictEqual(VALID_V1);
    });

    it('exposes the update even when releaseUrl is null', async () => {
      // A waiting worker is definitive — the dev-build releaseUrl guard only applies to
      // the version-compare fallback.
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch: baseline
          .mockResolvedValueOnce(mockOk(VALID_V2_DEV)), // waiting event: untagged build
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update?.version).toBe('2.0.0');
    });

    it('keeps update null when the waiting-time fetch fails', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch: baseline
          .mockResolvedValueOnce(mockFail()), // waiting event: fetch fails
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      expect(result.current.update).toBeNull();
    });

    it('retries on the next poll when the waiting-time fetch fails', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(mockOk(VALID_V1)) // initial fetch: baseline
          .mockResolvedValueOnce(mockFail()) // waiting event: fetch fails
          .mockResolvedValueOnce(mockOk(VALID_V1)), // poll: same version, still an update
      );
      const { result } = renderHook(() => useUpdateCheck());
      await serwist.fireWaiting();
      await advancePoll();
      expect(result.current.update).toStrictEqual(VALID_V1);
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
});
