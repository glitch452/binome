import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';

import { useBuildInfo } from '@/hooks/useBuildInfo';

import { BuildInfoFooter } from './BuildInfoFooter';

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

describe('BuildInfoFooter', () => {
  describe('when build info is null', () => {
    it('renders nothing', () => {
      vi.mocked(useBuildInfo).mockReturnValue(null);
      render(<BuildInfoFooter />);
      expect(screen.queryByRole('contentinfo')).toBeNull();
    });
  });

  describe('footer', () => {
    it('shows only the version number (no commit hash)', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('contentinfo')).toHaveTextContent('v1.2.3');
    });

    it('does not show the commit hash in the footer', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('contentinfo')).not.toHaveTextContent('abc123d');
    });

    it('has an accessible aria-label containing the version', () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      expect(screen.getByRole('contentinfo', { name: /app version/i })).toBeInTheDocument();
    });

    it('opens the about modal when the version button is clicked', async () => {
      vi.mocked(useBuildInfo).mockReturnValue(MOCK_BUILD_INFO);
      render(<BuildInfoFooter />);
      await userEvent.click(screen.getByRole('button', { name: /v1\.2\.3/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('about modal', () => {
    async function openModal(info: BuildInfo = MOCK_BUILD_INFO) {
      vi.mocked(useBuildInfo).mockReturnValue(info);
      render(<BuildInfoFooter />);
      await userEvent.click(screen.getByRole('button', { name: /v/i }));
    }

    it('shows the app title', async () => {
      await openModal();
      expect(screen.getByRole('heading', { name: /binome/i })).toBeInTheDocument();
    });

    it('shows the Binome logo', async () => {
      await openModal();
      expect(screen.getByRole('img', { name: /binome logo/i })).toBeInTheDocument();
    });

    it('version link points to the specific release URL when available', async () => {
      await openModal();
      const links = screen.getAllByRole('link', { name: /v1\.2\.3/i });
      expect(links[0]).toHaveAttribute('href', MOCK_BUILD_INFO.releaseUrl);
    });

    it('version link falls back to releases URL when no specific release', async () => {
      await openModal({ ...MOCK_BUILD_INFO, releaseUrl: null });
      const links = screen.getAllByRole('link', { name: /v1\.2\.3/i });
      expect(links[0]).toHaveAttribute('href', RELEASES_URL);
    });

    it('shows the commit hash', async () => {
      await openModal();
      expect(screen.getByRole('link', { name: /abc123d/i })).toBeInTheDocument();
    });

    it('commit link points to the commit on GitHub', async () => {
      await openModal();
      expect(screen.getByRole('link', { name: /abc123d/i })).toHaveAttribute(
        'href',
        `${REPO_URL}/commit/${MOCK_BUILD_INFO.commit}`,
      );
    });

    it('shows a link to the repository', async () => {
      await openModal();
      expect(screen.getByRole('link', { name: /glitch452\/binome/i })).toHaveAttribute('href', REPO_URL);
    });

    it('all external links open in a new tab', async () => {
      await openModal();
      const links = screen.getAllByRole('link');
      links.forEach((link) => expect(link).toHaveAttribute('target', '_blank'));
    });
  });
});
