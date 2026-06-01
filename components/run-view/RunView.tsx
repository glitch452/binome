'use client';

import { useCallback, useContext, useEffect, useRef } from 'react';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useAudio } from '@/hooks/useAudio';
import { useFlash } from '@/hooks/useFlash';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerStatus } from '@/types/timer';

import { CountdownDisplay } from './CountdownDisplay';
import { FlashOverlay } from './FlashOverlay';
import { TimerControls } from './TimerControls';

export function RunView() {
  const activeTimer = useContext(ActiveTimerContext);
  const { getTimer } = useTimerStore();
  const { isFlashing, trigger: triggerFlash, cancel: cancelFlash } = useFlash();
  const { prime, play } = useAudio();

  const state = activeTimer?.state;
  const timer = state?.configId ? getTimer(state.configId) : undefined;

  // Resume may follow an iOS interruption (e.g. phone call) that suspended
  // the AudioContext; prime() inside this gesture handler re-unlocks it.
  const handleResume = useCallback(() => {
    prime();
    activeTimer?.resume();
  }, [prime, activeTimer]);

  const handleReset = useCallback(() => {
    cancelFlash();
    activeTimer?.reset();
  }, [cancelFlash, activeTimer]);

  // Detect the idle→expired transition and fire enabled alerts simultaneously
  const prevStatusRef = useRef<TimerStatus>('idle');
  useEffect(() => {
    const curr = state?.status ?? 'idle';
    if (prevStatusRef.current !== 'expired' && curr === 'expired' && timer) {
      if (timer.flash) {
        triggerFlash();
      }
      if (timer.sound && timer.soundId) {
        play(timer.soundId);
      }
    }
    prevStatusRef.current = curr;
  }, [state?.status, timer, triggerFlash, play]);

  if (!state || state.status === 'idle' || !timer) {
    return null;
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8 p-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <h1 className="text-2xl font-semibold">{timer.name}</h1>

      <CountdownDisplay
        remainingSeconds={state.remainingSeconds}
        elapsedAfterExpiry={state.elapsedAfterExpiry}
        status={state.status}
        countUp={timer.countUp}
      />

      <TimerControls
        status={state.status}
        onPause={() => activeTimer.pause()}
        onResume={handleResume}
        onReset={handleReset}
        onBack={() => activeTimer.backToList()}
      />

      <FlashOverlay active={isFlashing} />
    </div>
  );
}
