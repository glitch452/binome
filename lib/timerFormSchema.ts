import { z } from 'zod';

import { NOTIFY_MODE_IDS, SOUND_IDS, SOUND_REPEAT_MAX, SOUND_REPEAT_MIN, TIMER_NAME_MAX_LENGTH } from '@/lib/constants';

export const timerFormSchema = z.object({
  name: z.string().min(1).max(TIMER_NAME_MAX_LENGTH),
  durationSeconds: z.number().int().min(1),
  flash: z.boolean(),
  sound: z.boolean(),
  soundId: z.enum(SOUND_IDS).nullable(),
  soundRepeat: z.number().int().min(SOUND_REPEAT_MIN).max(SOUND_REPEAT_MAX),
  countUp: z.boolean(),
  hideName: z.boolean(),
  notify: z.boolean(),
  notifyMode: z.enum(NOTIFY_MODE_IDS),
});

export type TimerFormValues = z.infer<typeof timerFormSchema>;
