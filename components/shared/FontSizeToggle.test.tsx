import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';

import { FontSizeToggle } from './FontSizeToggle';

function Wrapper({ children }: { children: ReactNode }) {
  return <TimerFontSizeProvider>{children}</TimerFontSizeProvider>;
}

function renderToggle() {
  return render(
    <Wrapper>
      <FontSizeToggle />
    </Wrapper>,
  );
}

describe('FontSizeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial state (md default)', () => {
    it('renders a button element', () => {
      renderToggle();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('has aria-label describing the next action', () => {
      renderToggle();
      expect(screen.getByRole('button', { name: 'Switch to large font size' })).toBeInTheDocument();
    });
  });

  describe('cycle order: md → lg → xl → sm → md', () => {
    it('cycles to lg after first click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to extra large font size' })).toBeInTheDocument();
    });

    it('cycles to xl after second click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to small font size' })).toBeInTheDocument();
    });

    it('cycles to sm after third click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to medium font size' })).toBeInTheDocument();
    });

    it('cycles back to md after fourth click', async () => {
      renderToggle();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button', { name: 'Switch to large font size' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('is keyboard-accessible via Enter key', async () => {
      renderToggle();
      screen.getByRole('button').focus();
      await userEvent.keyboard('{Enter}');
      expect(screen.getByRole('button', { name: 'Switch to extra large font size' })).toBeInTheDocument();
    });
  });
});
