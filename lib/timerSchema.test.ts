import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';

import { parseTimerList, timerConfigSchema } from './timerSchema';

// ---------------------------------------------------------------------------
// Minimal valid inputs
// ---------------------------------------------------------------------------

/** The absolute minimum valid timer record — only required fields. */
const MINIMAL_VALID = {
  name: 'Morning Stretch',
  durationSeconds: 30,
};

/** A fully-populated valid timer record (all fields explicitly set). */
const FULL_VALID = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5',
  name: 'Full Timer',
  durationSeconds: 60,
  flash: true,
  sound: true,
  soundId: 'bell' as const,
  countUp: true,
  hideName: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------

describe('timerSchema', () => {
  // -------------------------------------------------------------------------
  // timerConfigSchema
  // -------------------------------------------------------------------------

  describe('timerConfigSchema', () => {
    describe('required fields', () => {
      it('accepts a fully-populated valid record', () => {
        expect(timerConfigSchema.safeParse(FULL_VALID).success).toBe(true);
      });

      it('accepts a record with only the required fields', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).success).toBe(true);
      });

      it('rejects a missing name', () => {
        const { name: _, ...rest } = FULL_VALID;
        expect(timerConfigSchema.safeParse(rest).success).toBe(false);
      });

      it('rejects an empty name', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, name: '' }).success).toBe(false);
      });

      it('rejects a name that exceeds the maximum length', () => {
        const longName = 'a'.repeat(TIMER_NAME_MAX_LENGTH + 1);
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, name: longName }).success).toBe(false);
      });

      it('rejects a missing durationSeconds', () => {
        const { durationSeconds: _, ...rest } = FULL_VALID;
        expect(timerConfigSchema.safeParse(rest).success).toBe(false);
      });

      it('rejects durationSeconds of zero', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, durationSeconds: 0 }).success).toBe(false);
      });

      it('rejects negative durationSeconds', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, durationSeconds: -10 }).success).toBe(false);
      });

      it('rejects a non-integer durationSeconds', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, durationSeconds: 1.5 }).success).toBe(false);
      });
    });

    describe('optional fields — defaults when absent', () => {
      it('parses successfully when only required fields are present', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).success).toBe(true);
      });

      it('generates a UUID id when id is absent', () => {
        const result = timerConfigSchema.safeParse(MINIMAL_VALID);
        expect(result.data?.id).toMatch(UUID_RE);
      });

      it('defaults flash to false', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.flash).toBe(false);
      });

      it('defaults sound to false', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.sound).toBe(false);
      });

      it('defaults soundId to null', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.soundId).toBeNull();
      });

      it('defaults countUp to false', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.countUp).toBe(false);
      });

      it('defaults hideName to false', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.hideName).toBe(false);
      });

      it('defaults createdAt to an ISO 8601 string', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('defaults updatedAt to an ISO 8601 string', () => {
        expect(timerConfigSchema.safeParse(MINIMAL_VALID).data?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('optional fields — invalid values cause rejection', () => {
      it('rejects an id that is not a UUID', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, id: 'not-a-uuid' }).success).toBe(false);
      });

      it('rejects a non-boolean flash', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, flash: 'true' }).success).toBe(false);
      });

      it('rejects a non-boolean sound', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, sound: 1 }).success).toBe(false);
      });

      it('rejects an unknown soundId string', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, soundId: 'triangle' }).success).toBe(false);
      });

      it('accepts soundId: null', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, soundId: null }).success).toBe(true);
      });

      it.each(['bell', 'beep', 'chime', 'buzzer', 'ding'])('accepts soundId: %s', (soundId) => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, soundId }).success).toBe(true);
      });

      it('rejects a non-boolean countUp', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, countUp: 0 }).success).toBe(false);
      });

      it('rejects a non-boolean hideName', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, hideName: null }).success).toBe(false);
      });

      it('rejects an invalid createdAt string', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, createdAt: 'not-a-date' }).success).toBe(false);
      });

      it('rejects an invalid updatedAt string', () => {
        expect(timerConfigSchema.safeParse({ ...FULL_VALID, updatedAt: '2024-01-01' }).success).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------------
  // parseTimerList
  // -------------------------------------------------------------------------

  describe('parseTimerList', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('non-array input', () => {
      it('returns an empty array for null', () => {
        expect(parseTimerList(null)).toStrictEqual([]);
      });

      it('returns an empty array for a plain object', () => {
        expect(parseTimerList({ name: 'Oops', durationSeconds: 10 })).toStrictEqual([]);
      });

      it('returns an empty array for a string', () => {
        expect(parseTimerList('not-an-array')).toStrictEqual([]);
      });

      it('returns an empty array for undefined', () => {
        expect(parseTimerList(undefined)).toStrictEqual([]);
      });
    });

    describe('array input', () => {
      it('returns an empty array for an empty array', () => {
        expect(parseTimerList([])).toStrictEqual([]);
      });

      it('returns all timers when all items are valid', () => {
        expect(parseTimerList([FULL_VALID, { ...FULL_VALID, name: 'Second' }])).toHaveLength(2);
      });

      it('fills in defaults for a timer with only required fields', () => {
        expect(parseTimerList([MINIMAL_VALID])).toHaveLength(1);
      });

      it('defaults flash to false when the field is absent', () => {
        expect(parseTimerList([MINIMAL_VALID])[0]?.flash).toBe(false);
      });

      it('defaults soundId to null when the field is absent', () => {
        expect(parseTimerList([MINIMAL_VALID])[0]?.soundId).toBeNull();
      });

      it('drops items that fail validation', () => {
        const invalid = { name: '', durationSeconds: 60 }; // empty name
        expect(parseTimerList([invalid])).toHaveLength(0);
      });

      it('keeps valid items when mixed with invalid ones', () => {
        const invalid = { name: 'Bad', durationSeconds: -1 };
        expect(parseTimerList([FULL_VALID, invalid, { ...FULL_VALID, name: 'Good' }])).toHaveLength(2);
      });

      it('returns the names of the surviving valid timers in order', () => {
        const invalid = { name: 'Bad', durationSeconds: -1 };
        const result = parseTimerList([FULL_VALID, invalid, { ...FULL_VALID, name: 'Good' }]);
        expect(result.map((t) => t.name)).toStrictEqual(['Full Timer', 'Good']);
      });

      it('drops a timer whose optional field has an invalid type', () => {
        const badSound = { ...FULL_VALID, soundId: 'unknown-sound' };
        expect(parseTimerList([badSound])).toHaveLength(0);
      });

      it('preserves the id from a valid item', () => {
        expect(parseTimerList([FULL_VALID])[0]?.id).toBe(FULL_VALID.id);
      });

      it('preserves soundId from a valid item', () => {
        expect(parseTimerList([FULL_VALID])[0]?.soundId).toBe('bell');
      });

      it('preserves flash from a valid item', () => {
        expect(parseTimerList([FULL_VALID])[0]?.flash).toBe(true);
      });
    });

    describe('error logging', () => {
      it('logs a console.error when an item fails validation', () => {
        parseTimerList([{ name: '', durationSeconds: 60 }]);
        expect(console.error).toHaveBeenCalledOnce();
      });

      it('includes the Zod issues in the console.error call', () => {
        parseTimerList([{ name: '', durationSeconds: 60 }]);
        expect(console.error).toHaveBeenCalledWith(
          '[TimerStore] Dropping invalid timer from localStorage:',
          expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
        );
      });

      it('logs one error per invalid item', () => {
        const invalid1 = { name: '', durationSeconds: 60 };
        const invalid2 = { name: 'Bad', durationSeconds: -1 };
        parseTimerList([invalid1, FULL_VALID, invalid2]);
        expect(console.error).toHaveBeenCalledTimes(2);
      });

      it('does not log when all items are valid', () => {
        parseTimerList([FULL_VALID]);
        expect(console.error).not.toHaveBeenCalled();
      });

      it('does not log for an empty array', () => {
        parseTimerList([]);
        expect(console.error).not.toHaveBeenCalled();
      });
    });
  });
});
