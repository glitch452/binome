/**
 * Integration test: AppShell full-flow
 * create timer → start → tick → expiry alerts → reset → back to list
 * Asserts timer stops when navigating back to the list.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { AccentProvider } from '@/contexts/AccentContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerFontSizeProvider } from '@/contexts/TimerFontSizeContext';
import { TimerNumeralFontProvider } from '@/contexts/TimerNumeralFontContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import type { TimerConfig } from '@/types/timer';

import { AppShell } from './AppShell';

// AppShell calls useApplyUpdate and useUpdateCheck → useSerwist, which throws outside a
// SerwistProvider. This integration suite exercises timer behavior, not the PWA layer, so
// stub both hooks.
vi.mock('@/hooks/useApplyUpdate', () => ({ useApplyUpdate: vi.fn().mockReturnValue(vi.fn()) }));
vi.mock('@/hooks/useUpdateCheck', () => ({
  useUpdateCheck: vi.fn().mockReturnValue({ update: null, dismissUpdate: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Notification mocks — hoisted so they are available in vi.mock factory
// ---------------------------------------------------------------------------

const {
  showExpiryNotificationMock,
  getNotificationPermissionMock,
  isNotificationSupportedMock,
  requestNotificationPermissionMock,
} = vi.hoisted(() => ({
  showExpiryNotificationMock: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getNotificationPermissionMock: vi.fn<() => NotificationPermission | 'unsupported'>().mockReturnValue('granted'),
  isNotificationSupportedMock: vi.fn<() => boolean>().mockReturnValue(true),
  requestNotificationPermissionMock: vi
    .fn<() => Promise<NotificationPermission | 'unsupported'>>()
    .mockResolvedValue('granted'),
}));

vi.mock('@/lib/notifications', () => ({
  showExpiryNotification: showExpiryNotificationMock,
  getNotificationPermission: getNotificationPermissionMock,
  isNotificationSupported: isNotificationSupportedMock,
  requestNotificationPermission: requestNotificationPermissionMock,
}));

const FLASH_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Flash Timer',
  durationSeconds: 2,
  flash: true,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const LONG_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Long Timer',
  durationSeconds: 10,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  notify: false,
  notifyMode: 'hidden',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const NOTIFY_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Notify Timer',
  durationSeconds: 2,
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

/** Displays remaining seconds from context so tests can verify FR-10 */
const RemainingDisplay = () => {
  const ctx = useContext(ActiveTimerContext);
  return <div data-testid="remaining">{ctx?.state.remainingSeconds}</div>;
};

const Providers = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <AccentProvider>
      <TimerFontSizeProvider>
        <TimerNumeralFontProvider>
          <TimerStoreProvider>
            <ActiveTimerProvider>
              <RemainingDisplay />
              {children}
            </ActiveTimerProvider>
          </TimerStoreProvider>
        </TimerNumeralFontProvider>
      </TimerFontSizeProvider>
    </AccentProvider>
  </ThemeProvider>
);

describe('AppShell — integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function MockAudioContext() {
        return {
          state: 'running',
          destination: {},
          resume: vi.fn().mockResolvedValue(undefined),
          decodeAudioData: vi.fn().mockResolvedValue({}),
          createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('create timer via form', () => {
    it('a timer created through the New Timer form appears in the list', async () => {
      localStorage.clear();
      render(<AppShell />, { wrapper: Providers });
      await userEvent.click(screen.getByRole('button', { name: 'New Timer' }));
      await userEvent.type(screen.getByRole('textbox', { name: 'Timer name' }), 'My Work Session');
      await userEvent.clear(screen.getByRole('spinbutton', { name: 'Minutes' }));
      await userEvent.type(screen.getByRole('spinbutton', { name: 'Minutes' }), '25');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByText('My Work Session')).toBeInTheDocument();
    });
  });

  describe('timer lifecycle', () => {
    it('starting a timer transitions to RunView', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      expect(screen.getByTestId('countdown-display')).toBeInTheDocument();
    });

    it('expiry alerts fire when the timer reaches zero (FR-11/12)', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(FLASH_TIMER.durationSeconds * 1000);
      });
      expect(screen.getByTestId('flash-overlay')).toBeInTheDocument();
    });

    it('resetting an expired timer returns remaining to original duration', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(FLASH_TIMER.durationSeconds * 1000);
      });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByTestId('remaining')).toHaveTextContent(String(FLASH_TIMER.durationSeconds));
    });
  });

  describe('expiry notifications (BN-10)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getNotificationPermissionMock.mockReturnValue('granted');
      isNotificationSupportedMock.mockReturnValue(true);
      requestNotificationPermissionMock.mockResolvedValue('granted');
      showExpiryNotificationMock.mockResolvedValue(undefined);
    });

    it('calls showExpiryNotification when a notify timer expires', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([NOTIFY_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${NOTIFY_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(NOTIFY_TIMER.durationSeconds * 1000);
      });
      expect(showExpiryNotificationMock).toHaveBeenCalledOnce();
    });

    it('does not call showExpiryNotification when the active timer has notify: false', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([FLASH_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${FLASH_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(FLASH_TIMER.durationSeconds * 1000);
      });
      expect(showExpiryNotificationMock).not.toHaveBeenCalled();
    });
  });

  describe('Back to List stops the timer', () => {
    it('resets remaining to zero when Back to List is clicked', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([LONG_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${LONG_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: 'Back to List' }));
      expect(screen.getByTestId('remaining')).toHaveTextContent('0');
    });

    it('halts ticking after Back to List is clicked', () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([LONG_TIMER]));
      render(<AppShell />, { wrapper: Providers });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${LONG_TIMER.name}` }));
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      // eslint-disable-next-line testing-library/prefer-user-event -- fireEvent needed; userEvent.click hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: 'Back to List' }));
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId('remaining')).toHaveTextContent('0');
    });
  });
});
