import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BuildInfo } from '@/lib/build-info';

import { UpdateBanner } from './UpdateBanner';

const RELEASE_URL = 'https://github.com/glitch452/binome/releases/tag/v2.0.0';

const UPDATE: BuildInfo = {
  version: '2.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: RELEASE_URL,
  releasesUrl: 'https://github.com/glitch452/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

describe('UpdateBanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('version display', () => {
    it('renders the extracted version string', () => {
      render(<UpdateBanner update={UPDATE} onDismiss={vi.fn()} onRefresh={vi.fn()} />);
      expect(screen.getByText('A new version of Binome is available: v2.0.0')).toBeInTheDocument();
    });
  });

  describe('release notes link', () => {
    it('points to update.releaseUrl', () => {
      render(<UpdateBanner update={UPDATE} onDismiss={vi.fn()} onRefresh={vi.fn()} />);
      expect(screen.getByRole('link', { name: /Release Notes/ })).toHaveAttribute('href', RELEASE_URL);
    });

    it('opens in a new tab', () => {
      render(<UpdateBanner update={UPDATE} onDismiss={vi.fn()} onRefresh={vi.fn()} />);
      expect(screen.getByRole('link', { name: /Release Notes/ })).toHaveAttribute('target', '_blank');
    });
  });

  describe('Update button', () => {
    it('calls onRefresh when clicked', async () => {
      const onRefresh = vi.fn();
      render(<UpdateBanner update={UPDATE} onDismiss={vi.fn()} onRefresh={onRefresh} />);
      await userEvent.click(screen.getByRole('button', { name: 'Update' }));
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('dismiss button', () => {
    it('calls onDismiss when clicked', async () => {
      const onDismiss = vi.fn();
      render(<UpdateBanner update={UPDATE} onDismiss={onDismiss} onRefresh={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('has the correct aria-label', () => {
      render(<UpdateBanner update={UPDATE} onDismiss={vi.fn()} onRefresh={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Dismiss update notification' })).toBeInTheDocument();
    });
  });
});
