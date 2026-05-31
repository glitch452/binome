import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TimerControls } from './TimerControls';

const DEFAULT_PROPS = {
  onPause: vi.fn(),
  onResume: vi.fn(),
  onReset: vi.fn(),
  onBack: vi.fn(),
};

describe('TimerControls', () => {
  describe('button visibility per status', () => {
    it('shows Pause button when running', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="running" />);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('hides Pause button when not running', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="paused" />);
      expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    });

    it('shows Resume button when paused', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="paused" />);
      expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    });

    it('hides Resume button when running', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="running" />);
      expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
    });

    it('always shows Reset button', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="expired" />);
      expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    });

    it('always shows Back to List button', () => {
      render(<TimerControls {...DEFAULT_PROPS} status="idle" />);
      expect(screen.getByRole('button', { name: 'Back to List' })).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onPause when Pause is clicked', async () => {
      const spy = vi.fn();
      render(<TimerControls {...DEFAULT_PROPS} onPause={spy} status="running" />);
      await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(spy).toHaveBeenCalledOnce();
    });

    it('calls onResume when Resume is clicked', async () => {
      const spy = vi.fn();
      render(<TimerControls {...DEFAULT_PROPS} onResume={spy} status="paused" />);
      await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
      expect(spy).toHaveBeenCalledOnce();
    });

    it('calls onReset when Reset is clicked', async () => {
      const spy = vi.fn();
      render(<TimerControls {...DEFAULT_PROPS} onReset={spy} status="running" />);
      await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(spy).toHaveBeenCalledOnce();
    });

    it('calls onBack when Back to List is clicked', async () => {
      const spy = vi.fn();
      render(<TimerControls {...DEFAULT_PROPS} onBack={spy} status="running" />);
      await userEvent.click(screen.getByRole('button', { name: 'Back to List' }));
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
