import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SOUND_IDS } from '@/lib/constants';

import { SoundSelector } from './SoundSelector';

describe('SoundSelector', () => {
  describe('rendering', () => {
    it('renders a combobox trigger', () => {
      render(<SoundSelector value={null} onChange={vi.fn()} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('shows the placeholder when no value is selected', () => {
      render(<SoundSelector value={null} onChange={vi.fn()} />);
      expect(screen.getByText('Select a sound')).toBeInTheDocument();
    });
  });

  describe('options', () => {
    it.each(SOUND_IDS)('lists %s as an available option', async (soundId) => {
      const user = userEvent.setup();
      render(<SoundSelector value={null} onChange={vi.fn()} />);
      await user.click(screen.getByRole('combobox'));
      const label = `${soundId.charAt(0).toUpperCase()}${soundId.slice(1)}`;
      await expect(screen.findByRole('option', { name: label })).resolves.toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('calls onChange with the selected SoundId', async () => {
      const spy = vi.fn();
      const user = userEvent.setup();
      render(<SoundSelector value={null} onChange={spy} />);
      await user.click(screen.getByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Bell' }));
      expect(spy).toHaveBeenCalledWith('bell');
    });
  });

  describe('disabled', () => {
    it('disables the trigger when disabled prop is set', () => {
      render(<SoundSelector value={null} onChange={vi.fn()} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});
