import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TimerConfig } from '@/types/timer';

import { ImportDialog, type ImportDialogCandidate } from './ImportDialog';

const TIMER_A: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Tea',
  durationSeconds: 180,
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

const TIMER_B: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Coffee',
  durationSeconds: 300,
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

const PLAIN: ImportDialogCandidate = { timer: TIMER_A, conflict: false };
const CONFLICT: ImportDialogCandidate = { timer: TIMER_B, conflict: true };

/**
 * Renders ImportDialog with sensible defaults, overriding any provided props.
 * @param props
 */
function renderDialog(props: Partial<React.ComponentProps<typeof ImportDialog>> = {}) {
  const defaults: React.ComponentProps<typeof ImportDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    candidates: [PLAIN],
    droppedCount: 0,
    onConfirm: vi.fn(),
  };
  return render(<ImportDialog {...defaults} {...props} />);
}

describe('ImportDialog', () => {
  describe('title and structure', () => {
    it('shows the dialog title', () => {
      renderDialog();
      expect(screen.getByRole('heading', { name: /import timers/i })).toBeInTheDocument();
    });

    it('renders a Cancel button', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders an Import button', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /^import$/i })).toBeInTheDocument();
    });
  });

  describe('checkbox defaults', () => {
    it('pre-checks a non-conflicting row', () => {
      renderDialog({ candidates: [PLAIN] });
      expect(screen.getByRole('checkbox', { name: TIMER_A.name })).toHaveAttribute('aria-checked', 'true');
    });

    it('leaves a conflicting row unchecked by default', () => {
      renderDialog({ candidates: [CONFLICT] });
      expect(screen.getByRole('checkbox', { name: TIMER_B.name })).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('overwrite badge', () => {
    it('shows the overwrite badge for a conflicting row', () => {
      renderDialog({ candidates: [CONFLICT] });
      expect(screen.getByText(/overwrites existing/i)).toBeInTheDocument();
    });

    it('does not show the overwrite badge for a non-conflicting row', () => {
      renderDialog({ candidates: [PLAIN] });
      expect(screen.queryByText(/overwrites existing/i)).toBeNull();
    });
  });

  describe('dropped count notice', () => {
    it('shows the notice when droppedCount is greater than zero', () => {
      renderDialog({ droppedCount: 2 });
      expect(screen.getByText(/2 timers.*invalid.*skipped/i)).toBeInTheDocument();
    });

    it('uses singular "timer" when droppedCount is 1', () => {
      renderDialog({ droppedCount: 1 });
      expect(screen.getByText(/1 timer\b.*invalid.*skipped/i)).toBeInTheDocument();
    });

    it('does not show the notice when droppedCount is 0', () => {
      renderDialog({ droppedCount: 0 });
      expect(screen.queryByText(/invalid.*skipped/i)).toBeNull();
    });
  });

  describe('Import button state', () => {
    it('is disabled when all rows are unchecked', () => {
      renderDialog({ candidates: [CONFLICT] }); // conflict → unchecked by default
      expect(screen.getByRole('button', { name: /^import$/i })).toBeDisabled();
    });

    it('is enabled when at least one row is checked', () => {
      renderDialog({ candidates: [PLAIN] }); // non-conflict → checked by default
      expect(screen.getByRole('button', { name: /^import$/i })).not.toBeDisabled();
    });

    it('becomes disabled after the user unchecks all rows', async () => {
      renderDialog({ candidates: [PLAIN] });
      await userEvent.click(screen.getByRole('checkbox', { name: TIMER_A.name }));
      expect(screen.getByRole('button', { name: /^import$/i })).toBeDisabled();
    });

    it('becomes enabled after the user checks a conflicting row', async () => {
      renderDialog({ candidates: [CONFLICT] });
      await userEvent.click(screen.getByRole('checkbox', { name: TIMER_B.name }));
      expect(screen.getByRole('button', { name: /^import$/i })).not.toBeDisabled();
    });
  });

  describe('onConfirm callback', () => {
    it('calls onConfirm with the checked timers when Import is clicked', async () => {
      const onConfirm = vi.fn();
      renderDialog({ candidates: [PLAIN], onConfirm });
      await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
      expect(onConfirm).toHaveBeenCalledWith([TIMER_A]);
    });

    it('does not include unchecked timers in the onConfirm call', async () => {
      const onConfirm = vi.fn();
      // PLAIN (checked) + CONFLICT (unchecked by default)
      renderDialog({ candidates: [PLAIN, CONFLICT], onConfirm });
      await userEvent.click(screen.getByRole('button', { name: /^import$/i }));
      expect(onConfirm).toHaveBeenCalledWith([TIMER_A]);
    });

    it('does not call onConfirm when Cancel is clicked', async () => {
      const onConfirm = vi.fn();
      renderDialog({ onConfirm });
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
