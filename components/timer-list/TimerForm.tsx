'use client';

import { useCallback, useId, useState } from 'react';
import { Bell, Check, EyeOff, Hash, Play, Sun, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DurationInput } from '@/components/shared/DurationInput';
import { SoundSelector } from '@/components/shared/SoundSelector';
import { useAudio } from '@/hooks/useAudio';
import { SOUND_IDS, SOUND_REPEAT_MAX, SOUND_REPEAT_MIN, TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import type { SoundId } from '@/types/timer';

export interface TimerFormValues {
  name: string;
  durationSeconds: number;
  flash: boolean;
  sound: boolean;
  soundId: SoundId | null;
  soundRepeat: number;
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
  const [soundRepeat, setSoundRepeat] = useState(initialValues?.soundRepeat ?? 1);
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
    onSubmit({ name: name.trim(), durationSeconds, flash, sound, soundId, soundRepeat, countUp, hideName });
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

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${uid}-flash`} className="flex items-center gap-1.5">
          <Sun className="size-4" aria-hidden="true" />
          Flash on expiry
        </Label>
        <Switch id={`${uid}-flash`} checked={flash} onCheckedChange={setFlash} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`${uid}-sound`} className="flex items-center gap-1.5">
            <Bell className="size-4" aria-hidden="true" />
            Sound on expiry
          </Label>
          <Switch id={`${uid}-sound`} checked={sound} onCheckedChange={handleSoundChange} />
        </div>
        {sound ? (
          <div className="border-border ml-2 flex flex-col gap-2 border-l-2 pl-4">
            <div className="flex items-center gap-2">
              <SoundSelector value={soundId} onChange={setSoundId} />
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
            <div className="flex items-center gap-2">
              <Label htmlFor={`${uid}-soundrepeat`} className="shrink-0">
                Repeat
              </Label>
              <Select value={soundRepeat} onValueChange={(v) => setSoundRepeat(parseInt(String(v), 10))}>
                <SelectTrigger id={`${uid}-soundrepeat`} aria-label="Sound repeat count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: SOUND_REPEAT_MAX - SOUND_REPEAT_MIN + 1 }, (_, i) => i + SOUND_REPEAT_MIN).map(
                    (n) => (
                      <SelectItem key={n} value={n}>
                        {n}×
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${uid}-countup`} className="flex items-center gap-1.5">
          <Hash className="size-4" aria-hidden="true" />
          Count up after expiry
        </Label>
        <Switch id={`${uid}-countup`} checked={countUp} onCheckedChange={setCountUp} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${uid}-hidename`} className="flex items-center gap-1.5">
          <EyeOff className="size-4" aria-hidden="true" />
          Hide timer name on timer page
        </Label>
        <Switch id={`${uid}-hidename`} checked={hideName} onCheckedChange={setHideName} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid}>
          <Check />
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X />
          Cancel
        </Button>
      </div>
    </form>
  );
}
