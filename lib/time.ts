const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const PAD_WIDTH = 2;

export interface HMS {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Converts total seconds to hours/minutes/seconds components. */
export function secondsToHMS(totalSeconds: number): HMS {
  const abs = Math.floor(Math.abs(totalSeconds));
  return {
    hours: Math.floor(abs / SECONDS_PER_HOUR),
    minutes: Math.floor((abs % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: abs % SECONDS_PER_MINUTE,
  };
}

/** Converts hours/minutes/seconds components to total seconds. */
export function hmsToSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds;
}

/**
 * Formats total seconds as MM:SS (< 1 h) or HH:MM:SS (≥ 1 h).
 * Pass prefix='+' for the count-up display after expiry.
 */
export function formatDuration(totalSeconds: number, prefix = ''): string {
  const { hours, minutes, seconds } = secondsToHMS(totalSeconds);
  const mm = String(minutes).padStart(PAD_WIDTH, '0');
  const ss = String(seconds).padStart(PAD_WIDTH, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(PAD_WIDTH, '0');
    return `${prefix}${hh}:${mm}:${ss}`;
  }

  return `${prefix}${mm}:${ss}`;
}
