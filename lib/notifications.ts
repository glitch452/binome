import type { TimerConfig } from '@/types/timer';

export function isNotificationSupported(): boolean {
  return typeof Notification !== 'undefined';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.requestPermission();
}

export async function showExpiryNotification(timer: TimerConfig): Promise<void> {
  const title = timer.hideName ? 'Binome' : timer.name;
  const body = timer.hideName ? 'Your timer has finished.' : 'Timer finished.';
  const options: NotificationOptions = {
    body,
    icon: '/apple-touch-icon.png',
    tag: `binome-expiry-${timer.id}`,
  };

  // ServiceWorkerContainer.getRegistration resolves immediately (no hanging wait),
  // so this is safe whether or not a worker is registered. Prefer SW path so the
  // notification works on platforms (e.g. Android Chrome) that prohibit the
  // page-level constructor outside a gesture.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- navigator.serviceWorker is absent at runtime in environments without SW support despite the DOM type
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) {
    await reg.showNotification(title, options);
    return;
  }

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Swallow Android Chrome's TypeError: Illegal constructor when no SW is active.
  }
}
