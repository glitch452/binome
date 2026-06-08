import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccentProvider } from '@/contexts/AccentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { STORAGE_KEY_ACCENT, STORAGE_KEY_THEME } from '@/lib/constants';

import { ThemeMenu } from './ThemeMenu';

function makeMql(matches: boolean) {
  return { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AccentProvider>{children}</AccentProvider>
    </ThemeProvider>
  );
}

function renderMenu() {
  return render(
    <Wrapper>
      <ThemeMenu />
    </Wrapper>,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Theme and accent settings' }));
}

describe('ThemeMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.accent;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(false)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.accent;
  });

  describe('trigger', () => {
    it('renders a button with the correct aria-label', () => {
      renderMenu();
      expect(screen.getByRole('button', { name: 'Theme and accent settings' })).toBeInTheDocument();
    });

    it('shows the monitor icon for the default system preference', () => {
      renderMenu();
      expect(screen.getByTestId('icon-monitor')).toBeInTheDocument();
    });

    it('shows the sun icon when preference is light', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      renderMenu();
      expect(screen.getByTestId('icon-sun')).toBeInTheDocument();
    });

    it('shows the moon icon when preference is dark', () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('dark'));
      renderMenu();
      expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
    });
  });

  describe('mode group', () => {
    it('opens the menu when the trigger is clicked', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menu')).resolves.toBeInTheDocument();
    });

    it('shows three mode radio items', async () => {
      renderMenu();
      await openMenu();
      const items = await screen.findAllByRole('menuitemradio', { name: /^(Light|Dark|System)$/ });
      expect(items).toHaveLength(3);
    });

    it('marks the current preference as checked', async () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Light' })).resolves.toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('marks other preferences as unchecked', async () => {
      localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify('light'));
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Dark' })).resolves.toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('calls setTheme when a mode item is selected', async () => {
      renderMenu();
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Light' }));
      expect(localStorage.getItem(STORAGE_KEY_THEME)).toBe('"light"');
    });
  });

  describe('accent group', () => {
    it('shows five accent radio items', async () => {
      renderMenu();
      await openMenu();
      const items = await screen.findAllByRole('menuitemradio', {
        name: /^(Indigo|Amber|Teal|Rose|Green)$/,
      });
      expect(items).toHaveLength(5);
    });

    it('marks the default indigo accent as checked', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Indigo' })).resolves.toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    it('marks other accents as unchecked by default', async () => {
      renderMenu();
      await openMenu();
      await expect(screen.findByRole('menuitemradio', { name: 'Teal' })).resolves.toHaveAttribute(
        'aria-checked',
        'false',
      );
    });

    it('calls setAccent when an accent item is selected', async () => {
      renderMenu();
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Teal' }));
      expect(localStorage.getItem(STORAGE_KEY_ACCENT)).toBe('"teal"');
    });
  });
});
