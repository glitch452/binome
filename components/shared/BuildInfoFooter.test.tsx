import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';

import { useBuildInfo } from '@/hooks/useBuildInfo';

import { BuildInfoFooter } from './BuildInfoFooter';

vi.mock('@/hooks/useBuildInfo');

const RELEASES_URL = 'https://github.com/glitch432/binome/releases';

const MOCK_BUILD_INFO: BuildInfo = {
  version: '1.2.3',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: `${RELEASES_URL}/tag/v1.2.3`,
  releasesUrl: RELEASES_URL,
  buildTime: '2024-06-01T10:00:00.000Z',
};

describe('BuildInfoFooter', () => {
  describe('when build info is null', () => {
    it('renders nothing', () => {
      vi.mocked(useBuildInfo).mockReturnValue(null);
      render(<BuildInfoFooter />);
      expect(screen.queryByRole('contentinfo')).toBeNull();
    });
  });

  describe('when releaseUrl is present', () => {
    it('links to the specific release', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('link')).toHaveAttribute('href', MOCK_BUILD_INFO.releaseUrl);
    });

    it('opens the link in a new tab', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    });

    it('has the correct aria-label on the footer', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('contentinfo', { name: /app version/i })).toBeInTheDocument();
    });
  });

  describe('when releaseUrl is null (no specific release yet)', () => {
    it('falls back to linking to the all-releases page', () => {
      vi.mocked(useBuildInfo).mockReturnValue({ ...MOCK_BUILD_INFO, releaseUrl: null });
      render(<BuildInfoFooter />);
      expect(screen.getByRole('link')).toHaveAttribute('href', RELEASES_URL);
    });

    it('still shows the version label text', () => {
      vi.mocked(useBuildInfo).mockReturnValue({ ...MOCK_BUILD_INFO, releaseUrl: null });
      render(<BuildInfoFooter />);
      expect(screen.getByText('v1.2.3 (abc123d)')).toBeInTheDocument();
    });
  });
});
