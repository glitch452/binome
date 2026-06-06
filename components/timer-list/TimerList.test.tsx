import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveTimerContext, ActiveTimerProvider } from '@/contexts/ActiveTimerContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TimerStoreProvider } from '@/contexts/TimerStoreContext';
import { STORAGE_KEY_TIMERS } from '@/lib/constants';
import { parseImportContent } from '@/lib/importExport';
import type { BuildInfo } from '@/lib/build-info';
import { toast } from 'sonner';
import type { TimerConfig } from '@/types/timer';

import { TimerList } from './TimerList';

vi.mock('@/lib/importExport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/importExport')>('@/lib/importExport');
  return { ...actual, parseImportContent: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/download');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const UPDATE: BuildInfo = {
  version: '2.0.0',
  commit: 'abc123def456789012345678901234567890abcd',
  commitShort: 'abc123d',
  releaseUrl: 'https://github.com/glitch452/binome/releases/tag/v2.0.0',
  releasesUrl: 'https://github.com/glitch452/binome/releases',
  buildTime: '2024-06-01T10:00:00.000Z',
};

const SAMPLE_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test Timer',
  durationSeconds: 60,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const NEW_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000099',
  name: 'New Imported Timer',
  durationSeconds: 120,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
  countUp: false,
  hideName: false,
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Wrappers
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <TimerStoreProvider>
      <ActiveTimerProvider>{children}</ActiveTimerProvider>
    </TimerStoreProvider>
  </ThemeProvider>
);

/** Reads remaining seconds from ActiveTimerContext for the reset assertion. */
const RemainingDisplay = () => {
  const ctx = useContext(ActiveTimerContext);
  return <div data-testid="remaining">{ctx?.state.remainingSeconds}</div>;
};

const wrapperWithRemaining = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <TimerStoreProvider>
      <ActiveTimerProvider>
        <RemainingDisplay />
        {children}
      </ActiveTimerProvider>
    </TimerStoreProvider>
  </ThemeProvider>
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TimerList', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  describe('empty state', () => {
    it('shows an empty state message when there are no timers', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByText(/no timers yet/i)).toBeInTheDocument();
    });
  });

  describe('populated list', () => {
    it('renders a list item for each stored timer', () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      render(<TimerList />, { wrapper });
      expect(screen.getByText(SAMPLE_TIMER.name)).toBeInTheDocument();
    });
  });

  describe('new timer sheet', () => {
    it('opens the create sheet when New Timer is clicked', async () => {
      render(<TimerList />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: 'New Timer' }));
      expect(screen.getByText('New Timer', { selector: '[data-slot="sheet-title"]' })).toBeInTheDocument();
    });
  });

  describe('clone timer sheet', () => {
    it('shows "Copy Timer" as the sheet title when Copy is clicked', async () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      render(<TimerList />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: `Copy ${SAMPLE_TIMER.name}` }));
      expect(screen.getByText('Copy Timer', { selector: '[data-slot="sheet-title"]' })).toBeInTheDocument();
    });

    it('pre-fills the form with the source timer name when Copy is clicked', async () => {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      render(<TimerList />, { wrapper });
      await userEvent.click(screen.getByRole('button', { name: `Copy ${SAMPLE_TIMER.name}` }));
      expect(screen.getByRole('textbox', { name: 'Timer name' })).toHaveValue(SAMPLE_TIMER.name);
    });
  });

  describe('header', () => {
    it('shows the app name', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('heading', { name: 'Binome' })).toBeInTheDocument();
    });

    it('renders the import/export menu button', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('button', { name: /import or export timers/i })).toBeInTheDocument();
    });
  });

  describe('accessibility — semantic landmarks (§12)', () => {
    it('renders a banner landmark for the header', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders a main landmark for the content area', () => {
      render(<TimerList />, { wrapper });
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('import', () => {
    it('adds confirmed timers to the store', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [NEW_TIMER], droppedCount: 0 });
      render(<TimerList />, { wrapper });
      await userEvent.upload(
        screen.getByTestId('file-input'),
        new File([''], 'test.json', { type: 'application/json' }),
      );
      await userEvent.click(await screen.findByRole('button', { name: /^import$/i }));
      expect(screen.getByText(NEW_TIMER.name)).toBeInTheDocument();
    });

    it('shows a success toast after confirming an import', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [NEW_TIMER], droppedCount: 0 });
      render(<TimerList />, { wrapper });
      await userEvent.upload(
        screen.getByTestId('file-input'),
        new File([''], 'test.json', { type: 'application/json' }),
      );
      await userEvent.click(await screen.findByRole('button', { name: /^import$/i }));
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Imported'));
    });

    it('resets the active timer when the import overwrites it', async () => {
      vi.useFakeTimers();
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify([SAMPLE_TIMER]));
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [SAMPLE_TIMER], droppedCount: 0 });

      render(<TimerList />, { wrapper: wrapperWithRemaining });

      // Start the timer so it's the active one.
      // eslint-disable-next-line testing-library/prefer-user-event -- userEvent hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: `Start ${SAMPLE_TIMER.name}` }));

      // Advance 5 s so remaining drops from 60 → 55.
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Trigger file upload (fireEvent so it doesn't conflict with fake timers).
      const file = new File(['content'], 'test.json', { type: 'application/json' });
      const input = screen.getByTestId('file-input');
      Object.defineProperty(input, 'files', {
        value: { 0: file, length: 1, item: (i: number) => (i === 0 ? file : null) },
        configurable: true,
      });
      // eslint-disable-next-line testing-library/prefer-user-event -- userEvent hangs with fake timers
      fireEvent.change(input);

      // Flush the async file.text() so the import dialog state updates.
      await act(async () => {
        await Promise.resolve();
      });

      // The overwrite candidate is unchecked by default — check it first.
      // eslint-disable-next-line testing-library/prefer-user-event -- userEvent hangs with fake timers
      fireEvent.click(screen.getByRole('checkbox', { name: SAMPLE_TIMER.name }));

      // Confirm the import.
      // eslint-disable-next-line testing-library/prefer-user-event -- userEvent hangs with fake timers
      fireEvent.click(screen.getByRole('button', { name: /^import$/i }));

      // The active timer must be reset to its initial duration (60 s).
      expect(screen.getByTestId('remaining')).toHaveTextContent(String(SAMPLE_TIMER.durationSeconds));

      vi.useRealTimers();
    });
  });

  describe('UpdateBanner (UC-03)', () => {
    it('renders the banner inside the sticky wrapper when update is non-null', () => {
      render(<TimerList update={UPDATE} onDismissUpdate={vi.fn()} />, { wrapper });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('does not render the banner when update is null', () => {
      render(<TimerList />, { wrapper });
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
