import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimerStore } from '@/hooks/useTimerStore';
import { parseImportContent } from '@/lib/importExport';
import { toast } from 'sonner';
import type { TimerConfig } from '@/types/timer';

import { ImportButton } from './ImportButton';

vi.mock('@/hooks/useTimerStore');
vi.mock('@/lib/importExport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/importExport')>('@/lib/importExport');
  return { ...actual, parseImportContent: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

const TIMER_A: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Tea',
  durationSeconds: 180,
  flash: false,
  sound: false,
  soundId: null,
  countUp: false,
  hideName: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function mockStore(timers: TimerConfig[] = []) {
  vi.mocked(useTimerStore).mockReturnValue({
    timers,
    addTimer: vi.fn(),
    updateTimer: vi.fn(),
    deleteTimer: vi.fn(),
    getTimer: vi.fn(),
    importTimers: vi.fn(),
  });
}

/**
 * Simulate the user selecting a file via the hidden file input.
 * Uses `userEvent.upload` so the full event sequence is dispatched and async
 * event handlers are awaited.
 * @param content
 */
async function selectFile(content: string) {
  const file = new File([content], 'test.json', { type: 'application/json' });
  await userEvent.upload(screen.getByTestId('file-input'), file);
}

describe('ImportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore();
  });

  describe('button rendering', () => {
    it('renders a button with an accessible name', () => {
      render(<ImportButton />);
      expect(screen.getByRole('button', { name: /import timers/i })).toBeInTheDocument();
    });
  });

  describe('parse failure — json error', () => {
    it('shows a toast.error for a json parse failure', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'json' });
      render(<ImportButton />);
      await selectFile('not json');
      await waitFor(() =>
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('not valid JSON')),
      );
    });

    it('does not open the dialog after a json parse failure', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'json' });
      render(<ImportButton />);
      await selectFile('not json');
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('parse failure — shape error', () => {
    it('shows a toast.error for a shape validation failure', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'shape' });
      render(<ImportButton />);
      await selectFile('{}');
      await waitFor(() =>
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('not a valid Binome export file')),
      );
    });
  });

  describe('parse failure — empty', () => {
    it('shows a toast.info when no valid timers are found', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'empty' });
      render(<ImportButton />);
      await selectFile('{"timers":[]}');
      await waitFor(() =>
        expect(vi.mocked(toast.info)).toHaveBeenCalledWith(expect.stringContaining('No valid timers')),
      );
    });
  });

  describe('valid file', () => {
    it('opens the import dialog on a valid file', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [TIMER_A], droppedCount: 0 });
      mockStore([]);
      render(<ImportButton />);
      await selectFile('{"timers":[...]}');
      await expect(screen.findByRole('dialog')).resolves.toBeInTheDocument();
    });

    it('flags a timer as a conflict when its id exists in the store', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [TIMER_A], droppedCount: 0 });
      mockStore([TIMER_A]); // TIMER_A already in store → conflict
      render(<ImportButton />);
      await selectFile('{"timers":[...]}');
      await expect(screen.findByText(/overwrites existing/i)).resolves.toBeInTheDocument();
    });

    it('does not flag a timer as a conflict when its id is new', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [TIMER_A], droppedCount: 0 });
      mockStore([]); // empty store → no conflict
      render(<ImportButton />);
      await selectFile('{"timers":[...]}');
      // eslint-disable-next-line testing-library/prefer-explicit-assert -- unwrapped intentionally: wrapping would add a second expect(), violating vitest/max-expects
      await screen.findByRole('dialog');
      expect(screen.queryByText(/overwrites existing/i)).toBeNull();
    });
  });
});
