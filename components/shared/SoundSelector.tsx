'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SOUND_IDS } from '@/lib/constants';
import type { SoundId } from '@/types/timer';

interface SoundSelectorProps {
  value: SoundId | null;
  onChange: (soundId: SoundId) => void;
  disabled?: boolean;
}

function capitalize(s: string): string {
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

export function SoundSelector({ value, onChange, disabled = false }: SoundSelectorProps) {
  const handleValueChange = (v: SoundId | null) => {
    if (v !== null) {
      onChange(v);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger aria-label="Sound">
        <SelectValue placeholder="Select a sound" />
      </SelectTrigger>
      <SelectContent>
        {SOUND_IDS.map((soundId) => (
          <SelectItem key={soundId} value={soundId}>
            {capitalize(soundId)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
