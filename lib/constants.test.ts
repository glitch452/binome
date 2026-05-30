import { describe, expect, it } from 'vitest';

import {
  FLASH_DURATION_MS,
  FLASH_FREQUENCY_HZ,
  SOUND_IDS,
  SOUND_PATHS,
  STORAGE_KEY_THEME,
  STORAGE_KEY_TIMERS,
  TIMER_NAME_MAX_LENGTH,
} from './constants';

describe('constants', () => {
  describe('storage keys', () => {
    it('STORAGE_KEY_TIMERS equals countdown_timers', () => {
      expect(STORAGE_KEY_TIMERS).toBe('countdown_timers');
    });

    it('STORAGE_KEY_THEME equals countdown_theme', () => {
      expect(STORAGE_KEY_THEME).toBe('countdown_theme');
    });
  });

  describe('SOUND_IDS', () => {
    it('contains exactly 5 entries', () => {
      expect(SOUND_IDS).toHaveLength(5);
    });

    it.each(['bell', 'beep', 'chime', 'buzzer', 'ding'] as const)('includes %s', (id) => {
      expect(SOUND_IDS).toContain(id);
    });
  });

  describe('SOUND_PATHS', () => {
    it('has a /sounds/*.wav path for every sound ID', () => {
      for (const id of SOUND_IDS) {
        expect(SOUND_PATHS[id]).toMatch(/^\/sounds\/.+\.wav$/);
      }
    });
  });

  describe('TIMER_NAME_MAX_LENGTH', () => {
    it('is 64', () => {
      expect(TIMER_NAME_MAX_LENGTH).toBe(64);
    });
  });

  describe('flash params', () => {
    it('FLASH_FREQUENCY_HZ is 2', () => {
      expect(FLASH_FREQUENCY_HZ).toBe(2);
    });

    it('FLASH_DURATION_MS is 3000', () => {
      expect(FLASH_DURATION_MS).toBe(3_000);
    });
  });
});
