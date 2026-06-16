import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getRunningBuildInfo } from '@/lib/build-info';

import { useBuildInfo } from './useBuildInfo';

vi.mock('@/lib/build-info', () => ({
  getRunningBuildInfo: vi.fn(),
}));

const VALID_BUILD_INFO = {
  version: '1.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v1.0.0',
  releasesUrl: 'https://github.com/glitch452/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

describe('useBuildInfo', () => {
  it('returns the parsed running constant', () => {
    vi.mocked(getRunningBuildInfo).mockReturnValue(VALID_BUILD_INFO);
    const { result } = renderHook(() => useBuildInfo());
    expect(result.current).toStrictEqual(VALID_BUILD_INFO);
  });

  it('returns null when the env var is absent', () => {
    vi.mocked(getRunningBuildInfo).mockReturnValue(null);
    const { result } = renderHook(() => useBuildInfo());
    expect(result.current).toBeNull();
  });

  it('performs no fetch', () => {
    vi.mocked(getRunningBuildInfo).mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderHook(() => useBuildInfo());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
