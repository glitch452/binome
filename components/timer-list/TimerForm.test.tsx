import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TimerForm } from './TimerForm';

describe('TimerForm', () => {
  describe('alert card rows', () => {
    it('renders the "Alerts" legend', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Alerts')).toBeInTheDocument();
    });

    it('renders the flash description', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Flash the screen for 3 seconds')).toBeInTheDocument();
    });

    it('renders the sound description', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Repeat an alert tone')).toBeInTheDocument();
    });

    it('renders the count-up description', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Count time since the timer ended')).toBeInTheDocument();
    });

    it('renders the notify description', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Alert even in the background')).toBeInTheDocument();
    });

    it('renders the hide-name standalone card with its description', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Distraction-free countdown')).toBeInTheDocument();
    });

    it('applies accent-on styling to the flash card when flash is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Flash Screen' }));
      expect(screen.getByTestId('alert-card-flash').className).toContain('bg-acc-softer');
    });

    it('toggles the switch when its label text is clicked', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      // The flash switch defaults to off; clicking the visible label must turn it on
      // (htmlFor/id wiring between the Label and the Switch).
      await userEvent.click(screen.getByText('Flash Screen'));
      expect(screen.getByRole('switch', { name: 'Flash Screen' })).toBeChecked();
    });

    it('applies accent-on styling to the sound card when sound is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Play Sound' }));
      expect(screen.getByTestId('alert-card-sound').className).toContain('bg-acc-softer');
    });

    it('reveals the sound sub-controls when sound is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Play Sound' }));
      expect(screen.getByRole('combobox', { name: 'Sound' })).toBeInTheDocument();
    });

    it('reveals the notify sub-controls when notify is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'System Notification' }));
      expect(screen.getByRole('combobox', { name: 'Notification mode' })).toBeInTheDocument();
    });
  });

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

  describe('notify on expiry', () => {
    it('System notification switch defaults to off', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByRole('switch', { name: 'System Notification' })).not.toBeChecked();
    });

    it('mode select is not visible when notify is off', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.queryByRole('combobox', { name: 'Notification mode' })).toBeNull();
    });

    it('toggling System notification on reveals the mode select', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'System Notification' }));
      expect(screen.getByRole('combobox', { name: 'Notification mode' })).toBeInTheDocument();
    });

    it('submitted values include notify: false by default', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'T');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '1');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ notify: false }));
    });

    it('submitted values include notifyMode: hidden by default', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'T');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '1');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ notifyMode: 'hidden' }));
    });

    it('submitted values include notify: true when toggled on', async () => {
      const spy = vi.fn();
      render(<TimerForm onSubmit={spy} onCancel={vi.fn()} />);
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'T');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '1');
      await userEvent.click(screen.getByRole('switch', { name: 'System Notification' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ notify: true }));
    });
  });

  describe('sound selector reveal', () => {
    it('does not show SoundSelector when sound is disabled', () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('shows SoundSelector when sound is enabled', async () => {
      render(<TimerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      await userEvent.click(screen.getByRole('switch', { name: 'Play Sound' }));
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
        notify: false,
        notifyMode: 'hidden',
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
