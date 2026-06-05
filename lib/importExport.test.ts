import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildExportObject, parseImportContent } from './importExport';

const VALID_TIMER = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5',
  name: 'Tea',
  durationSeconds: 180,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Fails `timerConfigSchema` — empty name. */
const INVALID_TIMER = { name: '', durationSeconds: 60 };

describe('importExport', () => {
  // -------------------------------------------------------------------------
  // buildExportObject
  // -------------------------------------------------------------------------

  describe('buildExportObject', () => {
    it('wraps the timer list under a timers key', () => {
      expect(buildExportObject([VALID_TIMER]).timers).toStrictEqual([VALID_TIMER]);
    });

    it('wraps an empty list correctly', () => {
      expect(buildExportObject([]).timers).toStrictEqual([]);
    });

    it('preserves timer ids through a JSON round-trip', () => {
      const roundTripped = JSON.parse(JSON.stringify(buildExportObject([VALID_TIMER]))) as {
        timers: { id: string }[];
      };
      expect(roundTripped.timers[0]?.id).toBe(VALID_TIMER.id);
    });

    it('preserves all timers through a JSON round-trip', () => {
      const second = { ...VALID_TIMER, id: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6', name: 'Coffee' };
      const roundTripped = JSON.parse(JSON.stringify(buildExportObject([VALID_TIMER, second]))) as {
        timers: unknown[];
      };
      expect(roundTripped.timers).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // parseImportContent
  // -------------------------------------------------------------------------

  describe('parseImportContent', () => {
    // parseTimerList calls console.error for each invalid timer; suppress the noise.
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('JSON stage', () => {
      it('returns reason: json for a syntax error', () => {
        expect(parseImportContent('not json {')).toMatchObject({ ok: false, reason: 'json' });
      });

      it('returns reason: json for an empty string', () => {
        expect(parseImportContent('')).toMatchObject({ ok: false, reason: 'json' });
      });
    });

    describe('envelope stage', () => {
      it('returns reason: shape when the parsed value is not an object', () => {
        expect(parseImportContent(JSON.stringify([]))).toMatchObject({ ok: false, reason: 'shape' });
      });

      it('returns reason: shape when the timers key is missing', () => {
        expect(parseImportContent(JSON.stringify({ other: [] }))).toMatchObject({ ok: false, reason: 'shape' });
      });

      it('returns reason: shape when timers is not an array', () => {
        expect(parseImportContent(JSON.stringify({ timers: 'oops' }))).toMatchObject({ ok: false, reason: 'shape' });
      });

      it('returns reason: shape when timers is null', () => {
        expect(parseImportContent(JSON.stringify({ timers: null }))).toMatchObject({ ok: false, reason: 'shape' });
      });

      it('tolerates unknown sibling keys in the envelope', () => {
        const content = JSON.stringify({ timers: [VALID_TIMER], schemaVersion: 1, extra: 'metadata' });
        expect(parseImportContent(content)).toMatchObject({ ok: true });
      });
    });

    describe('timer-parsing stage', () => {
      it('returns reason: empty when all timers fail validation', () => {
        expect(parseImportContent(JSON.stringify({ timers: [INVALID_TIMER] }))).toMatchObject({
          ok: false,
          reason: 'empty',
        });
      });

      it('returns reason: empty for an empty timers array', () => {
        expect(parseImportContent(JSON.stringify({ timers: [] }))).toMatchObject({ ok: false, reason: 'empty' });
      });

      it('returns ok: true when at least one timer is valid', () => {
        expect(parseImportContent(JSON.stringify({ timers: [VALID_TIMER] }))).toMatchObject({ ok: true });
      });

      it('returns the valid timers', () => {
        const result = parseImportContent(JSON.stringify({ timers: [VALID_TIMER] }));
        expect(result).toMatchObject({
          ok: true,
          timers: [expect.objectContaining({ id: VALID_TIMER.id })],
        });
      });

      it('returns droppedCount: 0 when all timers are valid', () => {
        expect(parseImportContent(JSON.stringify({ timers: [VALID_TIMER] }))).toMatchObject({
          ok: true,
          droppedCount: 0,
        });
      });

      it('counts dropped timers correctly', () => {
        const content = JSON.stringify({ timers: [VALID_TIMER, INVALID_TIMER] });
        expect(parseImportContent(content)).toMatchObject({ ok: true, droppedCount: 1 });
      });

      it('includes only valid timers in the result', () => {
        const content = JSON.stringify({ timers: [VALID_TIMER, INVALID_TIMER] });
        const result = parseImportContent(content);
        expect(result).toMatchObject({
          ok: true,
          timers: [expect.objectContaining({ id: VALID_TIMER.id })],
        });
      });
    });
  });
});
