import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TimerConfig } from '@/types/timer';

import { TimerListItem } from './TimerListItem';

const TIMER: TimerConfig = {
  id: 'timer-1',
  name: 'Work Session',
  durationSeconds: 1500,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('TimerListItem', () => {
  describe('rendering', () => {
    it('displays the timer name', () => {
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={vi.fn()} onStart={vi.fn()} />);
      expect(screen.getByText(TIMER.name)).toBeInTheDocument();
    });

    it('displays the formatted duration', () => {
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={vi.fn()} onStart={vi.fn()} />);
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('disables the Start button when isActive is true', () => {
      render(<TimerListItem timer={TIMER} isActive onEdit={vi.fn()} onDelete={vi.fn()} onStart={vi.fn()} />);
      expect(screen.getByRole('button', { name: `Start ${TIMER.name}` })).toBeDisabled();
    });
  });

  describe('callbacks', () => {
    it('calls onEdit with the timer when Edit is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} onEdit={spy} onDelete={vi.fn()} onStart={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: `Edit ${TIMER.name}` }));
      expect(spy).toHaveBeenCalledWith(TIMER);
    });

    it('calls onStart with the timer id when Start is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={vi.fn()} onStart={spy} />);
      await userEvent.click(screen.getByRole('button', { name: `Start ${TIMER.name}` }));
      expect(spy).toHaveBeenCalledWith(TIMER.id);
    });
  });

  describe('delete confirmation', () => {
    it('opens a confirmation dialog when Delete is clicked', async () => {
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={vi.fn()} onStart={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: `Delete ${TIMER.name}` }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // eslint-disable-next-line vitest/max-expects
      expect(screen.getByText(/Work Session/, { selector: '[data-slot="dialog-content"] *' })).toBeInTheDocument();
    });

    it('calls onDelete with the timer id when the modal Delete button is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={spy} onStart={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: `Delete ${TIMER.name}` }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(spy).toHaveBeenCalledWith(TIMER.id);
    });

    it('does not call onDelete when the modal Cancel button is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={spy} onStart={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: `Delete ${TIMER.name}` }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not call onDelete when Escape is pressed', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} onEdit={vi.fn()} onDelete={spy} onStart={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: `Delete ${TIMER.name}` }));
      await userEvent.keyboard('{Escape}');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
