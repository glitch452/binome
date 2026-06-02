'use client';

import { useCallback, useId, useState } from 'react';
import { Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DurationInput } from '@/components/shared/DurationInput';
import { SoundSelector } from '@/components/shared/SoundSelector';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_IDS, TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import type { SoundId } from '@/types/timer';

export interface TimerFormValues {
  name: string;
  durationSeconds: number;
  flash: boolean;
  sound: boolean;
  soundId: SoundId | null;
  countUp: boolean;
  hideName: boolean;
}

interface TimerFormProps {
  initialValues?: Partial<TimerFormValues>;
  onSubmit: (values: TimerFormValues) => void;
  onCancel: () => void;
}

export function TimerForm({ initialValues, onSubmit, onCancel }: TimerFormProps) {
  const uid = useId();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [durationSeconds, setDurationSeconds] = useState(initialValues?.durationSeconds ?? 0);
  const [flash, setFlash] = useState(initialValues?.flash ?? false);
  const [sound, setSound] = useState(initialValues?.sound ?? false);
  const [soundId, setSoundId] = useState<SoundId | null>(initialValues?.soundId ?? null);
  const [countUp, setCountUp] = useState(initialValues?.countUp ?? false);
  const [hideName, setHideName] = useState(initialValues?.hideName ?? false);

  const { prime, play } = useAudio();

  const isValid = name.trim().length > 0 && name.length <= TIMER_NAME_MAX_LENGTH && durationSeconds > 0;

  const handleSoundChange = (checked: boolean) => {
    setSound(checked);
    if (checked && soundId === null) {
      setSoundId(SOUND_IDS[0]);
    }
    if (!checked) {
      setSoundId(null);
    }
  };

  const handlePreview = useCallback(() => {
    if (!soundId) {
      return;
    }
    prime();
    play(soundId);
  }, [soundId, prime, play]);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isValid) {
      return;
    }
    onSubmit({ name: name.trim(), durationSeconds, flash, sound, soundId, countUp, hideName });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-name`}>Name</Label>
        <Input
          id={`${uid}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Timer name"
          maxLength={TIMER_NAME_MAX_LENGTH}
          aria-label="Timer name"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Duration</Label>
        <DurationInput value={durationSeconds} onChange={setDurationSeconds} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`${uid}-flash`} checked={flash} onCheckedChange={setFlash} />
        <Label htmlFor={`${uid}-flash`}>Flash on expiry</Label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id={`${uid}-sound`} checked={sound} onCheckedChange={handleSoundChange} />
          <Label htmlFor={`${uid}-sound`}>Sound on expiry</Label>
        </div>
        {sound ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SoundSelector value={soundId} onChange={setSoundId} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePreview}
              aria-label="Preview sound"
              disabled={!soundId}
            >
              <Play />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`${uid}-countup`} checked={countUp} onCheckedChange={setCountUp} />
        <Label htmlFor={`${uid}-countup`}>Count up after expiry</Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`${uid}-hidename`} checked={hideName} onCheckedChange={setHideName} />
        <Label htmlFor={`${uid}-hidename`}>Hide timer name on timer page</Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
