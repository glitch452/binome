import { describe, expect, it } from 'vitest';

import { formatDuration, hmsToSeconds, secondsToHMS } from './time';

describe('time utilities', () => {
  describe('secondsToHMS', () => {
    it('converts 0 seconds', () => {
      expect(secondsToHMS(0)).toStrictEqual({ hours: 0, minutes: 0, seconds: 0 });
    });

    it('converts seconds only', () => {
      expect(secondsToHMS(45)).toStrictEqual({ hours: 0, minutes: 0, seconds: 45 });
    });

    it('converts minutes and seconds (< 1 h)', () => {
      expect(secondsToHMS(90)).toStrictEqual({ hours: 0, minutes: 1, seconds: 30 });
    });

    it('converts hours, minutes, and seconds (≥ 1 h)', () => {
      expect(secondsToHMS(3661)).toStrictEqual({ hours: 1, minutes: 1, seconds: 1 });
    });

    it('truncates fractional seconds', () => {
      expect(secondsToHMS(90.9)).toStrictEqual({ hours: 0, minutes: 1, seconds: 30 });
    });
  });

  describe('hmsToSeconds', () => {
    it('converts 0 0 0 to 0', () => {
      expect(hmsToSeconds(0, 0, 0)).toBe(0);
    });

    it('converts hours only', () => {
      expect(hmsToSeconds(2, 0, 0)).toBe(7200);
    });

    it('converts mixed values', () => {
      expect(hmsToSeconds(1, 30, 45)).toBe(5445);
    });

    it('round-trips with secondsToHMS', () => {
      const total = 7384;
      const { hours, minutes, seconds } = secondsToHMS(total);
      expect(hmsToSeconds(hours, minutes, seconds)).toBe(total);
    });
  });

  describe('formatDuration', () => {
    it('formats 0 as 00:00', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it.each([
      [90, '01:30'],
      [3599, '59:59'],
    ] as const)('formats %i s (< 1 h) as MM:SS → %s', (input, expected) => {
      expect(formatDuration(input)).toBe(expected);
    });

    it.each([
      [3600, '01:00:00'],
      [3661, '01:01:01'],
      [36000, '10:00:00'],
    ] as const)('formats %i s (≥ 1 h) as HH:MM:SS → %s', (input, expected) => {
      expect(formatDuration(input)).toBe(expected);
    });

    it.each([
      [61, '01:01'],
      [3723, '01:02:03'],
    ] as const)('pads single-digit values: %i s → %s', (input, expected) => {
      expect(formatDuration(input)).toBe(expected);
    });

    it.each([
      [0, '+00:00'],
      [90, '+01:30'],
      [3661, '+01:01:01'],
    ] as const)('adds + prefix for count-up: %i s → %s', (input, expected) => {
      expect(formatDuration(input, '+')).toBe(expected);
    });
  });
});
