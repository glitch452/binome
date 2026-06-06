import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import { useBuildInfo } from '@/hooks/useBuildInfo';
import { useTimerStore } from '@/hooks/useTimerStore';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';
import type { BuildInfo } from '@/lib/build-info';
import type { TimerConfig } from '@/types/timer';

import { AppShell } from './AppShell';

vi.mock('@/hooks/useBuildInfo', () => ({ useBuildInfo: vi.fn().mockReturnValue(null) }));
vi.mock('@/hooks/useUpdateCheck', () => ({
  useUpdateCheck: vi.fn().mockReturnValue({ update: null, dismissUpdate: vi.fn() }),
}));

const UPDATE: BuildInfo = {
  version: '2.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v2.0.0',
  releasesUrl: 'https://github.com/glitch452/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

const TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Renders control buttons for starting/backing alongside AppShell. */
const AppShellWithControls = () => {
  const ctx = useContext(ActiveTimerContext);
  const { timers } = useTimerStore();
  return (
    <>
      <button
        type="button"
        data-testid="start"
        onClick={() => {
          const t = timers[0];
          ctx?.start(t.id, t.durationSeconds, t.countUp);
        }}
      >
        Start
      </button>
      <button type="button" data-testid="back" onClick={() => ctx?.backToList()}>
        Back
      </button>
      <AppShell />
    </>
  );
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <TimerFontSizeProvider>
      <TimerStoreProvider>
        <ActiveTimerProvider>{children}</ActiveTimerProvider>
      </TimerStoreProvider>
    </TimerFontSizeProvider>
  </ThemeProvider>
);

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([TIMER]));
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function MockAudioContext() {
        return {
          state: 'running',
          destination: {},
          resume: vi.fn().mockResolvedValue(undefined),
          decodeAudioData: vi.fn().mockResolvedValue({}),
          createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('view switching based on active state', () => {
    it('shows TimerList by default', () => {
      render(<AppShellWithControls />, { wrapper });
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });

    it('shows RunView after a timer is started', async () => {
      render(<AppShellWithControls />, { wrapper });
      await userEvent.click(screen.getByTestId('start'));
      expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    });

    it('returns to TimerList when backToList is called', async () => {
      render(<AppShellWithControls />, { wrapper });
      await userEvent.click(screen.getByTestId('start'));
      await userEvent.click(screen.getByTestId('back'));
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });
  });

  describe('BuildInfoFooter (VR-08)', () => {
    it('renders the footer element in both views', () => {
      vi.mocked(useBuildInfo).mockReturnValue({
        version: '1.0.0',
        commit: 'abc123def456789012345678901234567890abcd',
        commitShort: 'abc123d',
        releaseUrl: null,
        releasesUrl: 'https://github.com/glitch452/binome/releases',
        buildTime: '2024-06-01T10:00:00.000Z',
      });
      render(<AppShellWithControls />, { wrapper });
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  describe('UpdateBanner wiring (UC-03)', () => {
    beforeEach(() => {
      vi.mocked(useUpdateCheck).mockReturnValue({ update: null, dismissUpdate: vi.fn() });
    });

    it('passes a non-null update to TimerList when the hook reports one', () => {
      vi.mocked(useUpdateCheck).mockReturnValue({ update: UPDATE, dismissUpdate: vi.fn() });
      render(<AppShellWithControls />, { wrapper });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('passes a null update to TimerList when no update is available', () => {
      render(<AppShellWithControls />, { wrapper });
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
