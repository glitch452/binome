import type { SoundId } from '@/types/timer';

export const STORAGE_KEY_TIMERS = 'countdown_timers';
export const STORAGE_KEY_THEME = 'countdown_theme';

export const SOUND_IDS: readonly SoundId[] = ['bell', 'beep', 'chime', 'buzzer', 'ding'];

export const SOUND_PATHS: Readonly<Record<SoundId, string>> = {
  bell: '/sounds/bell.wav',
  beep: '/sounds/beep.wav',
  chime: '/sounds/chime.wav',
  buzzer: '/sounds/buzzer.wav',
  ding: '/sounds/ding.wav',
};

export const TIMER_NAME_MAX_LENGTH = 64;

export const FLASH_FREQUENCY_HZ = 2;
export const FLASH_DURATION_MS = 3_000;
