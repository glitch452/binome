import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import type { TimerConfig } from '@/types/timer';

import { TimerFormSheet } from './TimerFormSheet';

const SAMPLE_TIMER: TimerConfig = {
  id: 'timer-1',
  name: 'Sample Timer',
  durationSeconds: 120,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const wrapper = ({ children }: { children: ReactNode }) => <TimerStoreProvider>{children}</TimerStoreProvider>;

describe('TimerFormSheet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create mode (no timer prop)', () => {
    it('shows "New Timer" as the sheet title', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} />, { wrapper });
      expect(screen.getByText('New Timer')).toBeInTheDocument();
    });

    it('renders the name input with an empty value', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} />, { wrapper });
      expect(screen.getByRole('textbox', { name: 'Timer name' })).toHaveValue('');
    });
  });

  describe('edit mode (timer prop provided)', () => {
    it('shows "Edit Timer" as the sheet title', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} timer={SAMPLE_TIMER} />, { wrapper });
      expect(screen.getByText('Edit Timer')).toBeInTheDocument();
    });

    it('prefills the name input with the timer name', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} timer={SAMPLE_TIMER} />, { wrapper });
      expect(screen.getByRole('textbox', { name: 'Timer name' })).toHaveValue(SAMPLE_TIMER.name);
    });
  });
});
