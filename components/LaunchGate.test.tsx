import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LaunchGate } from './LaunchGate';

const { useHydratedMock } = vi.hoisted(() => ({ useHydratedMock: vi.fn() }));
const { useLaunchUpdateMock } = vi.hoisted(() => ({ useLaunchUpdateMock: vi.fn() }));

vi.mock('@/hooks/useHydrated', () => ({ useHydrated: useHydratedMock }));
vi.mock('@/hooks/useLaunchUpdate', () => ({ useLaunchUpdate: useLaunchUpdateMock }));

describe('LaunchGate', () => {
  afterEach(() => {
    document.documentElement.classList.remove('app-ready');
    window.history.pushState({}, '', '/');
    vi.unstubAllEnvs();
  });

  describe('while not ready', () => {
    it('shows the skeleton (not content) when hydrated is false', () => {
      useHydratedMock.mockReturnValue(false);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect({
        hasSkeleton: !!screen.queryByRole('status'),
        hasContent: !!screen.queryByText('App content'),
      }).toStrictEqual({ hasSkeleton: true, hasContent: false });
    });

    it('shows the skeleton (not content) when launch update is not ready', () => {
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: false });
      render(<LaunchGate>App content</LaunchGate>);
      expect({
        hasSkeleton: !!screen.queryByRole('status'),
        hasContent: !!screen.queryByText('App content'),
      }).toStrictEqual({ hasSkeleton: true, hasContent: false });
    });

    it('shows the skeleton when neither hydrated nor ready', () => {
      useHydratedMock.mockReturnValue(false);
      useLaunchUpdateMock.mockReturnValue({ ready: false });
      render(<LaunchGate>App content</LaunchGate>);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('once ready', () => {
    it('renders children (not skeleton) when both hydrated and ready', () => {
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect({
        hasContent: !!screen.queryByText('App content'),
        hasSkeleton: !!screen.queryByRole('status'),
      }).toStrictEqual({ hasContent: true, hasSkeleton: false });
    });

    it('renders arbitrary children markup', () => {
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(
        <LaunchGate>
          <main data-testid="app">hello</main>
        </LaunchGate>,
      );
      expect(screen.getByTestId('app')).toBeInTheDocument();
    });

    it('adds the `app-ready` class to <html> on reveal (accent overscroll)', () => {
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect(document.documentElement.classList.contains('app-ready')).toBe(true);
    });
  });

  describe('while loading', () => {
    it('does not add the `app-ready` class to <html>', () => {
      useHydratedMock.mockReturnValue(false);
      useLaunchUpdateMock.mockReturnValue({ ready: false });
      render(<LaunchGate>App content</LaunchGate>);
      expect(document.documentElement.classList.contains('app-ready')).toBe(false);
    });
  });

  describe('dev skeleton preview (?skeleton)', () => {
    it('pins the skeleton in development even when ready', () => {
      vi.stubEnv('NODE_ENV', 'development');
      window.history.pushState({}, '', '/?skeleton');
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect({
        hasSkeleton: !!screen.queryByRole('status'),
        hasContent: !!screen.queryByText('App content'),
      }).toStrictEqual({ hasSkeleton: true, hasContent: false });
    });

    it('does not add the `app-ready` class while previewing', () => {
      vi.stubEnv('NODE_ENV', 'development');
      window.history.pushState({}, '', '/?skeleton');
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect(document.documentElement.classList.contains('app-ready')).toBe(false);
    });

    it('ignores ?skeleton outside development (renders children)', () => {
      vi.stubEnv('NODE_ENV', 'production');
      window.history.pushState({}, '', '/?skeleton');
      useHydratedMock.mockReturnValue(true);
      useLaunchUpdateMock.mockReturnValue({ ready: true });
      render(<LaunchGate>App content</LaunchGate>);
      expect(screen.getByText('App content')).toBeInTheDocument();
    });
  });
});
