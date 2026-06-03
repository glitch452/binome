import { z } from 'zod';

import { TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

/** Validates the stored sound identifier against the known set of sound IDs. */
export const soundIdSchema = z.enum(['bell', 'beep', 'chime', 'buzzer', 'ding']);

/**
 * Zod schema for a persisted TimerConfig.
 *
 * `name` and `durationSeconds` are the only required fields. All other fields
 * are optional; when absent they are filled with the same defaults used when
 * creating a new timer. Any field that is present but fails its validator causes
 * the entire timer record to be rejected — see `parseTimerList`.
 */
export const timerConfigSchema = z.object({
  id: z
    .uuid()
    .optional()
    .default(() => crypto.randomUUID()),
  name: z.string().min(1).max(TIMER_NAME_MAX_LENGTH),
  durationSeconds: z.number().int().positive(),
  flash: z.boolean().optional().default(false),
  sound: z.boolean().optional().default(false),
  soundId: soundIdSchema.nullable().optional().default(null),
  countUp: z.boolean().optional().default(false),
  hideName: z.boolean().optional().default(false),
  createdAt: z.iso
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
  updatedAt: z.iso
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
});

/**
 * Parses an unknown value (e.g. raw localStorage JSON) as a list of
 * `TimerConfig` objects, applying per-item Zod validation.
 *
 * - Non-array input → `[]`
 * - Each element that passes validation is included, with any missing optional
 *   fields filled in with defaults.
 * - Each element that fails validation is dropped and its Zod issues are logged
 *   via `console.error`; valid siblings are still returned.
 * @param raw
 */
export function parseTimerList(raw: unknown): TimerConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item: unknown) => {
    const result = timerConfigSchema.safeParse(item);
    if (result.success) {
      return [result.data];
    }
    console.error('[TimerStore] Dropping invalid timer from localStorage:', result.error.issues);
    return [];
  });
}
