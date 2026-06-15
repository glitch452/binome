import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const NOTIFY_TIMER: TimerConfig = {
  ...SAMPLE_TIMER,
  id: 'timer-2',
  notify: true,
  notifyMode: 'always',
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

  describe('edit mode — notify pre-fill', () => {
    it('pre-fills the System Notification switch as checked when timer has notify: true', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} timer={NOTIFY_TIMER} />, { wrapper });
      expect(screen.getByRole('switch', { name: 'System Notification' })).toBeChecked();
    });

    it('reveals the mode select when timer has notify: true', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} timer={NOTIFY_TIMER} />, { wrapper });
      expect(screen.getByRole('combobox', { name: 'Notification mode' })).toBeInTheDocument();
    });
  });

  describe('discard confirmation', () => {
    it('closes the sheet immediately when there are no unsaved changes', async () => {
      const onOpenChange = vi.fn();
      render(<TimerFormSheet open onOpenChange={onOpenChange} />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('does not close the sheet when Cancel is clicked with unsaved changes', async () => {
      const onOpenChange = vi.fn();
      render(<TimerFormSheet open onOpenChange={onOpenChange} />, { wrapper });
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('shows the discard confirmation dialog when Cancel is clicked with unsaved changes', async () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} />, { wrapper });
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('dialog', { name: /discard changes/i })).toBeInTheDocument();
    });

    it('closes the sheet when Discard is clicked', async () => {
      const onOpenChange = vi.fn();
      render(<TimerFormSheet open onOpenChange={onOpenChange} />, { wrapper });
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('dismisses the confirmation dialog without closing the sheet when "Keep editing" is clicked', async () => {
      const onOpenChange = vi.fn();
      render(<TimerFormSheet open onOpenChange={onOpenChange} />, { wrapper });
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('clone mode (cloneFrom prop provided)', () => {
    it('shows "Copy Timer" as the sheet title', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} cloneFrom={SAMPLE_TIMER} />, { wrapper });
      expect(screen.getByText('Copy Timer')).toBeInTheDocument();
    });

    it('prefills the name input with the source timer name', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} cloneFrom={SAMPLE_TIMER} />, { wrapper });
      expect(screen.getByRole('textbox', { name: 'Timer name' })).toHaveValue(SAMPLE_TIMER.name);
    });

    it('closes the sheet on submit (saves as a new timer)', async () => {
      const onOpenChange = vi.fn();
      render(<TimerFormSheet open onOpenChange={onOpenChange} cloneFrom={SAMPLE_TIMER} />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('pre-fills the System Notification switch as checked when source timer has notify: true', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} cloneFrom={NOTIFY_TIMER} />, { wrapper });
      expect(screen.getByRole('switch', { name: 'System Notification' })).toBeChecked();
    });

    it('reveals the mode select when source timer has notify: true', () => {
      render(<TimerFormSheet open onOpenChange={vi.fn()} cloneFrom={NOTIFY_TIMER} />, { wrapper });
      expect(screen.getByRole('combobox', { name: 'Notification mode' })).toBeInTheDocument();
    });
  });
});
