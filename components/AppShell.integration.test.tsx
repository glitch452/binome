/**
 * Integration test: AppShell full-flow
 * create timer → start → tick → expiry alerts → reset → back to list
 * Asserts timer survives view switch (FR-10).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { AppShell } from './AppShell';

const FLASH_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Flash Timer',
  durationSeconds: 2,
  flash: true,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const LONG_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Long Timer',
  durationSeconds: 10,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Displays remaining seconds from context so tests can verify FR-10 */
const RemainingDisplay = () => {
  const ctx = useContext(ActiveTimerContext);
  return <div data-testid="remaining">{ctx?.state.remainingSeconds}</div>;
};

const Providers = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <TimerStoreProvider>
      <ActiveTimerProvider>
        <RemainingDisplay />
        {children}
      </ActiveTimerProvider>
    </TimerStoreProvider>
  </ThemeProvider>
);

describe('AppShell — integration', () => {
  beforeEach(() => {
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
    vi.useRealTimers();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('create timer via form', () => {
    it('a timer created through the New Timer form appears in the list', async () => {
      localStorage.clear();
      render(<AppShell />, { wrapper: Providers });
      await userEvent.click(screen.getByRole('button', { name: 'New Timer' }));
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Work Session');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '25');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByText('My Work Session')).toBeInTheDocument();
    });
  });

  describe('timer lifecycle', () => {
    it('starting a timer transitions to RunView', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    });

    it('expiry alerts fire when the timer reaches zero (FR-11/12)', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(FLASH_TIMER.durationSeconds * 1000);
      });
      expect(screen.getByTestId('flash-overlay')).toBeInTheDocument();
    });

    it('resetting an expired timer returns remaining to original duration', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(FLASH_TIMER.durationSeconds * 1000);
      });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByTestId('remaining')).toHaveTextContent(String(FLASH_TIMER.durationSeconds));
    });
  });

  describe('FR-10 — timer persists across view switch', () => {
    it('timer keeps ticking after Back to List is clicked', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([LONG_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${LONG_TIMER.name}` }));
      // Advance 3 seconds — remaining should be 7
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      // Navigate back to list WITHOUT stopping the timer
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: 'Back to List' }));
      // Advance 2 more seconds — timer should still be counting (remaining = 5)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId('remaining')).toHaveTextContent('5');
    });
  });
});
