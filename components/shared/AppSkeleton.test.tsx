import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppSkeleton } from './AppSkeleton';

describe('AppSkeleton', () => {
  it('renders a status region for screen readers', () => {
    render(<AppSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the visually-hidden "Loading Binome" label', () => {
    render(<AppSkeleton />);
    expect(screen.getByText('Loading Binome')).toBeInTheDocument();
  });

  it('uses a fixed dark background class (not a theme token)', () => {
    render(<AppSkeleton />);
    const container = screen.getByRole('status');
    expect({
      hasDarkBg: container.classList.contains('bg-neutral-950'),
      hasThemeToken: container.classList.contains('bg-background'),
    }).toStrictEqual({ hasDarkBg: true, hasThemeToken: false });
  });

  it('is marked as busy while shown', () => {
    render(<AppSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
