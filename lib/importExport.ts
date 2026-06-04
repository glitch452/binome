import { z } from 'zod';

import { parseTimerList } from '@/lib/timerSchema';
import type { TimerConfig } from '@/types/timer';

/** Filename used when exporting the timer library. */
export const EXPORT_FILE_NAME = 'binome.json';

/**
 * Envelope schema — confirms a top-level object with a `timers` array.
 *
 * Per-timer validation is intentionally deferred to the lenient `parseTimerList`
 * so one bad timer does not reject the whole file. `.loose()` preserves any
 * future sibling keys (e.g. `schemaVersion`) instead of stripping them.
 */
export const exportFileSchema = z.object({ timers: z.array(z.unknown()) }).loose();

/**
 * Wraps a timer list in the export envelope `{ timers }`.
 * @param timers
 */
export function buildExportObject(timers: TimerConfig[]): { timers: TimerConfig[] } {
  return { timers };
}

/** Discriminated result returned by `parseImportContent`. */
export type ImportParseResult =
  | { ok: true; timers: TimerConfig[]; droppedCount: number }
  | { ok: false; reason: 'json' | 'shape' | 'empty' };

/**
 * Parses the raw text content of a Binome export file.
 *
 * Processing stages (first failure terminates and returns `ok: false`):
 * 1. **JSON.parse** — `reason: 'json'` on a syntax error.
 * 2. **Envelope validation** (`exportFileSchema`) — `reason: 'shape'` when the
 *    parsed value is not an object containing a `timers` array.
 * 3. **Per-timer parsing** (`parseTimerList`) — `reason: 'empty'` when no timers
 *    survive; otherwise `ok: true` with `timers` and `droppedCount`.
 *
 * `droppedCount` equals the number of array entries that failed `timerConfigSchema`.
 * The caller owns all toast / UI copy; this function only returns structured data.
 * @param text
 */
export function parseImportContent(text: string): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'json' };
  }

  const envelope = exportFileSchema.safeParse(parsed);
  if (!envelope.success) {
    return { ok: false, reason: 'shape' };
  }

  const valid = parseTimerList(envelope.data.timers);
  if (valid.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  return {
    ok: true,
    timers: valid,
    droppedCount: envelope.data.timers.length - valid.length,
  };
}
