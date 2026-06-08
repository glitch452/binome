import type { AccentColor, NotifyMode, SoundId, ThemePreference, TimerFontSize, TimerNumeralFont } from '@/types/timer';

export const STORAGE_KEY_TIMERS = 'countdown_timers';
export const STORAGE_KEY_THEME = 'countdown_theme';
export const STORAGE_KEY_TIMER_FONT_SIZE = 'countdown_timer_font_size';
export const STORAGE_KEY_ACCENT = 'countdown_accent';
export const STORAGE_KEY_TIMER_NUMERAL_FONT = 'countdown_timer_numeral_font';

export const SOUND_IDS = ['bell', 'beep', 'chime', 'buzzer', 'ding'] as const satisfies readonly SoundId[];

export const SOUND_PATHS: Readonly<Record<SoundId, string>> = {
  bell: '/sounds/bell.wav',
  beep: '/sounds/beep.wav',
  chime: '/sounds/chime.wav',
  buzzer: '/sounds/buzzer.wav',
  ding: '/sounds/ding.wav',
};

export const BUILD_INFO_URL = '/build-info.json';
export const UPDATE_POLL_INTERVAL_MS = 3_600_000;

export const TIMER_NAME_MAX_LENGTH = 64;

export const FLASH_FREQUENCY_HZ = 2;
export const FLASH_DURATION_MS = 3_000;

export const SOUND_REPEAT_MIN = 1;
export const SOUND_REPEAT_MAX = 5;
export const SOUND_REPEAT_INTERVAL_MS = 750;

export const NOTIFY_MODE_IDS = ['always', 'hidden'] as const satisfies readonly NotifyMode[];

export const NOTIFY_MODES: Readonly<Record<NotifyMode, string>> = {
  hidden: 'Only when the app is in the background',
  always: 'Always',
};

export const THEME_PREFERENCE_IDS = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[];
export const TIMER_FONT_SIZE_IDS = ['sm', 'md', 'lg', 'xl'] as const satisfies readonly TimerFontSize[];
export const NUMERAL_FONT_IDS = ['mono', 'sans'] as const satisfies readonly TimerNumeralFont[];

export const ACCENT_IDS = ['indigo', 'amber', 'teal', 'rose', 'green'] as const satisfies readonly AccentColor[];
export const DEFAULT_ACCENT: AccentColor = 'indigo';

export const ACCENTS: Readonly<Record<AccentColor, { hex: string; label: string }>> = {
  indigo: { hex: '#4f46e5', label: 'Indigo' },
  amber: { hex: '#d97706', label: 'Amber' },
  teal: { hex: '#0d9488', label: 'Teal' },
  rose: { hex: '#e11d48', label: 'Rose' },
  green: { hex: '#16a34a', label: 'Green' },
};

export const NUMERAL_FONTS: Readonly<Record<TimerNumeralFont, string>> = {
  mono: 'Mono',
  sans: 'Sans',
};
export const DEFAULT_TIMER_NUMERAL_FONT: TimerNumeralFont = 'mono';
