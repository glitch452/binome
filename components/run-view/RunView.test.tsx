import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { AccentProvider } from '@/contexts/AccentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';
import { TimerNumeralFontProvider } from '@/contexts/TimerNumeralFontContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS, STORAGE_KEY_TIMER_NUMERAL_FONT } from '@/lib/constants';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerConfig } from '@/types/timer';

import { RunView } from './RunView';

const TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Focus Timer',
  durationSeconds: 2,
  flash: true,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Test helper: renders a start button + RunView so tests can trigger start via click. */
const RunViewWithStarter = () => {
  const ctx = useContext(ActiveTimerContext);
  const { timers } = useTimerStore();
  return (
    <>
      <button
        type="button"
        data-testid="start-timer"
        onClick={() => {
          const t = timers[0]; // always populated in tests via localStorage setup
          ctx?.start(t.id, t.durationSeconds, t.countUp);
        }}
      >
        Start
      </button>
      <RunView />
    </>
  );
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <AccentProvider>
      <TimerFontSizeProvider>
        <TimerNumeralFontProvider>
          <TimerStoreProvider>
            <ActiveTimerProvider>{children}</ActiveTimerProvider>
          </TimerStoreProvider>
        </TimerNumeralFontProvider>
      </TimerFontSizeProvider>
    </AccentProvider>
  </ThemeProvider>
);

describe('RunView', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([TIMER]));
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function MockAudioContextImpl() {
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

  describe('renders active timer', () => {
    it('renders nothing when no timer is active', () => {
      render(<RunViewWithStarter />, { wrapper });
      expect(screen.queryByTestId('countdown-display')).toBeNull();
    });

    it('shows the timer name after start', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByText(TIMER.name)).toBeInTheDocument();
    });

    it('centers the timer name', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByRole('heading', { name: TIMER.name })).toHaveClass('text-center');
    });

    it('shows the countdown display after start', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    });
  });

  describe('gradient background', () => {
    it('renders the accent-gradient background element', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByTestId('run-gradient')).toBeInTheDocument();
    });
  });

  describe('toolbar menus', () => {
    it('renders the ThemeMenu trigger', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByRole('button', { name: 'Theme and accent settings' })).toBeInTheDocument();
    });

    it('renders the DisplayMenu trigger', async () => {
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByRole('button', { name: 'Countdown display settings' })).toBeInTheDocument();
    });
  });

  describe('numeral font', () => {
    it('passes the stored numeral font to CountdownDisplay', async () => {
      localStorage.setItem(STORAGE_KEY_TIMER_NUMERAL_FONT, JSON.stringify('sans'));
      render(<RunViewWithStarter />, { wrapper });
      await userEvent.click(screen.getByTestId('start-timer'));
      expect(screen.getByTestId('countdown-display').className).toContain('font-sans');
    });
  });

  describe('alerts on expiry', () => {
    it('shows the FlashOverlay when a flash-enabled timer expires', () => {
      vi.useFakeTimers();
      render(<RunViewWithStarter />, { wrapper });
      // eslint-disable-next-line testing-library/prefer-user-event -- userEvent.click is async and hangs inside fake-timer tests
      fireEvent.click(screen.getByTestId('start-timer'));
      act(() => {
        vi.advanceTimersByTime(TIMER.durationSeconds * 1000);
      });
      expect(screen.getByTestId('flash-overlay')).toBeInTheDocument();
      vi.useRealTimers();
    });
  });
});
