import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountdownDisplay } from './CountdownDisplay';

describe('CountdownDisplay', () => {
  describe('formatting', () => {
    it('formats MM:SS for durations under one hour', () => {
      render(<CountdownDisplay remainingSeconds={90} elapsedAfterExpiry={0} status="running" />);
      expect(screen.getByTestId('countdown-display')).toHaveTextContent('01:30');
    });

    it('formats HH:MM:SS for durations of one hour or more', () => {
      render(<CountdownDisplay remainingSeconds={3661} elapsedAfterExpiry={0} status="running" />);
      expect(screen.getByTestId('countdown-display')).toHaveTextContent('01:01:01');
    });
  });

  describe('paused state', () => {
    it('applies reduced opacity when paused', () => {
      render(<CountdownDisplay remainingSeconds={60} elapsedAfterExpiry={0} status="paused" />);
      expect(screen.getByTestId('countdown-display').className).toContain('opacity-50');
    });

    it('shows the remaining time when paused', () => {
      render(<CountdownDisplay remainingSeconds={45} elapsedAfterExpiry={0} status="paused" />);
      expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:45');
    });
  });

  describe('count-up after expiry', () => {
    it('shows + prefix with elapsed time when countUp is enabled', () => {
      render(<CountdownDisplay remainingSeconds={0} elapsedAfterExpiry={5} status="expired" countUp />);
      expect(screen.getByTestId('countdown-display')).toHaveTextContent('+00:05');
    });

    it('applies destructive text colour when counting up', () => {
      render(<CountdownDisplay remainingSeconds={0} elapsedAfterExpiry={0} status="expired" countUp />);
      expect(screen.getByTestId('countdown-display').className).toContain('text-destructive');
    });
  });

  describe('frozen at 00:00 when countUp is disabled', () => {
    it('shows 00:00 on expiry when countUp is false', () => {
      render(<CountdownDisplay remainingSeconds={0} elapsedAfterExpiry={10} status="expired" />);
      expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
    });
  });

  describe('accessibility (§12)', () => {
    it('has aria-live="polite" so screen readers announce time changes', () => {
      render(<CountdownDisplay remainingSeconds={30} elapsedAfterExpiry={0} status="running" />);
      expect(screen.getByTestId('countdown-display')).toHaveAttribute('aria-live', 'polite');
    });

    it('has an aria-label containing the formatted time', () => {
      render(<CountdownDisplay remainingSeconds={90} elapsedAfterExpiry={0} status="running" />);
      expect(screen.getByTestId('countdown-display').getAttribute('aria-label')).toContain('01:30');
    });
  });
});
