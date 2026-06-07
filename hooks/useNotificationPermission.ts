import { useEffect, useRef } from 'react';

import { getNotificationPermission, isNotificationSupported, requestNotificationPermission } from '@/lib/notifications';
import { useTimerStore } from '@/hooks/useTimerStore';

/**
 * Reactive permission watcher for the browser Notification API.
 *
 * Calls `requestNotificationPermission()` whenever all of the following hold:
 *   - Notifications are supported in this environment
 *   - `Notification.permission` is `'default'` (not yet decided by the user)
 *   - At least one stored timer has `notify: true`
 *
 * A ref guards against spamming: the request fires once per rising edge of the
 * condition, then again each time `timers` changes while the permission is
 * still `'default'` (e.g. the user adds another notify-timer after the browser
 * ignored the first prompt on Safari/Firefox without a gesture).
 */
export function useNotificationPermission(): void {
  const { timers } = useTimerStore();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!isNotificationSupported()) {
      return;
    }
    if (getNotificationPermission() !== 'default') {
      return;
    }
    if (!timers.some((t) => t.notify)) {
      return;
    }
    if (hasRequestedRef.current) {
      return;
    }

    hasRequestedRef.current = true;
    void requestNotificationPermission().then(() => {
      // Reset so the next qualifying list change can attempt again (e.g.
      // the browser ignored the prompt while permission is still 'default').
      hasRequestedRef.current = false;
    });
  }, [timers]);
}
