import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';
import { GATE_UPDATE_APPLY_TIMEOUT_MS, GATE_VERSION_CHECK_TIMEOUT_MS } from '@/lib/constants';

import { useLaunchUpdate } from './useLaunchUpdate';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { useSerwistMock } = vi.hoisted(() => ({ useSerwistMock: vi.fn() }));

vi.mock('@serwist/next/react', () => ({
  useSerwist: useSerwistMock,
}));

const { useApplyUpdateMock } = vi.hoisted(() => ({ useApplyUpdateMock: vi.fn() }));

vi.mock('./useApplyUpdate', () => ({
  useApplyUpdate: useApplyUpdateMock,
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
  fireWaiting: (event?: { wasWaitingBeforeRegister?: boolean }) => Promise<void>;
}

function createSerwist(): MockSerwist {
  let waitingHandler: ((event: { wasWaitingBeforeRegister?: boolean }) => void) | undefined;
  return {
    addEventListener: vi.fn((type: string, handler: (event: { wasWaitingBeforeRegister?: boolean }) => void) => {
      if (type === 'waiting') {
        waitingHandler = handler;
      }
    }),
    removeEventListener: vi.fn(),
    fireWaiting: async (event = {}) => {
      await act(async () => {
        waitingHandler?.(event);
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

function mockOk(body: unknown) {
  return { ok: true, json: vi.fn().mockResolvedValue(body) };
}

async function flushMicrotasks() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advanceTime(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLaunchUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useApplyUpdateMock.mockReturnValue(vi.fn());
    getRunningBuildInfoMock.mockReturnValue(VALID_V1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('no service worker', () => {
    it('ready becomes true after hydration when no SW is registered', async () => {
      useSerwistMock.mockReturnValue({ serwist: null });

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();
      expect(result.current.ready).toBe(true);
    });
  });

  describe('worker already waiting at launch', () => {
    it('calls applyUpdate when wasWaitingBeforeRegister is true', async () => {
      const applyUpdate = vi.fn();
      useApplyUpdateMock.mockReturnValue(applyUpdate);
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));

      renderHook(() => useLaunchUpdate());
      await serwist.fireWaiting({ wasWaitingBeforeRegister: true });

      expect(applyUpdate).toHaveBeenCalled();
    });

    it('stays not-ready while applying (skeleton held through reload)', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));

      const { result } = renderHook(() => useLaunchUpdate());
      await serwist.fireWaiting({ wasWaitingBeforeRegister: true });

      expect(result.current.ready).toBe(false);
    });

    it('ignores a waiting event without wasWaitingBeforeRegister (mid-session install)', async () => {
      const applyUpdate = vi.fn();
      useApplyUpdateMock.mockReturnValue(applyUpdate);
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));

      const { result } = renderHook(() => useLaunchUpdate());
      await serwist.fireWaiting(); // no wasWaitingBeforeRegister

      // Should resolve ready from the fetch (server === running), not from this event
      await flushMicrotasks();
      expect({ applied: applyUpdate.mock.calls.length, ready: result.current.ready }).toStrictEqual({
        applied: 0,
        ready: true,
      });
    });
  });

  describe('server version check', () => {
    it('ready is true when server version matches the running version', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V1)));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      expect(result.current.ready).toBe(true);
    });

    it('calls applyUpdate and stays not-ready when server is ahead of running', async () => {
      const applyUpdate = vi.fn();
      useApplyUpdateMock.mockReturnValue(applyUpdate);
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      expect({ applied: applyUpdate.mock.calls.length > 0, ready: result.current.ready }).toStrictEqual({
        applied: true,
        ready: false,
      });
    });

    it('ready is true and applyUpdate not called when fetch fails (offline launch reveals cached app)', async () => {
      const applyUpdate = vi.fn();
      useApplyUpdateMock.mockReturnValue(applyUpdate);
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      expect({ applied: applyUpdate.mock.calls.length, ready: result.current.ready }).toStrictEqual({
        applied: 0,
        ready: true,
      });
    });

    it('ready is true when fetch returns a non-ok response', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: vi.fn() }));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      expect(result.current.ready).toBe(true);
    });

    it('ready is true when running version is unknown (treats as up-to-date)', async () => {
      getRunningBuildInfoMock.mockReturnValue(null);
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      expect(result.current.ready).toBe(true);
    });
  });

  describe('version-check timeout cap', () => {
    it('reveals after GATE_VERSION_CHECK_TIMEOUT_MS when no fetch decision arrives', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      // Fetch never resolves
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

      const { result } = renderHook(() => useLaunchUpdate());
      await advanceTime(GATE_VERSION_CHECK_TIMEOUT_MS);
      expect(result.current.ready).toBe(true);
    });

    it('does not reveal just before the version-check cap', async () => {
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

      const { result } = renderHook(() => useLaunchUpdate());

      await advanceTime(GATE_VERSION_CHECK_TIMEOUT_MS - 1);

      expect(result.current.ready).toBe(false);
    });
  });

  describe('apply timeout cap', () => {
    it('reveals after GATE_UPDATE_APPLY_TIMEOUT_MS when applying but page never reloads', async () => {
      useApplyUpdateMock.mockReturnValue(vi.fn()); // does not reload
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks(); // fetch resolves → startApplying
      await advanceTime(GATE_UPDATE_APPLY_TIMEOUT_MS);
      expect(result.current.ready).toBe(true);
    });

    it('does not reveal just before the apply cap', async () => {
      useApplyUpdateMock.mockReturnValue(vi.fn());
      const serwist = createSerwist();
      useSerwistMock.mockReturnValue({ serwist });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockOk(VALID_V2)));

      const { result } = renderHook(() => useLaunchUpdate());
      await flushMicrotasks();

      await advanceTime(GATE_UPDATE_APPLY_TIMEOUT_MS - 1);

      expect(result.current.ready).toBe(false);
    });
  });
});
