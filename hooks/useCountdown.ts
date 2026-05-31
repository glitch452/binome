import { useCallback, useEffect, useReducer } from 'react';

import type { ActiveTimerState, TimerStatus } from '@/types/timer';

const TICK_INTERVAL_MS = 1000;

interface CountdownState {
  configId: string | null;
  status: TimerStatus;
  remainingSeconds: number;
  elapsedAfterExpiry: number;
  countUp: boolean;
  initialDuration: number;
}

const INITIAL_STATE: CountdownState = {
  configId: null,
  status: 'idle',
  remainingSeconds: 0,
  elapsedAfterExpiry: 0,
  countUp: false,
  initialDuration: 0,
};

type CountdownAction =
  | { type: 'START'; configId: string; durationSeconds: number; countUp: boolean }
  | { type: 'TICK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' };

function reducer(state: CountdownState, action: CountdownAction): CountdownState {
  switch (action.type) {
    case 'START':
      return {
        configId: action.configId,
        status: 'running',
        remainingSeconds: action.durationSeconds,
        elapsedAfterExpiry: 0,
        countUp: action.countUp,
        initialDuration: action.durationSeconds,
      };
    case 'TICK':
      if (state.status === 'running') {
        const next = state.remainingSeconds - 1;
        if (next <= 0) {
          return { ...state, remainingSeconds: 0, status: 'expired' };
        }
        return { ...state, remainingSeconds: next };
      }
      if (state.status === 'expired' && state.countUp) {
        return { ...state, elapsedAfterExpiry: state.elapsedAfterExpiry + 1 };
      }
      return state;
    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'RESUME':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;
    case 'RESET':
      return {
        ...state,
        status: 'idle',
        remainingSeconds: state.initialDuration,
        elapsedAfterExpiry: 0,
      };
    default:
      return state;
  }
}

function toActiveTimerState(state: CountdownState): ActiveTimerState {
  return {
    configId: state.configId,
    status: state.status,
    remainingSeconds: state.remainingSeconds,
    elapsedAfterExpiry: state.elapsedAfterExpiry,
  };
}

export interface UseCountdownReturn {
  state: ActiveTimerState;
  start: (configId: string, durationSeconds: number, countUp: boolean) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useCountdown(): UseCountdownReturn {
  const [internal, dispatch] = useReducer(reducer, INITIAL_STATE);

  const isTicking = internal.status === 'running' || (internal.status === 'expired' && internal.countUp);

  useEffect(() => {
    if (!isTicking) {
      return;
    }
    const id = setInterval(() => dispatch({ type: 'TICK' }), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isTicking]);

  const start = useCallback((configId: string, durationSeconds: number, countUp: boolean) => {
    dispatch({ type: 'START', configId, durationSeconds, countUp });
  }, []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state: toActiveTimerState(internal), start, pause, resume, reset };
}
