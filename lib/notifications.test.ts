import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TimerConfig } from '@/types/timer';

import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  showExpiryNotification,
} from './notifications';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test Timer',
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

const HIDDEN_TIMER: TimerConfig = { ...TIMER, hideName: true };

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock Notification constructor that tracks instances and carries
 * the static `permission` / `requestPermission` members needed by the helpers.
 * @param permission
 */
function makeMockNotification(permission: NotificationPermission = 'granted') {
  interface MockInstance {
    onclick: ((e: Event) => void) | null;
    close: ReturnType<typeof vi.fn>;
  }
  let instance: MockInstance | null = null;

  const MockConstructor = Object.assign(
    // Regular function (not arrow) so `new MockConstructor()` works correctly.
    vi.fn(function MockNotificationImpl() {
      instance = { onclick: null, close: vi.fn() };
      return instance;
    }),
    {
      permission,
      requestPermission: vi.fn().mockResolvedValue(permission),
    },
  );

  return { MockConstructor, getInstance: () => instance };
}

function stubServiceWorker(getRegistration: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration },
    configurable: true,
    writable: true,
  });
}

function removeServiceWorkerStub() {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('notifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // isNotificationSupported
  // -------------------------------------------------------------------------

  describe('isNotificationSupported', () => {
    it('returns true when Notification is present in the global scope', () => {
      // jsdom does not ship Notification; stub a mock to simulate a supported environment.
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      expect(isNotificationSupported()).toBe(true);
    });

    it('returns false when Notification is absent from the global scope', () => {
      vi.stubGlobal('Notification', undefined);
      expect(isNotificationSupported()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getNotificationPermission
  // -------------------------------------------------------------------------

  describe('getNotificationPermission', () => {
    it("returns 'unsupported' when Notification is absent", () => {
      vi.stubGlobal('Notification', undefined);
      expect(getNotificationPermission()).toBe('unsupported');
    });

    it("returns 'default' when Notification.permission is 'default'", () => {
      const { MockConstructor } = makeMockNotification('default');
      vi.stubGlobal('Notification', MockConstructor);
      expect(getNotificationPermission()).toBe('default');
    });

    it("returns 'granted' when Notification.permission is 'granted'", () => {
      const { MockConstructor } = makeMockNotification('granted');
      vi.stubGlobal('Notification', MockConstructor);
      expect(getNotificationPermission()).toBe('granted');
    });

    it("returns 'denied' when Notification.permission is 'denied'", () => {
      const { MockConstructor } = makeMockNotification('denied');
      vi.stubGlobal('Notification', MockConstructor);
      expect(getNotificationPermission()).toBe('denied');
    });
  });

  // -------------------------------------------------------------------------
  // requestNotificationPermission
  // -------------------------------------------------------------------------

  describe('requestNotificationPermission', () => {
    it("returns 'unsupported' without throwing when Notification is absent", async () => {
      vi.stubGlobal('Notification', undefined);
      await expect(requestNotificationPermission()).resolves.toBe('unsupported');
    });

    it('calls Notification.requestPermission when Notification is present', async () => {
      const { MockConstructor } = makeMockNotification('default');
      vi.stubGlobal('Notification', MockConstructor);
      await requestNotificationPermission();
      expect(MockConstructor.requestPermission).toHaveBeenCalledOnce();
    });

    it('returns the value resolved by Notification.requestPermission', async () => {
      const { MockConstructor } = makeMockNotification('default');
      MockConstructor.requestPermission.mockResolvedValue('granted');
      vi.stubGlobal('Notification', MockConstructor);
      await expect(requestNotificationPermission()).resolves.toBe('granted');
    });
  });

  // -------------------------------------------------------------------------
  // showExpiryNotification — service-worker path
  // -------------------------------------------------------------------------

  describe('showExpiryNotification — service worker path', () => {
    let mockShowNotification: ReturnType<typeof vi.fn>;
    let mockGetRegistration: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockShowNotification = vi.fn().mockResolvedValue(undefined);
      mockGetRegistration = vi.fn().mockResolvedValue({ showNotification: mockShowNotification });
      stubServiceWorker(mockGetRegistration);
    });

    afterEach(() => {
      removeServiceWorkerStub();
    });

    it('calls registration.showNotification when a registration is found', async () => {
      await showExpiryNotification(TIMER);
      expect(mockShowNotification).toHaveBeenCalledOnce();
    });

    it('does not call new Notification when a SW registration is found', async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).not.toHaveBeenCalled();
    });

    it('passes the timer name as the notification title when hideName is false', async () => {
      await showExpiryNotification(TIMER);
      expect(mockShowNotification).toHaveBeenCalledWith(TIMER.name, expect.anything());
    });

    it("passes 'Binome' as the notification title when hideName is true", async () => {
      await showExpiryNotification(HIDDEN_TIMER);
      expect(mockShowNotification).toHaveBeenCalledWith('Binome', expect.anything());
    });

    it("passes 'Timer finished.' as the body when hideName is false", async () => {
      await showExpiryNotification(TIMER);
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ body: 'Timer finished.' }),
      );
    });

    it("passes 'Your timer has finished.' as the body when hideName is true", async () => {
      await showExpiryNotification(HIDDEN_TIMER);
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ body: 'Your timer has finished.' }),
      );
    });

    it('passes the binome-expiry-<id> tag in options', async () => {
      await showExpiryNotification(TIMER);
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tag: `binome-expiry-${TIMER.id}` }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // showExpiryNotification — page constructor path (no SW registration)
  // -------------------------------------------------------------------------

  describe('showExpiryNotification — page constructor path', () => {
    // navigator.serviceWorker is absent in jsdom by default, so no setup is
    // needed — the optional cast in showExpiryNotification evaluates to undefined.

    it('calls new Notification when no service worker registration is found', async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).toHaveBeenCalledOnce();
    });

    it('passes the timer name as the title when hideName is false', async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).toHaveBeenCalledWith(TIMER.name, expect.anything());
    });

    it("passes 'Binome' as the title when hideName is true", async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(HIDDEN_TIMER);
      expect(MockConstructor).toHaveBeenCalledWith('Binome', expect.anything());
    });

    it("passes 'Timer finished.' as the body when hideName is false", async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ body: 'Timer finished.' }),
      );
    });

    it("passes 'Your timer has finished.' as the body when hideName is true", async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(HIDDEN_TIMER);
      expect(MockConstructor).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ body: 'Your timer has finished.' }),
      );
    });

    it('passes the binome-expiry-<id> tag in options', async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tag: `binome-expiry-${TIMER.id}` }),
      );
    });

    it('sets onclick on the notification instance', async () => {
      const { MockConstructor, getInstance } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(getInstance()?.onclick).toBeTypeOf('function');
    });

    it('swallows a TypeError thrown by the Notification constructor', async () => {
      const ThrowingConstructor = vi.fn(function ThrowingNotification() {
        throw new TypeError('Illegal constructor');
      });
      vi.stubGlobal('Notification', ThrowingConstructor);
      await expect(showExpiryNotification(TIMER)).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // showExpiryNotification — SW present but getRegistration returns undefined
  // -------------------------------------------------------------------------

  describe('showExpiryNotification — SW present but no registration', () => {
    beforeEach(() => {
      stubServiceWorker(vi.fn().mockResolvedValue(undefined));
    });

    afterEach(() => {
      removeServiceWorkerStub();
    });

    it('falls back to new Notification when getRegistration resolves undefined', async () => {
      const { MockConstructor } = makeMockNotification();
      vi.stubGlobal('Notification', MockConstructor);
      await showExpiryNotification(TIMER);
      expect(MockConstructor).toHaveBeenCalledOnce();
    });
  });
});
