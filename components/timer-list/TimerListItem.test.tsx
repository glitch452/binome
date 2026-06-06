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
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const noop = { onEdit: vi.fn(), onClone: vi.fn(), onDelete: vi.fn(), onStart: vi.fn() };

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: `More options for ${TIMER.name}` }));
}

describe('TimerListItem', () => {
  describe('rendering', () => {
    it('displays the timer name', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.getByText(TIMER.name)).toBeInTheDocument();
    });

    it('displays the formatted duration', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('disables the Start button when isActive is true', () => {
      render(<TimerListItem timer={TIMER} isActive {...noop} />);
      expect(screen.getByRole('button', { name: `Start ${TIMER.name}` })).toBeDisabled();
    });
  });

  describe('feature indicators', () => {
    it('hides the bell icon when sound is disabled', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.queryByLabelText('Sound on expiry')).toBeNull();
    });

    it('hides the sun icon when flash is disabled', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.queryByLabelText('Flash on expiry')).toBeNull();
    });

    it('hides the hash icon when count-up is disabled', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.queryByLabelText('Count up after expiry')).toBeNull();
    });

    it('shows the bell icon when sound is enabled', () => {
      render(<TimerListItem timer={{ ...TIMER, sound: true, soundId: 'bell' }} {...noop} />);
      expect(screen.getByLabelText('Sound on expiry')).toBeInTheDocument();
    });

    it('shows the sun icon when flash is enabled', () => {
      render(<TimerListItem timer={{ ...TIMER, flash: true }} {...noop} />);
      expect(screen.getByLabelText('Flash on expiry')).toBeInTheDocument();
    });

    it('shows the hash icon when count-up is enabled', () => {
      render(<TimerListItem timer={{ ...TIMER, countUp: true }} {...noop} />);
      expect(screen.getByLabelText('Count up after expiry')).toBeInTheDocument();
    });

    it('shows the bell icon when all features are enabled', () => {
      render(
        <TimerListItem timer={{ ...TIMER, sound: true, soundId: 'bell', flash: true, countUp: true }} {...noop} />,
      );
      expect(screen.getByLabelText('Sound on expiry')).toBeInTheDocument();
    });

    it('shows the sun icon when all features are enabled', () => {
      render(
        <TimerListItem timer={{ ...TIMER, sound: true, soundId: 'bell', flash: true, countUp: true }} {...noop} />,
      );
      expect(screen.getByLabelText('Flash on expiry')).toBeInTheDocument();
    });

    it('shows the hash icon when all features are enabled', () => {
      render(
        <TimerListItem timer={{ ...TIMER, sound: true, soundId: 'bell', flash: true, countUp: true }} {...noop} />,
      );
      expect(screen.getByLabelText('Count up after expiry')).toBeInTheDocument();
    });
  });

  describe('options menu', () => {
    it('renders a More options button', () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      expect(screen.getByRole('button', { name: `More options for ${TIMER.name}` })).toBeInTheDocument();
    });

    it('opens the menu when the More options button is clicked', async () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      await openMenu();
      await expect(screen.findByRole('menu')).resolves.toBeInTheDocument();
    });

    it('shows Edit, Copy, and Delete items in the menu', async () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      await openMenu();
      await expect(screen.findByRole('menuitem', { name: /Edit/ })).resolves.toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onEdit with the timer when Edit is selected from the menu', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onEdit={spy} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Edit/ }));
      expect(spy).toHaveBeenCalledWith(TIMER);
    });

    it('calls onClone with the timer when Copy is selected from the menu', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onClone={spy} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Copy/ }));
      expect(spy).toHaveBeenCalledWith(TIMER);
    });

    it('calls onStart with the timer id when Start is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onStart={spy} />);
      await userEvent.click(screen.getByRole('button', { name: `Start ${TIMER.name}` }));
      expect(spy).toHaveBeenCalledWith(TIMER.id);
    });
  });

  describe('delete confirmation', () => {
    it('opens a confirmation dialog when Delete is selected from the menu', async () => {
      render(<TimerListItem timer={TIMER} {...noop} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
      expect(screen.getByText(/Work Session/, { selector: '[data-slot="dialog-content"] *' })).toBeInTheDocument();
    });

    it('calls onDelete with the timer id when the modal Delete button is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onDelete={spy} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(spy).toHaveBeenCalledWith(TIMER.id);
    });

    it('does not call onDelete when the modal Cancel button is clicked', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onDelete={spy} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not call onDelete when Escape is pressed', async () => {
      const spy = vi.fn();
      render(<TimerListItem timer={TIMER} {...noop} onDelete={spy} />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
      await userEvent.keyboard('{Escape}');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
