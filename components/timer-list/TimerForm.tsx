'use client';

import { useCallback, useEffect, useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { type TimerFormValues, timerFormSchema } from '@/lib/timerFormSchema';
import { cn } from '@/lib/utils';

export type { TimerFormValues };

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
  const { prime, play } = useAudio();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isDirty },
  } = useForm<TimerFormValues>({
    resolver: zodResolver(timerFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: initialValues?.name ?? '',
      durationSeconds: initialValues?.durationSeconds ?? 0,
      flash: initialValues?.flash ?? false,
      sound: initialValues?.sound ?? false,
      soundId: initialValues?.soundId ?? null,
      soundRepeat: initialValues?.soundRepeat ?? 1,
      countUp: initialValues?.countUp ?? false,
      hideName: initialValues?.hideName ?? false,
      notify: initialValues?.notify ?? false,
      notifyMode: initialValues?.notifyMode ?? 'hidden',
    },
  });

  const name = useWatch({ control, name: 'name' });
  const durationSeconds = useWatch({ control, name: 'durationSeconds' });
  const soundEnabled = useWatch({ control, name: 'sound' });
  const notifyEnabled = useWatch({ control, name: 'notify' });
  const soundId = useWatch({ control, name: 'soundId' });

  // Derive valid state the same way as before so the Save button is correctly
  // disabled on the initial render (before any RHF validation has run).
  const isValid = name.trim().length > 0 && name.length <= TIMER_NAME_MAX_LENGTH && durationSeconds > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handlePreview = useCallback(() => {
    if (!soundId) {
      return;
    }
    prime();
    play(soundId);
  }, [soundId, prime, play]);

  const handleFormSubmit = handleSubmit((values) => {
    onSubmit({ ...values, name: values.name.trim() });
  });

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${uid}-name`} className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Name
        </Label>
        <Input
          id={`${uid}-name`}
          type="text"
          placeholder="Timer name"
          maxLength={TIMER_NAME_MAX_LENGTH}
          aria-label="Timer name"
          {...register('name')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Duration</Label>
        <Controller
          name="durationSeconds"
          control={control}
          render={({ field }) => <DurationInput value={field.value} onChange={field.onChange} />}
        />
      </div>

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">Alerts</legend>

        {/* Flash */}
        <Controller
          name="flash"
          control={control}
          render={({ field }) => (
            <div className={alertCardClass(field.value)} data-testid="alert-card-flash">
              <div className={alertCardRowClass}>
                <div className="flex items-center gap-3">
                  <Sun className={iconClass(field.value)} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`${uid}-flash`} className="cursor-pointer font-medium">
                      Flash Screen
                    </Label>
                    <p className="text-muted-foreground text-xs">Flash the screen for 3 seconds</p>
                  </div>
                </div>
                <Switch id={`${uid}-flash`} checked={field.value} onCheckedChange={field.onChange} />
              </div>
            </div>
          )}
        />

        {/* Sound */}
        <Controller
          name="sound"
          control={control}
          render={({ field: soundField }) => (
            <div className={alertCardClass(soundField.value)} data-testid="alert-card-sound">
              <div className={alertCardRowClass}>
                <div className="flex items-center gap-3">
                  <Bell className={iconClass(soundField.value)} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`${uid}-sound`} className="cursor-pointer font-medium">
                      Play Sound
                    </Label>
                    <p className="text-muted-foreground text-xs">Repeat an alert tone</p>
                  </div>
                </div>
                <Switch
                  id={`${uid}-sound`}
                  checked={soundField.value}
                  onCheckedChange={(checked) => {
                    soundField.onChange(checked);
                    if (checked && !soundId) {
                      setValue('soundId', SOUND_IDS[0]);
                    }
                    if (!checked) {
                      setValue('soundId', null);
                    }
                  }}
                />
              </div>
              {soundEnabled ? (
                <div className="mt-3 ml-7 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="soundId"
                      control={control}
                      render={({ field }) => <SoundSelector value={field.value} onChange={field.onChange} />}
                    />
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
                    <Controller
                      name="soundRepeat"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(v) => field.onChange(parseInt(String(v), 10))}>
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
                      )}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        />

        {/* Count up */}
        <Controller
          name="countUp"
          control={control}
          render={({ field }) => (
            <div className={alertCardClass(field.value)} data-testid="alert-card-countup">
              <div className={alertCardRowClass}>
                <div className="flex items-center gap-3">
                  <Hash className={iconClass(field.value)} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`${uid}-countup`} className="cursor-pointer font-medium">
                      Count Up
                    </Label>
                    <p className="text-muted-foreground text-xs">Count time since the timer ended</p>
                  </div>
                </div>
                <Switch id={`${uid}-countup`} checked={field.value} onCheckedChange={field.onChange} />
              </div>
            </div>
          )}
        />

        {/* System notification */}
        <Controller
          name="notify"
          control={control}
          render={({ field: notifyField }) => (
            <div className={alertCardClass(notifyField.value)} data-testid="alert-card-notify">
              <div className={alertCardRowClass}>
                <div className="flex items-center gap-3">
                  <MessageSquareText className={iconClass(notifyField.value)} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`${uid}-notify`} className="cursor-pointer font-medium">
                      System Notification
                    </Label>
                    <p className="text-muted-foreground text-xs">Alert even in the background</p>
                  </div>
                </div>
                <Switch id={`${uid}-notify`} checked={notifyField.value} onCheckedChange={notifyField.onChange} />
              </div>
              {notifyEnabled ? (
                <div className="mt-3 ml-7 flex flex-col gap-2">
                  <Label className="text-muted-foreground text-sm">When to notify</Label>
                  <Controller
                    name="notifyMode"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          if (v === 'always' || v === 'hidden') {
                            field.onChange(v);
                          }
                        }}
                      >
                        <SelectTrigger aria-label="Notification mode" className="w-full">
                          <span className="flex-1 truncate text-left">{NOTIFY_MODES[field.value]}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hidden">{NOTIFY_MODES.hidden}</SelectItem>
                          <SelectItem value="always">{NOTIFY_MODES.always}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ) : null}
            </div>
          )}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
          Other Settings
        </legend>

        <Controller
          name="hideName"
          control={control}
          render={({ field }) => (
            <div className={alertCardClass(field.value)} data-testid="alert-card-hidename">
              <div className={alertCardRowClass}>
                <div className="flex items-center gap-3">
                  <EyeOff className={iconClass(field.value)} aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor={`${uid}-hidename`} className="cursor-pointer font-medium">
                      Hide timer name on timer page
                    </Label>
                    <p className="text-muted-foreground text-xs">Distraction-free countdown</p>
                  </div>
                </div>
                <Switch id={`${uid}-hidename`} checked={field.value} onCheckedChange={field.onChange} />
              </div>
            </div>
          )}
        />
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
