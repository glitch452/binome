'use client';

import { useContext } from 'react';

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

  return showRunView ? <RunView /> : <TimerList />;
}
