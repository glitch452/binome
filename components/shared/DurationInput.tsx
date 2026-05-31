'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hmsToSeconds, secondsToHMS } from '@/lib/time';

const MAX_HOURS = 99;
const MAX_MINUTES_SECONDS = 59;

interface DurationInputProps {
  value: number;
  onChange: (seconds: number) => void;
  disabled?: boolean;
}

function clampField(raw: number, max: number): number {
  return Math.min(max, Math.max(0, Number.isNaN(raw) ? 0 : Math.trunc(raw)));
}

export function DurationInput({ value, onChange, disabled = false }: DurationInputProps) {
  const uid = useId();
  const { hours, minutes, seconds } = secondsToHMS(value);

  const handleChange = (field: 'hours' | 'minutes' | 'seconds') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const max = field === 'hours' ? MAX_HOURS : MAX_MINUTES_SECONDS;
    const clamped = clampField(raw, max);
    const next =
      field === 'hours'
        ? hmsToSeconds(clamped, minutes, seconds)
        : field === 'minutes'
          ? hmsToSeconds(hours, clamped, seconds)
          : hmsToSeconds(hours, minutes, clamped);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor={`${uid}-hours`}>HH</Label>
        <Input
          id={`${uid}-hours`}
          type="number"
          min={0}
          max={MAX_HOURS}
          value={hours}
          onChange={handleChange('hours')}
          disabled={disabled}
          className="w-16 text-center"
          aria-label="Hours"
        />
      </div>
      <span className="mt-5 text-lg font-bold">:</span>
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor={`${uid}-minutes`}>MM</Label>
        <Input
          id={`${uid}-minutes`}
          type="number"
          min={0}
          max={MAX_MINUTES_SECONDS}
          value={minutes}
          onChange={handleChange('minutes')}
          disabled={disabled}
          className="w-16 text-center"
          aria-label="Minutes"
        />
      </div>
      <span className="mt-5 text-lg font-bold">:</span>
      <div className="flex flex-col items-center gap-1">
        <Label htmlFor={`${uid}-seconds`}>SS</Label>
        <Input
          id={`${uid}-seconds`}
          type="number"
          min={0}
          max={MAX_MINUTES_SECONDS}
          value={seconds}
          onChange={handleChange('seconds')}
          disabled={disabled}
          className="w-16 text-center"
          aria-label="Seconds"
        />
      </div>
    </div>
  );
}
