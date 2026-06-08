import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { hmsToSeconds } from '@/lib/time';

import { DurationInput } from './DurationInput';

/**
 * Stateful wrapper so controlled inputs accept userEvent interactions
 * @param root0
 * @param root0.initial
 * @param root0.onChangeSpy
 */
function ControlledDurationInput({ initial, onChangeSpy }: { initial: number; onChangeSpy: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DurationInput
      value={value}
      onChange={(n) => {
        setValue(n);
        onChangeSpy(n);
      }}
    />
  );
}

describe('DurationInput', () => {
  describe('captioned boxes', () => {
    it('renders the "hours" caption', () => {
      render(<DurationInput value={0} onChange={vi.fn()} />);
      expect(screen.getByText('hours')).toBeInTheDocument();
    });

    it('renders the "minutes" caption', () => {
      render(<DurationInput value={0} onChange={vi.fn()} />);
      expect(screen.getByText('minutes')).toBeInTheDocument();
    });

    it('renders the "seconds" caption', () => {
      render(<DurationInput value={0} onChange={vi.fn()} />);
      expect(screen.getByText('seconds')).toBeInTheDocument();
    });
  });

  describe('rendering from seconds', () => {
    it('shows hours correctly from total seconds', () => {
      render(<DurationInput value={hmsToSeconds(1, 1, 1)} onChange={vi.fn()} />);
      expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveValue(1);
    });

    it('shows minutes correctly from total seconds', () => {
      render(<DurationInput value={hmsToSeconds(1, 30, 0)} onChange={vi.fn()} />);
      expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(30);
    });

    it('shows seconds correctly from total seconds', () => {
      render(<DurationInput value={hmsToSeconds(0, 0, 45)} onChange={vi.fn()} />);
      expect(screen.getByRole('spinbutton', { name: 'Seconds' })).toHaveValue(45);
    });

    it('shows empty fields (placeholder 0) for value 0', () => {
      render(<DurationInput value={0} onChange={vi.fn()} />);
      expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(null);
    });
  });

  describe('emitting correct total on edit', () => {
    it('emits updated total when hours is changed', async () => {
      const spy = vi.fn();
      render(<ControlledDurationInput initial={hmsToSeconds(1, 30, 15)} onChangeSpy={spy} />);
      const hoursInput = screen.getByRole('spinbutton', { name: 'Hours' });
      await userEvent.clear(hoursInput);
      await userEvent.type(hoursInput, '2');
      expect(spy).toHaveBeenLastCalledWith(hmsToSeconds(2, 30, 15));
    });

    it('emits updated total when minutes is changed', async () => {
      const spy = vi.fn();
      render(<ControlledDurationInput initial={hmsToSeconds(1, 0, 0)} onChangeSpy={spy} />);
      const minutesInput = screen.getByRole('spinbutton', { name: 'Minutes' });
      await userEvent.clear(minutesInput);
      await userEvent.type(minutesInput, '5');
      expect(spy).toHaveBeenLastCalledWith(hmsToSeconds(1, 5, 0));
    });

    it('emits updated total when seconds is changed', async () => {
      const spy = vi.fn();
      render(<ControlledDurationInput initial={hmsToSeconds(0, 1, 0)} onChangeSpy={spy} />);
      const secondsInput = screen.getByRole('spinbutton', { name: 'Seconds' });
      await userEvent.clear(secondsInput);
      await userEvent.type(secondsInput, '30');
      expect(spy).toHaveBeenLastCalledWith(hmsToSeconds(0, 1, 30));
    });
  });

  describe('clamping', () => {
    it('clamps minutes to 59 when value exceeds maximum', async () => {
      const spy = vi.fn();
      render(<ControlledDurationInput initial={0} onChangeSpy={spy} />);
      const minutesInput = screen.getByRole('spinbutton', { name: 'Minutes' });
      await userEvent.clear(minutesInput);
      await userEvent.type(minutesInput, '99');
      expect(spy).toHaveBeenLastCalledWith(hmsToSeconds(0, 59, 0));
    });

    it('clamps seconds to 59 when value exceeds maximum', async () => {
      const spy = vi.fn();
      render(<ControlledDurationInput initial={0} onChangeSpy={spy} />);
      const secondsInput = screen.getByRole('spinbutton', { name: 'Seconds' });
      await userEvent.clear(secondsInput);
      await userEvent.type(secondsInput, '99');
      expect(spy).toHaveBeenLastCalledWith(hmsToSeconds(0, 0, 59));
    });
  });

  describe('disabled state', () => {
    it('disables all three inputs when disabled prop is set', () => {
      render(<DurationInput value={0} onChange={vi.fn()} disabled />);
      expect(screen.getByRole('spinbutton', { name: 'Hours' })).toBeDisabled();
    });
  });
});
