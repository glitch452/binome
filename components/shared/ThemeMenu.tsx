'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';

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
import { useAccent } from '@/hooks/useAccent';
import { useTheme } from '@/hooks/useTheme';
import { ACCENTS, ACCENT_IDS } from '@/lib/constants';
import { accentColorSchema, themePreferenceSchema } from '@/lib/preferencesSchema';
import { cn } from '@/lib/utils';
import type { ThemePreference } from '@/types/timer';

const THEME_ICONS: Record<ThemePreference, React.ReactElement> = {
  light: <Sun data-testid="icon-sun" aria-hidden="true" />,
  dark: <Moon data-testid="icon-moon" aria-hidden="true" />,
  system: <Monitor data-testid="icon-monitor" aria-hidden="true" />,
};

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeMenu() {
  const { preference, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <MenuRoot>
      <MenuTrigger
        render={
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            aria-label="Theme and accent settings"
          >
            {THEME_ICONS[preference]}
          </button>
        }
      />
      <MenuPortal>
        <MenuPositioner sideOffset={8} align="end">
          <MenuPopup>
            <MenuGroup>
              <MenuGroupLabel>Mode</MenuGroupLabel>
              <MenuRadioGroup
                value={preference}
                onValueChange={(v) => {
                  const parsed = themePreferenceSchema.safeParse(v);
                  if (parsed.success) {
                    setTheme(parsed.data);
                  }
                }}
              >
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <MenuRadioItem key={mode} value={mode}>
                    {THEME_ICONS[mode]}
                    {THEME_LABELS[mode]}
                    <MenuRadioItemIndicator>
                      <Check />
                    </MenuRadioItemIndicator>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Accent</MenuGroupLabel>
              <MenuRadioGroup
                value={accent}
                onValueChange={(v) => {
                  const parsed = accentColorSchema.safeParse(v);
                  if (parsed.success) {
                    setAccent(parsed.data);
                  }
                }}
              >
                {ACCENT_IDS.map((id) => (
                  <MenuRadioItem key={id} value={id}>
                    <span
                      className="size-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: ACCENTS[id].hex }}
                      aria-hidden="true"
                    />
                    {ACCENTS[id].label}
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
