import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';
import { useBuildInfo } from '@/hooks/useBuildInfo';

import { AboutDialog } from './AboutDialog';

vi.mock('@/hooks/useBuildInfo');

const RELEASES_URL = 'https://github.com/glitch452/binome/releases';
const REPO_URL = 'https://github.com/glitch452/binome';

const MOCK_BUILD_INFO: BuildInfo = {
  version: '1.2.3',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: `${RELEASES_URL}/tag/v1.2.3`,
  releasesUrl: RELEASES_URL,
  buildTime: '2024-06-01T10:00:00.000Z',
};

describe('AboutDialog', () => {
  describe('when build info is null', () => {
    it('renders nothing', () => {
      vi.mocked(useBuildInfo).mockReturnValue(null);
      const { container } = render(<AboutDialog open onOpenChange={vi.fn()} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('when build info is available and open', () => {
    function renderOpen(info: BuildInfo = MOCK_BUILD_INFO) {
      vi.mocked(useBuildInfo).mockReturnValue(info);
      render(<AboutDialog open onOpenChange={vi.fn()} />);
    }

    it('shows the app title', () => {
      renderOpen();
      expect(screen.getByRole('heading', { name: /binome/i })).toBeInTheDocument();
    });

    it('shows the Binome logo', () => {
      renderOpen();
      expect(screen.getByRole('img', { name: /binome logo/i })).toBeInTheDocument();
    });

    it('version link points to the specific release URL when available', () => {
      renderOpen();
      const links = screen.getAllByRole('link', { name: /v1\.2\.3/i });
      expect(links[0]).toHaveAttribute('href', MOCK_BUILD_INFO.releaseUrl);
    });

    it('version link falls back to releases URL when no specific release', () => {
      renderOpen({ ...MOCK_BUILD_INFO, releaseUrl: null });
      const links = screen.getAllByRole('link', { name: /v1\.2\.3/i });
      expect(links[0]).toHaveAttribute('href', RELEASES_URL);
    });

    it('shows the commit hash link', () => {
      renderOpen();
      expect(screen.getByRole('link', { name: /abc123d/i })).toBeInTheDocument();
    });

    it('commit link points to the commit on GitHub', () => {
      renderOpen();
      expect(screen.getByRole('link', { name: /abc123d/i })).toHaveAttribute(
        'href',
        `${REPO_URL}/commit/${MOCK_BUILD_INFO.commit}`,
      );
    });

    it('shows a link to the repository', () => {
      renderOpen();
      expect(screen.getByRole('link', { name: /glitch452\/binome/i })).toHaveAttribute('href', REPO_URL);
    });

    it('all external links open in a new tab', () => {
      renderOpen();
      const links = screen.getAllByRole('link');
      links.forEach((link) => expect(link).toHaveAttribute('target', '_blank'));
    });
  });

  describe('onOpenChange', () => {
    it('calls onOpenChange when the dialog requests to close', async () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      const onOpenChange = vi.fn();
      render(<AboutDialog open onOpenChange={onOpenChange} />);
      await userEvent.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });
  });
});
