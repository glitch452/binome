import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { TimerList } from './TimerList';

const SAMPLE_TIMER: TimerConfig = {
  id: 'timer-1',
  name: 'Test Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <TimerStoreProvider>
      <ActiveTimerProvider>{children}</ActiveTimerProvider>
    </TimerStoreProvider>
  </ThemeProvider>
);

describe('TimerList', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  describe('empty state', () => {
    it('shows an empty state message when there are no timers', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByText(/no timers yet/i)).toBeInTheDocument();
    });
  });

  describe('populated list', () => {
    it('renders a list item for each stored timer', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      render(<TimerList />, { wrapper });
      expect(screen.getByText(SAMPLE_TIMER.name)).toBeInTheDocument();
    });
  });

  describe('new timer sheet', () => {
    it('opens the create sheet when New Timer is clicked', async () => {
      render(<TimerList />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: 'New Timer' }));
      expect(screen.getByText('New Timer', { selector: '[data-slot="sheet-title"]' })).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('shows the app name', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });
  });

  describe('accessibility — semantic landmarks (§12)', () => {
    it('renders a banner landmark for the header', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders a main landmark for the content area', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
