import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/contexts/ThemeContext';

import { ThemeToggle } from './ThemeToggle';

function makeMql(matches: boolean) {
  return { matches, addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderToggle() {
  return render(
    <Wrapper>
      <ThemeToggle />
    </Wrapper>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(makeMql(false)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  describe('initial state (system preference)', () => {
    it('renders a button element', () => {
      renderToggle();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has aria-label describing the next action', () => {
      renderToggle();
      expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    });

    it('shows the monitor icon for system preference', () => {
      renderToggle();
      expect(screen.getByTestId('icon-monitor')).toBeInTheDocument();
    });
  });

  describe('cycle order: system → light → dark → system', () => {
    it('cycles to light after first click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    });

    it('shows sun icon after cycling to light', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('icon-sun')).toBeInTheDocument();
    });

    it('cycles to dark after second click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to system theme' })).toBeInTheDocument();
    });

    it('shows moon icon after cycling to dark', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
    });

    it('cycles back to system after third click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
    });
  });

  describe('accessibility (§12)', () => {
    it('the toggle button is keyboard-accessible via Enter key', async () => {
      renderToggle();
      screen.getByRole('button').focus();
      await userEvent.keyboard('{Enter}');
      expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    });

    it('the toggle button has an aria-label at all preference states', () => {
      renderToggle();
      expect(screen.getByRole('button').getAttribute('aria-label')).not.toBeNull();
    });
  });
});
