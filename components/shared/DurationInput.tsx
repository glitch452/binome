'use client';

import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
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

function toDisplayStr(n: number): string {
  return n === 0 ? '' : String(n);
}

function parseStr(s: string): number {
  return s === '' ? 0 : Number(s);
}

export function DurationInput({ value, onChange, disabled = false }: DurationInputProps) {
  const uid = useId();
  const initial = secondsToHMS(value);
  const [hoursStr, setHoursStr] = useState(() => toDisplayStr(initial.hours));
  const [minutesStr, setMinutesStr] = useState(() => toDisplayStr(initial.minutes));
  const [secondsStr, setSecondsStr] = useState(() => toDisplayStr(initial.seconds));

  const handleChange =
    (field: 'hours' | 'minutes' | 'seconds', setter: (s: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const max = field === 'hours' ? MAX_HOURS : MAX_MINUTES_SECONDS;
      const clamped = clampField(parseStr(raw), max);
      const next = raw === '' ? '' : String(clamped);
      setter(next);
      const h = field === 'hours' ? clamped : parseStr(hoursStr);
      const m = field === 'minutes' ? clamped : parseStr(minutesStr);
      const s = field === 'seconds' ? clamped : parseStr(secondsStr);
      onChange(hmsToSeconds(h, m, s));
    };

  const handleBlur =
    (field: 'hours' | 'minutes' | 'seconds', setter: (s: string) => void, currentStr: string) => () => {
      const max = field === 'hours' ? MAX_HOURS : MAX_MINUTES_SECONDS;
      const clamped = clampField(parseStr(currentStr), max);
      setter(clamped === 0 ? '' : String(clamped));
    };

  const inputClass =
    'h-14 w-full text-center font-mono text-xl tabular-nums placeholder:transition-opacity focus:placeholder:opacity-0 focus-visible:ring-acc-ring';

  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-1 flex-col items-center gap-1">
        <Input
          id={`${uid}-hours`}
          type="number"
          min={0}
          max={MAX_HOURS}
          value={hoursStr}
          placeholder="0"
          onChange={handleChange('hours', setHoursStr)}
          onBlur={handleBlur('hours', setHoursStr, hoursStr)}
          disabled={disabled}
          className={inputClass}
          aria-label="Hours"
        />
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          hours
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <Input
          id={`${uid}-minutes`}
          type="number"
          min={0}
          max={MAX_MINUTES_SECONDS}
          value={minutesStr}
          placeholder="0"
          onChange={handleChange('minutes', setMinutesStr)}
          onBlur={handleBlur('minutes', setMinutesStr, minutesStr)}
          disabled={disabled}
          className={inputClass}
          aria-label="Minutes"
        />
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          minutes
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <Input
          id={`${uid}-seconds`}
          type="number"
          min={0}
          max={MAX_MINUTES_SECONDS}
          value={secondsStr}
          placeholder="0"
          onChange={handleChange('seconds', setSecondsStr)}
          onBlur={handleBlur('seconds', setSecondsStr, secondsStr)}
          disabled={disabled}
          className={inputClass}
          aria-label="Seconds"
        />
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          seconds
        </span>
      </div>
    </div>
  );
}
