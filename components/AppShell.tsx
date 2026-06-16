'use client';

import { useContext, useState } from 'react';

import { BuildInfoFooter } from '@/components/shared/BuildInfoFooter';
import { RunView } from '@/components/run-view/RunView';
import { TimerList } from '@/components/timer-list/TimerList';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useApplyUpdate } from '@/hooks/useApplyUpdate';
import { useExpiryNotification } from '@/hooks/useExpiryNotification';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';

export function AppShell() {
  const activeTimer = useContext(ActiveTimerContext);
  const { update, dismissUpdate } = useUpdateCheck();
  const applyUpdate = useApplyUpdate();
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  useNotificationPermission();
  useExpiryNotification();

  const showRunView =
    activeTimer !== null &&
    activeTimer.isViewingRunView &&
    activeTimer.state.configId !== null &&
    activeTimer.state.status !== 'idle';

  // On click, show the button's loading state and reload to adopt the latest worker. The page
  // reloads immediately (and the launch gate ensures the newest version is what loads), so the
  // loading state simply persists until the navigation happens.
  const handleRefresh = () => {
    setIsApplyingUpdate(true);
    applyUpdate({ reloadNow: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">
        {showRunView ? (
          <RunView />
        ) : (
          <TimerList
            update={update}
            onDismissUpdate={dismissUpdate}
            onRefresh={handleRefresh}
            isApplyingUpdate={isApplyingUpdate}
          />
        )}
      </div>
      <BuildInfoFooter />
    </div>
  );
}
