'use client';

import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TimerStatus } from '@/types/timer';

interface TimerControlsProps {
  status: TimerStatus;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onBack: () => void;
}

export function TimerControls({ status, onPause, onResume, onReset, onBack }: TimerControlsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {status === 'running' ? (
        <Button onClick={onPause}>
          <Pause />
          Pause
        </Button>
      ) : null}
      {status === 'paused' ? (
        <Button onClick={onResume}>
          <Play />
          Resume
        </Button>
      ) : null}
      <Button variant="outline" onClick={onReset}>
        <RotateCcw />
        Reset
      </Button>
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft />
        Back to List
      </Button>
    </div>
  );
}
