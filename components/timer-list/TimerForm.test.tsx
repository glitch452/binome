import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TimerForm } from './TimerForm';

describe('TimerForm', () => {
  describe('validation gating', () => {
    it('submit is disabled when name is empty', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('submit is disabled when duration is zero', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'Test');
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    it('submit is enabled when name and duration are valid', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'Test');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '5');
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });
  });

  describe('sound selector reveal', () => {
    it('does not show SoundSelector when sound is disabled', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('shows SoundSelector when sound is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Sound on expiry' }));
      expect(screen.getByRole('combobox', { name: 'Sound' })).toBeInTheDocument();
    });
  });

  describe('submit payload', () => {
    it('calls onSubmit with the form values on save', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '5');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith({
        name: 'My Timer',
        durationSeconds: 300,
        flash: false,
        sound: false,
        soundId: null,
        soundRepeat: 1,
        countUp: false,
        hideName: false,
      });
    });

    it('prefills name from initialValues', () => {
      render(
        <TimerForm initialValues={{ name: 'Existing', durationSeconds: 60 }} onSubmit={vi.fn()} onCancel={vi.fn()} />,
      );
      expect(screen.getByRole('textbox', { name: 'Timer name' })).toHaveValue('Existing');
    });

    it('includes hideName: true in payload when checked', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '5');
      await userEvent.click(screen.getByRole('switch', { name: 'Hide timer name on timer page' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ hideName: true }));
    });

    it('includes soundRepeat: 1 in payload by default', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Timer');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '5');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ soundRepeat: 1 }));
    });

    it('prefills soundRepeat from initialValues', () => {
      render(
        <TimerForm
          initialValues={{ name: 'Test', durationSeconds: 60, sound: true, soundId: 'bell', soundRepeat: 3 }}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByRole('combobox', { name: 'Sound repeat count' })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={vi.fn()} onCancel={spy} />);
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
