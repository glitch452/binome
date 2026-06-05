export type SoundId = 'bell' | 'beep' | 'chime' | 'buzzer' | 'ding';

export interface TimerConfig {
  id: string;
  name: string;
  durationSeconds: number;
  flash: boolean;
  sound: boolean;
  soundId: SoundId | null;
  soundRepeat: number;
  countUp: boolean;
  hideName: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired';

export interface ActiveTimerState {
  configId: string | null;
  status: TimerStatus;
  remainingSeconds: number;
  elapsedAfterExpiry: number;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export type TimerFontSize = 'sm' | 'md' | 'lg' | 'xl';
