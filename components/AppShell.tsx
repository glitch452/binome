'use client';

import { useContext } from 'react';

import { BuildInfoFooter } from '@/components/shared/BuildInfoFooter';
import { RunView } from '@/components/run-view/RunView';
import { TimerList } from '@/components/timer-list/TimerList';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';

export function AppShell() {
  const activeTimer = useContext(ActiveTimerContext);
  const { update, dismissUpdate } = useUpdateCheck();

  const showRunView =
    activeTimer !== null &&
    activeTimer.isViewingRunView &&
    activeTimer.state.configId !== null &&
    activeTimer.state.status !== 'idle';

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">
        {showRunView ? <RunView /> : <TimerList update={update} onDismissUpdate={dismissUpdate} />}
      </div>
      <BuildInfoFooter />
    </div>
  );
}
