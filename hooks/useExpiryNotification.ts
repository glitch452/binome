import { useContext, useEffect, useRef } from 'react';

import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { getNotificationPermission, showExpiryNotification } from '@/lib/notifications';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerStatus } from '@/types/timer';

/**
 * Always-mounted expiry notification orchestrator.
 *
 * Mirrors the `prevStatusRef` guard used in RunView for flash/sound, but is
 * called from AppShell so it fires whether the user is on the Run View or the
 * Timer List when the timer expires.
 *
 * Fires `showExpiryNotification` on the `→ expired` transition when:
 *   - The active timer's `notify` is `true`
 *   - `Notification.permission` is `'granted'`
 *   - The mode allows it: `'always'`, or `'hidden'` and the page is backgrounded
 *     (`document.visibilityState === 'hidden'` or `!document.hasFocus()`)
 */
export function useExpiryNotification(): void {
  const activeTimer = useContext(ActiveTimerContext);
  const { getTimer } = useTimerStore();
  const prevStatusRef = useRef<TimerStatus>('idle');

  const state = activeTimer?.state;
  const timer = state?.configId ? getTimer(state.configId) : undefined;

  useEffect(() => {
    const curr = state?.status ?? 'idle';
    if (prevStatusRef.current !== 'expired' && curr === 'expired' && timer?.notify) {
      if (getNotificationPermission() === 'granted') {
        const isAllowed =
          timer.notifyMode === 'always' || document.visibilityState === 'hidden' || !document.hasFocus();
        if (isAllowed) {
          void showExpiryNotification(timer);
        }
      }
    }
    prevStatusRef.current = curr;
  }, [state?.status, timer]);
}
