import { describe, expect, it } from 'vitest';

import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';

import { timerFormSchema } from './timerFormSchema';

const VALID = {
  name: 'My Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
};

describe('timerFormSchema', () => {
  describe('name', () => {
    it('accepts a non-empty name', () => {
      expect(timerFormSchema.safeParse(VALID).success).toBe(true);
    });

    it('rejects an empty name', () => {
      expect(timerFormSchema.safeParse({ ...VALID, name: '' }).success).toBe(false);
    });

    it('rejects a name that exceeds the maximum length', () => {
      expect(timerFormSchema.safeParse({ ...VALID, name: 'a'.repeat(TIMER_NAME_MAX_LENGTH + 1) }).success).toBe(false);
    });

    it('accepts a name exactly at the maximum length', () => {
      expect(timerFormSchema.safeParse({ ...VALID, name: 'a'.repeat(TIMER_NAME_MAX_LENGTH) }).success).toBe(true);
    });
  });

  describe('durationSeconds', () => {
    it('rejects zero duration', () => {
      expect(timerFormSchema.safeParse({ ...VALID, durationSeconds: 0 }).success).toBe(false);
    });

    it('rejects negative duration', () => {
      expect(timerFormSchema.safeParse({ ...VALID, durationSeconds: -1 }).success).toBe(false);
    });

    it('accepts duration of 1', () => {
      expect(timerFormSchema.safeParse({ ...VALID, durationSeconds: 1 }).success).toBe(true);
    });
  });

  describe('soundId', () => {
    it('accepts null soundId', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundId: null }).success).toBe(true);
    });

    it('accepts a valid soundId', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundId: 'bell' }).success).toBe(true);
    });

    it('rejects an unknown soundId', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundId: 'unknown' }).success).toBe(false);
    });
  });

  describe('soundRepeat', () => {
    it('rejects soundRepeat of 0', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundRepeat: 0 }).success).toBe(false);
    });

    it('rejects soundRepeat of 6', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundRepeat: 6 }).success).toBe(false);
    });

    it('accepts soundRepeat of 5', () => {
      expect(timerFormSchema.safeParse({ ...VALID, soundRepeat: 5 }).success).toBe(true);
    });
  });

  describe('notifyMode', () => {
    it('accepts "hidden"', () => {
      expect(timerFormSchema.safeParse({ ...VALID, notifyMode: 'hidden' }).success).toBe(true);
    });

    it('accepts "always"', () => {
      expect(timerFormSchema.safeParse({ ...VALID, notifyMode: 'always' }).success).toBe(true);
    });

    it('rejects an unknown notifyMode', () => {
      expect(timerFormSchema.safeParse({ ...VALID, notifyMode: 'never' }).success).toBe(false);
    });
  });
});
