import { describe, expect, it } from 'vitest';

import {
  accentColorSchema,
  themePreferenceSchema,
  timerFontSizeSchema,
  timerNumeralFontSchema,
} from './preferencesSchema';

describe('preferencesSchema', () => {
  describe('themePreferenceSchema', () => {
    it.each(['light', 'dark', 'system'])('accepts valid value "%s"', (value) => {
      expect(themePreferenceSchema.parse(value)).toBe(value);
    });

    it.each([
      ['empty string', ''],
      ['unknown string', 'auto'],
      ['number', 42],
      ['null', null],
      ['undefined', undefined],
    ])('throws on invalid value: %s', (_label, value) => {
      expect(() => themePreferenceSchema.parse(value)).toThrow();
    });
  });

  describe('timerFontSizeSchema', () => {
    it.each(['sm', 'md', 'lg', 'xl'])('accepts valid value "%s"', (value) => {
      expect(timerFontSizeSchema.parse(value)).toBe(value);
    });

    it.each([
      ['empty string', ''],
      ['unknown string', 'xxl'],
      ['number', 1],
      ['null', null],
      ['undefined', undefined],
    ])('throws on invalid value: %s', (_label, value) => {
      expect(() => timerFontSizeSchema.parse(value)).toThrow();
    });
  });

  describe('accentColorSchema', () => {
    it.each(['indigo', 'amber', 'teal', 'rose', 'green'])('accepts valid value "%s"', (value) => {
      expect(accentColorSchema.parse(value)).toBe(value);
    });

    it.each([
      ['empty string', ''],
      ['unknown string', 'blue'],
      ['number', 1],
      ['null', null],
      ['undefined', undefined],
    ])('throws on invalid value: %s', (_label, value) => {
      expect(() => accentColorSchema.parse(value)).toThrow();
    });
  });

  describe('timerNumeralFontSchema', () => {
    it.each(['mono', 'sans'])('accepts valid value "%s"', (value) => {
      expect(timerNumeralFontSchema.parse(value)).toBe(value);
    });

    it.each([
      ['empty string', ''],
      ['unknown string', 'serif'],
      ['number', 0],
      ['null', null],
      ['undefined', undefined],
    ])('throws on invalid value: %s', (_label, value) => {
      expect(() => timerNumeralFontSchema.parse(value)).toThrow();
    });
  });
});
