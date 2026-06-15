import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Brand } from './Brand';

describe('Brand', () => {
  describe('without onClick', () => {
    it('renders the logo SVG', () => {
      render(<Brand />);
      expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
    });

    it('renders the Binome heading', () => {
      render(<Brand />);
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });

    it('renders the tagline', () => {
      render(<Brand />);
      expect(screen.getByText('Every second counts')).toBeInTheDocument();
    });

    it('does not render a button', () => {
      render(<Brand />);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('with onClick', () => {
    it('renders a button with aria-label "About Binome"', () => {
      render(<Brand onClick={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'About Binome' })).toBeInTheDocument();
    });

    it('still renders the logo inside the button', () => {
      render(<Brand onClick={vi.fn()} />);
      expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
    });

    it('still renders the heading inside the button', () => {
      render(<Brand onClick={vi.fn()} />);
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });

    it('calls onClick when the button is clicked', async () => {
      const onClick = vi.fn();
      render(<Brand onClick={onClick} />);
      await userEvent.click(screen.getByRole('button', { name: 'About Binome' }));
      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
