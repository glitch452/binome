'use client';

import { useCallback, useContext, useEffect, useRef } from 'react';
import { Bell, Hash, MessageSquareText, Sun } from 'lucide-react';

import { DisplayMenu } from '@/components/shared/DisplayMenu';
import { ThemeMenu } from '@/components/shared/ThemeMenu';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useAudio } from '@/hooks/useAudio';
import { useFlash } from '@/hooks/useFlash';
import { useTimerFontSize } from '@/hooks/useTimerFontSize';
import { useTimerNumeralFont } from '@/hooks/useTimerNumeralFont';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerStatus } from '@/types/timer';

import { CountdownDisplay } from './CountdownDisplay';
import { FlashOverlay } from './FlashOverlay';
import { TimerControls } from './TimerControls';

export function RunView() {
  const activeTimer = useContext(ActiveTimerContext);
  const { getTimer } = useTimerStore();
  const { fontSize } = useTimerFontSize();
  const { numeralFont } = useTimerNumeralFont();
  const { isFlashing, trigger: triggerFlash, cancel: cancelFlash } = useFlash();
  const { prime, playRepeated, cancelRepeated } = useAudio();

  const state = activeTimer?.state;
  const timer = state?.configId ? getTimer(state.configId) : undefined;

  // Prime the AudioContext on mount (RunView only mounts right after the user clicked Start)
  // and cancel any pending repeats on unmount.
  useEffect(() => {
    prime();
    return cancelRepeated;
  }, [prime, cancelRepeated]);

  // Resume may follow an iOS interruption (e.g. phone call) that suspended
  // the AudioContext; prime() inside this gesture handler re-unlocks it.
  const handleResume = useCallback(() => {
    prime();
    activeTimer?.resume();
  }, [prime, activeTimer]);

  const handleReset = useCallback(() => {
    cancelFlash();
    cancelRepeated();
    activeTimer?.reset();
  }, [cancelFlash, cancelRepeated, activeTimer]);

  const handleBack = useCallback(() => {
    cancelRepeated();
    activeTimer?.backToList();
  }, [cancelRepeated, activeTimer]);

  // Detect the idle→expired transition and fire enabled alerts simultaneously
  const prevStatusRef = useRef<TimerStatus>('idle');
  useEffect(() => {
    const curr = state?.status ?? 'idle';
    if (prevStatusRef.current !== 'expired' && curr === 'expired' && timer) {
      if (timer.flash) {
        triggerFlash();
      }
      if (timer.sound && timer.soundId) {
        playRepeated(timer.soundId, timer.soundRepeat);
      }
    }
    prevStatusRef.current = curr;
  }, [state?.status, timer, triggerFlash, playRepeated]);

  if (!state || state.status === 'idle' || !timer) {
    return null;
  }

  return (
    <div className="relative isolate flex flex-1 flex-col p-8">
      <div className="bg-run-gradient pointer-events-none absolute inset-0 -z-10" data-testid="run-gradient" />

      {!!(timer.flash || timer.sound || timer.countUp || timer.notify) && (
        <div className="absolute top-4 left-4 flex gap-2 p-1">
          {!!timer.flash && <Sun className="text-muted-foreground size-5" aria-label="Flash on expiry" />}
          {!!timer.sound && <Bell className="text-muted-foreground size-5" aria-label="Sound on expiry" />}
          {!!timer.countUp && <Hash className="text-muted-foreground size-5" aria-label="Count up after expiry" />}
          {!!timer.notify && (
            <MessageSquareText className="text-muted-foreground size-5" aria-label="Notify on expiry" />
          )}
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-1">
        <DisplayMenu />
        <ThemeMenu />
      </div>

      <div className="flex flex-2 flex-col items-center justify-center gap-6">
        {!timer.hideName && <h1 className="text-center text-2xl font-semibold">{timer.name}</h1>}
        <div className="@container flex w-full justify-center">
          <CountdownDisplay
            remainingSeconds={state.remainingSeconds}
            elapsedAfterExpiry={state.elapsedAfterExpiry}
            status={state.status}
            countUp={timer.countUp}
            fontSize={fontSize}
            numeralFont={numeralFont}
          />
        </div>
      </div>

      <div className="justify-top flex flex-1 flex-col items-center">
        <TimerControls
          status={state.status}
          onPause={() => activeTimer.pause()}
          onResume={handleResume}
          onReset={handleReset}
          onBack={handleBack}
        />
      </div>

      <FlashOverlay active={isFlashing} />
    </div>
  );
}
