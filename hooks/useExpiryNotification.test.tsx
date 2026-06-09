import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, type ActiveTimerContextValue } from '@/contexts/ActiveTimerContext';
import type { TimerConfig, TimerStatus } from '@/types/timer';

import { useExpiryNotification } from './useExpiryNotification';

// ---------------------------------------------------------------------------
// Notification mocks
// ---------------------------------------------------------------------------

const { getNotificationPermissionMock, showExpiryNotificationMock } = vi.hoisted(() => ({
  getNotificationPermissionMock: vi.fn<() => NotificationPermission | 'unsupported'>().mockReturnValue('granted'),
  showExpiryNotificationMock: vi.fn<(timer: TimerConfig) => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('@/lib/notifications', () => ({
  getNotificationPermission: getNotificationPermissionMock,
  showExpiryNotification: showExpiryNotificationMock,
}));

// ---------------------------------------------------------------------------
// useTimerStore mock
// ---------------------------------------------------------------------------

const { useTimerStoreMock } = vi.hoisted(() => ({ useTimerStoreMock: vi.fn() }));
vi.mock('@/hooks/useTimerStore', () => ({ useTimerStore: useTimerStoreMock }));

// ---------------------------------------------------------------------------
// Fixtures (immutable — safe at module level)
// ---------------------------------------------------------------------------

const TIMER_ALWAYS: TimerConfig = {
  id: 'timer-1',
  name: 'Always Notify',
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

const TIMER_HIDDEN: TimerConfig = { ...TIMER_ALWAYS, notifyMode: 'hidden' };
const TIMER_NO_NOTIFY: TimerConfig = { ...TIMER_ALWAYS, notify: false };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExpiryNotification', () => {
  // Mutable state read by the Wrapper on every render.
  // Declared here (inside describe) and initialised in beforeEach.
  let currentStatus: TimerStatus;
  let currentConfigId: string | null;
  let currentElapsed: number;

  function Wrapper({ children }: { children: ReactNode }) {
    const ctx: ActiveTimerContextValue = {
      state: {
        configId: currentConfigId,
        status: currentStatus,
        remainingSeconds: 0,
        elapsedAfterExpiry: currentElapsed,
      },
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      reset: vi.fn(),
      stop: vi.fn(),
      isViewingRunView: false,
      backToList: vi.fn(),
    };
    return <ActiveTimerContext.Provider value={ctx}>{children}</ActiveTimerContext.Provider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPermissionMock.mockReturnValue('granted');
    showExpiryNotificationMock.mockResolvedValue(undefined);
    useTimerStoreMock.mockReturnValue({ getTimer: vi.fn().mockReturnValue(TIMER_ALWAYS) });

    currentStatus = 'running';
    currentConfigId = 'timer-1';
    currentElapsed = 0;

    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  // -------------------------------------------------------------------------
  // always mode
  // -------------------------------------------------------------------------

  describe('notifyMode: always', () => {
    it('fires showExpiryNotification once on running → expired transition', () => {
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).toHaveBeenCalledOnce();
    });

    it('does not fire again on subsequent rerenders in expired state', () => {
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      currentElapsed = 1;
      rerender();
      currentElapsed = 2;
      rerender();
      expect(showExpiryNotificationMock).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // hidden mode
  // -------------------------------------------------------------------------

  describe('notifyMode: hidden', () => {
    beforeEach(() => {
      useTimerStoreMock.mockReturnValue({ getTimer: vi.fn().mockReturnValue(TIMER_HIDDEN) });
    });

    it('fires when document.visibilityState is hidden', () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).toHaveBeenCalledOnce();
    });

    it('fires when document.hasFocus() is false', () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(false);
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).toHaveBeenCalledOnce();
    });

    it('does not fire when the page is visible and focused', () => {
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Guard conditions
  // -------------------------------------------------------------------------

  describe('when notify is false', () => {
    it('does not fire showExpiryNotification', () => {
      useTimerStoreMock.mockReturnValue({ getTimer: vi.fn().mockReturnValue(TIMER_NO_NOTIFY) });
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe('when permission is not granted', () => {
    it('does not fire showExpiryNotification', () => {
      getNotificationPermissionMock.mockReturnValue('default');
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe('when there is no active timer config', () => {
    it('does not fire showExpiryNotification', () => {
      useTimerStoreMock.mockReturnValue({ getTimer: vi.fn().mockReturnValue(undefined) });
      currentConfigId = null;
      const { rerender } = renderHook(() => useExpiryNotification(), { wrapper: Wrapper });
      currentStatus = 'expired';
      rerender();
      expect(showExpiryNotificationMock).not.toHaveBeenCalled();
    });
  });
});
