import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';
import { TimerNumeralFontProvider } from '@/contexts/TimerNumeralFontContext';
import { STORAGE_KEY_TIMER_FONT_SIZE, STORAGE_KEY_TIMER_NUMERAL_FONT } from '@/lib/constants';

import { DisplayMenu } from './DisplayMenu';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <TimerFontSizeProvider>
      <TimerNumeralFontProvider>{children}</TimerNumeralFontProvider>
    </TimerFontSizeProvider>
  );
}

function renderMenu() {
  return render(
    <Wrapper>
      <DisplayMenu />
    </Wrapper>,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Countdown display settings' }));
}

describe('DisplayMenu', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('trigger', () => {
    it('renders a button with the correct aria-label', () => {
      renderMenu();
      expect(screen.getByRole('button', { name: 'Countdown display settings' })).toBeInTheDocument();
    });
  });

  describe('size group', () => {
    it('shows four size radio items', async () => {
      renderMenu();
      await openMenu();
      const items = await screen.findAllByRole('menuitemradio', {
        name: /^(Small|Medium|Large|Extra large)$/,
      });
      expect(items).toHaveLength(4);
    });

    it('marks the default medium size as checked', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Medium' })).resolves.toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('marks other sizes as unchecked by default', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Large' })).resolves.toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('calls setFontSize when a size item is selected', async () => {
      renderMenu();
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Large' }));
      expect(localStorage.getItem(STORAGE_KEY_TIMER_FONT_SIZE)).toBe('"lg"');
    });
  });

  describe('numerals group', () => {
    it('shows two numeral radio items', async () => {
      renderMenu();
      await openMenu();
      const items = await screen.findAllByRole('menuitemradio', { name: /^(Mono|Sans)$/ });
      expect(items).toHaveLength(2);
    });

    it('marks the default mono as checked', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Mono' })).resolves.toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('marks sans as unchecked by default', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Sans' })).resolves.toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('calls setNumeralFont when a numeral item is selected', async () => {
      renderMenu();
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Sans' }));
      expect(localStorage.getItem(STORAGE_KEY_TIMER_NUMERAL_FONT)).toBe('"sans"');
    });
  });
});
