'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Bell, Check, EyeOff, Hash, MessageSquareText, Play, Sun, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DurationInput } from '@/components/shared/DurationInput';
import { SoundSelector } from '@/components/shared/SoundSelector';
import { useAudio } from '@/hooks/useAudio';
import { NOTIFY_MODES, SOUND_IDS, SOUND_REPEAT_MAX, SOUND_REPEAT_MIN, TIMER_NAME_MAX_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { NotifyMode, SoundId } from '@/types/timer';

export interface TimerFormValues {
  name: string;
  durationSeconds: number;
  flash: boolean;
  sound: boolean;
  soundId: SoundId | null;
  soundRepeat: number;
  countUp: boolean;
  hideName: boolean;
  notify: boolean;
  notifyMode: NotifyMode;
}

interface TimerFormProps {
  initialValues?: Partial<TimerFormValues>;
  onSubmit: (values: TimerFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const alertCardClass = (active: boolean) =>
  cn('flex flex-col gap-0 rounded-lg border p-3 transition-colors', active && 'bg-acc-softer ring-acc-ring ring-1');

const alertCardRowClass = 'flex items-center justify-between gap-4';

const iconClass = (active: boolean) =>
  cn('size-4 shrink-0 transition-colors', active ? 'text-acc' : 'text-muted-foreground');

export function TimerForm({ initialValues, onSubmit, onCancel, onDirtyChange }: TimerFormProps) {
  const uid = useId();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [durationSeconds, setDurationSeconds] = useState(initialValues?.durationSeconds ?? 0);
  const [flash, setFlash] = useState(initialValues?.flash ?? false);
  const [sound, setSound] = useState(initialValues?.sound ?? false);
  const [soundId, setSoundId] = useState<SoundId | null>(initialValues?.soundId ?? null);
  const [soundRepeat, setSoundRepeat] = useState(initialValues?.soundRepeat ?? 1);
  const [countUp, setCountUp] = useState(initialValues?.countUp ?? false);
  const [hideName, setHideName] = useState(initialValues?.hideName ?? false);
  const [notify, setNotify] = useState(initialValues?.notify ?? false);
  const [notifyMode, setNotifyMode] = useState<NotifyMode>(initialValues?.notifyMode ?? 'hidden');

  const { prime, play } = useAudio();

  const isDirty =
    name !== (initialValues?.name ?? '') ||
    durationSeconds !== (initialValues?.durationSeconds ?? 0) ||
    flash !== (initialValues?.flash ?? false) ||
    sound !== (initialValues?.sound ?? false) ||
    soundId !== (initialValues?.soundId ?? null) ||
    soundRepeat !== (initialValues?.soundRepeat ?? 1) ||
    countUp !== (initialValues?.countUp ?? false) ||
    hideName !== (initialValues?.hideName ?? false) ||
    notify !== (initialValues?.notify ?? false) ||
    notifyMode !== (initialValues?.notifyMode ?? 'hidden');

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
    onSubmit({
      name: name.trim(),
      durationSeconds,
      flash,
      sound,
      soundId,
      soundRepeat,
      countUp,
      hideName,
      notify,
      notifyMode,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-name`} className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Name
        </Label>
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
        <Label className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Duration</Label>
        <DurationInput value={durationSeconds} onChange={setDurationSeconds} />
      </div>

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">Alerts</legend>

        {/* Flash */}
        <div className={alertCardClass(flash)} data-testid="alert-card-flash">
          <div className={alertCardRowClass}>
            <div className="flex items-center gap-3">
              <Sun className={iconClass(flash)} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${uid}-flash`} className="cursor-pointer font-medium">
                  Flash Screen
                </Label>
                <p className="text-muted-foreground text-xs">Flash the screen for 3 seconds</p>
              </div>
            </div>
            <Switch id={`${uid}-flash`} checked={flash} onCheckedChange={setFlash} />
          </div>
        </div>

        {/* Sound */}
        <div className={alertCardClass(sound)} data-testid="alert-card-sound">
          <div className={alertCardRowClass}>
            <div className="flex items-center gap-3">
              <Bell className={iconClass(sound)} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${uid}-sound`} className="cursor-pointer font-medium">
                  Play Sound
                </Label>
                <p className="text-muted-foreground text-xs">Repeat an alert tone</p>
              </div>
            </div>
            <Switch id={`${uid}-sound`} checked={sound} onCheckedChange={handleSoundChange} />
          </div>
          {sound ? (
            <div className="mt-3 ml-7 flex flex-col gap-2">
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
                    {Array.from(
                      { length: SOUND_REPEAT_MAX - SOUND_REPEAT_MIN + 1 },
                      (_, i) => i + SOUND_REPEAT_MIN,
                    ).map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        {/* Count up */}
        <div className={alertCardClass(countUp)} data-testid="alert-card-countup">
          <div className={alertCardRowClass}>
            <div className="flex items-center gap-3">
              <Hash className={iconClass(countUp)} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${uid}-countup`} className="cursor-pointer font-medium">
                  Count Up
                </Label>
                <p className="text-muted-foreground text-xs">Count time since the timer ended</p>
              </div>
            </div>
            <Switch id={`${uid}-countup`} checked={countUp} onCheckedChange={setCountUp} />
          </div>
        </div>

        {/* System notification */}
        <div className={alertCardClass(notify)} data-testid="alert-card-notify">
          <div className={alertCardRowClass}>
            <div className="flex items-center gap-3">
              <MessageSquareText className={iconClass(notify)} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${uid}-notify`} className="cursor-pointer font-medium">
                  System Notification
                </Label>
                <p className="text-muted-foreground text-xs">Alert even in the background</p>
              </div>
            </div>
            <Switch id={`${uid}-notify`} checked={notify} onCheckedChange={setNotify} />
          </div>
          {notify ? (
            <div className="mt-3 ml-7 flex flex-col gap-2">
              <Label className="text-muted-foreground text-sm">When to notify</Label>
              <Select
                value={notifyMode}
                onValueChange={(v) => {
                  if (v === 'always' || v === 'hidden') {
                    setNotifyMode(v);
                  }
                }}
              >
                <SelectTrigger aria-label="Notification mode" className="w-full">
                  <span className="flex-1 truncate text-left">{NOTIFY_MODES[notifyMode]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">{NOTIFY_MODES.hidden}</SelectItem>
                  <SelectItem value="always">{NOTIFY_MODES.always}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
          Other Settings
        </legend>

        <div className={alertCardClass(hideName)} data-testid="alert-card-hidename">
          <div className={alertCardRowClass}>
            <div className="flex items-center gap-3">
              <EyeOff className={iconClass(hideName)} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${uid}-hidename`} className="cursor-pointer font-medium">
                  Hide timer name on timer page
                </Label>
                <p className="text-muted-foreground text-xs">Distraction-free countdown</p>
              </div>
            </div>
            <Switch id={`${uid}-hidename`} checked={hideName} onCheckedChange={setHideName} />
          </div>
        </div>
      </fieldset>

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
