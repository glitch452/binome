import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';

import { useBuildInfo } from '@/hooks/useBuildInfo';

import { BuildInfoFooter } from './BuildInfoFooter';

vi.mock('@/hooks/useBuildInfo');

const MOCK_BUILD_INFO: BuildInfo = {
  version: '1.2.3',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v1.2.3',
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
    it('renders a link to the release', () => {
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

  describe('when releaseUrl is null', () => {
    it('renders plain text instead of a link', () => {
      vi.mocked(useBuildInfo).mockReturnValue({ ...MOCK_BUILD_INFO, releaseUrl: null });
      render(<BuildInfoFooter />);
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('still shows the version and commit', () => {
      vi.mocked(useBuildInfo).mockReturnValue({ ...MOCK_BUILD_INFO, releaseUrl: null });
      render(<BuildInfoFooter />);
      expect(screen.getByText('v1.2.3 (abc123d)')).toBeInTheDocument();
    });
  });
});
