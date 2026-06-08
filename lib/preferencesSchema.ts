import { z } from 'zod';

import { ACCENT_IDS, NUMERAL_FONT_IDS, THEME_PREFERENCE_IDS, TIMER_FONT_SIZE_IDS } from '@/lib/constants';

export const themePreferenceSchema = z.enum(THEME_PREFERENCE_IDS);
export const timerFontSizeSchema = z.enum(TIMER_FONT_SIZE_IDS);
export const accentColorSchema = z.enum(ACCENT_IDS);
export const timerNumeralFontSchema = z.enum(NUMERAL_FONT_IDS);
