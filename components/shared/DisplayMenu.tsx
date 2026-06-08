'use client';

import { Check } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { useTimerFontSize } from '@/hooks/useTimerFontSize';
import { useTimerNumeralFont } from '@/hooks/useTimerNumeralFont';
import { NUMERAL_FONTS, NUMERAL_FONT_IDS, TIMER_FONT_SIZE_IDS } from '@/lib/constants';
import { timerFontSizeSchema, timerNumeralFontSchema } from '@/lib/preferencesSchema';
import { cn } from '@/lib/utils';
import type { TimerFontSize } from '@/types/timer';

const FONT_SIZE_LABELS: Record<TimerFontSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra large',
};

export function DisplayMenu() {
  const { fontSize, setFontSize } = useTimerFontSize();
  const { numeralFont, setNumeralFont } = useTimerNumeralFont();

  return (
    <MenuRoot>
      <MenuTrigger
        render={
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
            aria-label="Countdown display settings"
          >
            <span className="font-mono text-sm font-bold" aria-hidden="true">
              A
            </span>
          </button>
        }
      />
      <MenuPortal>
        <MenuPositioner sideOffset={8} align="end">
          <MenuPopup>
            <MenuGroup>
              <MenuGroupLabel>Size</MenuGroupLabel>
              <MenuRadioGroup
                value={fontSize}
                onValueChange={(v) => {
                  const parsed = timerFontSizeSchema.safeParse(v);
                  if (parsed.success) {
                    setFontSize(parsed.data);
                  }
                }}
              >
                {TIMER_FONT_SIZE_IDS.map((size) => (
                  <MenuRadioItem key={size} value={size}>
                    {FONT_SIZE_LABELS[size]}
                    <MenuRadioItemIndicator>
                      <Check />
                    </MenuRadioItemIndicator>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Numerals</MenuGroupLabel>
              <MenuRadioGroup
                value={numeralFont}
                onValueChange={(v) => {
                  const parsed = timerNumeralFontSchema.safeParse(v);
                  if (parsed.success) {
                    setNumeralFont(parsed.data);
                  }
                }}
              >
                {NUMERAL_FONT_IDS.map((font) => (
                  <MenuRadioItem key={font} value={font}>
                    {NUMERAL_FONTS[font]}
                    <MenuRadioItemIndicator>
                      <Check />
                    </MenuRadioItemIndicator>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
          </MenuPopup>
        </MenuPositioner>
      </MenuPortal>
    </MenuRoot>
  );
}
