import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from 'sonner';

import { useBuildInfo } from './useBuildInfo';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const VALID_BUILD_INFO = {
  version: '1.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v1.0.0',
  buildTime: '2024-06-01T10:00:00.000Z',
};

function mockFetch(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  });
}

describe('useBuildInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('success', () => {
    it('returns the parsed BuildInfo version', async () => {
      vi.stubGlobal('fetch', mockFetch(true, VALID_BUILD_INFO));
      const { result } = renderHook(() => useBuildInfo());
      await waitFor(() => expect(result.current?.version).toBe(VALID_BUILD_INFO.version));
    });

    it('returns build info and fires no toast (both checked simultaneously)', async () => {
      vi.stubGlobal('fetch', mockFetch(true, VALID_BUILD_INFO));
      const { result } = renderHook(() => useBuildInfo());
      // Pack two conditions into one assertion so max-expects is not exceeded
      await waitFor(() =>
        expect({ hasData: result.current !== null, toasted: vi.mocked(toast.error).mock.calls.length }).toStrictEqual({
          hasData: true,
          toasted: 0,
        }),
      );
    });
  });

  describe('non-ok response (e.g. 404)', () => {
    it('shows the failed-to-load toast', async () => {
      vi.stubGlobal('fetch', mockFetch(false, null));
      renderHook(() => useBuildInfo());
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load build info'));
    });
  });

  describe('network / fetch rejection', () => {
    it('shows the failed-to-load toast on a rejected fetch', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
      renderHook(() => useBuildInfo());
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load build info'));
    });
  });

  describe('malformed body (safeParse failure)', () => {
    it('shows the invalid toast when the body fails schema validation', async () => {
      vi.stubGlobal('fetch', mockFetch(true, { version: '', commit: 'abc' }));
      renderHook(() => useBuildInfo());
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Build info is invalid'));
    });
  });
});
