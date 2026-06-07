import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { useTimerStore } from './useTimerStore';
import { useNotificationPermission } from './useNotificationPermission';

// ---------------------------------------------------------------------------
// Notification mocks (hoisted so they are available inside vi.mock factory)
// ---------------------------------------------------------------------------

const { isNotificationSupportedMock, getNotificationPermissionMock, requestNotificationPermissionMock } = vi.hoisted(
  () => ({
    isNotificationSupportedMock: vi.fn().mockReturnValue(true),
    getNotificationPermissionMock: vi.fn<() => NotificationPermission | 'unsupported'>().mockReturnValue('default'),
    requestNotificationPermissionMock: vi
      .fn<() => Promise<NotificationPermission | 'unsupported'>>()
      .mockResolvedValue('granted'),
  }),
);

vi.mock('@/lib/notifications', () => ({
  isNotificationSupported: isNotificationSupportedMock,
  getNotificationPermission: getNotificationPermissionMock,
  requestNotificationPermission: requestNotificationPermissionMock,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOTIFY_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Notify Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: true,
  notifyMode: 'always',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const REGULAR_TIMER: TimerConfig = {
  ...NOTIFY_TIMER,
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Regular Timer',
  notify: false,
};

/** New-timer input for addTimer — no id/timestamps needed. */
const NEW_NOTIFY_INPUT = {
  name: 'Another Notify Timer',
  durationSeconds: 30,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: true,
  notifyMode: 'always',
} as const;

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <TimerStoreProvider>{children}</TimerStoreProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNotificationPermission', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    isNotificationSupportedMock.mockReturnValue(true);
    getNotificationPermissionMock.mockReturnValue('default');
    requestNotificationPermissionMock.mockResolvedValue('granted');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('on mount with a notify timer and default permission', () => {
    it('calls requestNotificationPermission', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      renderHook(() => useNotificationPermission(), { wrapper });
      expect(requestNotificationPermissionMock).toHaveBeenCalledOnce();
    });
  });

  describe('when no timer has notify enabled', () => {
    it('does not call requestNotificationPermission', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([REGULAR_TIMER]));
      renderHook(() => useNotificationPermission(), { wrapper });
      expect(requestNotificationPermissionMock).not.toHaveBeenCalled();
    });
  });

  describe('when permission is already granted', () => {
    it('does not call requestNotificationPermission', () => {
      getNotificationPermissionMock.mockReturnValue('granted');
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      renderHook(() => useNotificationPermission(), { wrapper });
      expect(requestNotificationPermissionMock).not.toHaveBeenCalled();
    });
  });

  describe('when permission is already denied', () => {
    it('does not call requestNotificationPermission', () => {
      getNotificationPermissionMock.mockReturnValue('denied');
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      renderHook(() => useNotificationPermission(), { wrapper });
      expect(requestNotificationPermissionMock).not.toHaveBeenCalled();
    });
  });

  describe('when notifications are not supported', () => {
    it('does not call requestNotificationPermission', () => {
      isNotificationSupportedMock.mockReturnValue(false);
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      renderHook(() => useNotificationPermission(), { wrapper });
      expect(requestNotificationPermissionMock).not.toHaveBeenCalled();
    });
  });

  describe('re-request after a new notify timer is added while still default', () => {
    it('calls requestNotificationPermission a second time after a new notify timer is added', async () => {
      // Start with one notify timer → first request fires
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      const { result } = renderHook(
        () => {
          useNotificationPermission();
          return useTimerStore();
        },
        { wrapper },
      );

      // Flush promises so the .then() callback resets hasRequestedRef
      await act(async () => {
        await Promise.resolve();
      });

      // Add a second notify timer → timers changes → effect re-runs → second request
      act(() => {
        result.current.addTimer(NEW_NOTIFY_INPUT);
      });

      expect(requestNotificationPermissionMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('does not spam on unrelated re-renders', () => {
    it('does not call requestNotificationPermission more than once when timers have not changed', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      const { rerender } = renderHook(() => useNotificationPermission(), { wrapper });
      rerender();
      rerender();
      expect(requestNotificationPermissionMock).toHaveBeenCalledOnce();
    });
  });
});
