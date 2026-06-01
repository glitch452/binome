'use client';

import { useContext } from 'react';

import { BuildInfoFooter } from '@/components/shared/BuildInfoFooter';
import { RunView } from '@/components/run-view/RunView';
import { TimerList } from '@/components/timer-list/TimerList';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';

export function AppShell() {
  const activeTimer = useContext(ActiveTimerContext);

  const showRunView =
    activeTimer !== null &&
    activeTimer.isViewingRunView &&
    activeTimer.state.configId !== null &&
    activeTimer.state.status !== 'idle';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">{showRunView ? <RunView /> : <TimerList />}</div>
      <BuildInfoFooter />
    </div>
  );
}
