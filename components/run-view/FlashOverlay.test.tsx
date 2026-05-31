import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FlashOverlay } from './FlashOverlay';

describe('FlashOverlay', () => {
  describe('when inactive', () => {
    it('renders nothing', () => {
      render(<FlashOverlay />);
      expect(screen.queryByTestId('flash-overlay')).toBeNull();
    });
  });

  describe('when active', () => {
    it('renders the overlay element', () => {
      render(<FlashOverlay active />);
      expect(screen.getByTestId('flash-overlay')).toBeInTheDocument();
    });

    it('has aria-hidden to hide it from assistive technology', () => {
      render(<FlashOverlay active />);
      expect(screen.getByTestId('flash-overlay')).toHaveAttribute('aria-hidden', 'true');
    });

    it('has the flash animation class', () => {
      render(<FlashOverlay active />);
      expect(screen.getByTestId('flash-overlay').className).toContain('flash-pulse');
    });

    it('covers the full viewport with fixed positioning', () => {
      render(<FlashOverlay active />);
      expect(screen.getByTestId('flash-overlay').className).toContain('fixed');
    });
  });
});
