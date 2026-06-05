import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimerStore } from '@/hooks/useTimerStore';
import { downloadJson } from '@/lib/download';
import { EXPORT_FILE_NAME, parseImportContent } from '@/lib/importExport';
import { toast } from 'sonner';
import type { TimerConfig } from '@/types/timer';

import { ImportExportMenu } from './ImportExportMenu';

vi.mock('@/hooks/useTimerStore');
vi.mock('@/lib/download');
vi.mock('@/lib/importExport', async () => {
  const actual = await vi.importActual<typeof import('@/lib/importExport')>('@/lib/importExport');
  return { ...actual, parseImportContent: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn() } }));

const SAMPLE_TIMER: TimerConfig = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Tea',
  durationSeconds: 180,
  flash: false,
  sound: false,
  soundId: null,
  soundRepeat: 1,
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

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: /import or export timers/i }));
}

async function selectFile(content: string) {
  const file = new File([content], 'test.json', { type: 'application/json' });
  await userEvent.upload(screen.getByTestId('file-input'), file);
}

describe('ImportExportMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore();
  });

  describe('trigger button', () => {
    it('renders a button with an accessible name', () => {
      render(<ImportExportMenu />);
      expect(screen.getByRole('button', { name: /import or export timers/i })).toBeInTheDocument();
    });
  });

  describe('menu', () => {
    it('opens the menu when the trigger is clicked', async () => {
      render(<ImportExportMenu />);
      await openMenu();
      await expect(screen.findByRole('menu')).resolves.toBeInTheDocument();
    });

    it('shows an Export Timers item', async () => {
      render(<ImportExportMenu />);
      await openMenu();
      await expect(screen.findByRole('menuitem', { name: /export timers/i })).resolves.toBeInTheDocument();
    });

    it('shows an Import Timers item', async () => {
      render(<ImportExportMenu />);
      await openMenu();
      await expect(screen.findByRole('menuitem', { name: /import timers/i })).resolves.toBeInTheDocument();
    });
  });

  describe('Export Timers', () => {
    it('is disabled when there are no timers', async () => {
      render(<ImportExportMenu />);
      await openMenu();
      await expect(screen.findByRole('menuitem', { name: /export timers/i })).resolves.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('is enabled when there are timers', async () => {
      mockStore([SAMPLE_TIMER]);
      render(<ImportExportMenu />);
      await openMenu();
      await expect(screen.findByRole('menuitem', { name: /export timers/i })).resolves.not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('calls downloadJson with the filename when clicked', async () => {
      mockStore([SAMPLE_TIMER]);
      render(<ImportExportMenu />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /export timers/i }));
      expect(vi.mocked(downloadJson)).toHaveBeenCalledWith(EXPORT_FILE_NAME, expect.anything());
    });

    it('calls downloadJson with the timer envelope when clicked', async () => {
      mockStore([SAMPLE_TIMER]);
      render(<ImportExportMenu />);
      await openMenu();
      await userEvent.click(await screen.findByRole('menuitem', { name: /export timers/i }));
      expect(vi.mocked(downloadJson)).toHaveBeenCalledWith(expect.anything(), { timers: [SAMPLE_TIMER] });
    });
  });

  describe('Import Timers — parse failures', () => {
    it('shows a toast.error for invalid JSON', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'json' });
      render(<ImportExportMenu />);
      await selectFile('bad json');
      await waitFor(() =>
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('not valid JSON')),
      );
    });

    it('shows a toast.error for a wrong-shape file', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'shape' });
      render(<ImportExportMenu />);
      await selectFile('{}');
      await waitFor(() =>
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('not a valid Binome export file')),
      );
    });

    it('shows a toast.info when no valid timers are found', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: false, reason: 'empty' });
      render(<ImportExportMenu />);
      await selectFile('{"timers":[]}');
      await waitFor(() =>
        expect(vi.mocked(toast.info)).toHaveBeenCalledWith(expect.stringContaining('No valid timers')),
      );
    });
  });

  describe('Import Timers — valid file', () => {
    it('opens the import dialog on a valid file', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [SAMPLE_TIMER], droppedCount: 0 });
      render(<ImportExportMenu />);
      await selectFile('{"timers":[...]}');
      await expect(screen.findByRole('dialog')).resolves.toBeInTheDocument();
    });

    it('flags a timer as a conflict when its id exists in the store', async () => {
      vi.mocked(parseImportContent).mockReturnValue({ ok: true, timers: [SAMPLE_TIMER], droppedCount: 0 });
      mockStore([SAMPLE_TIMER]);
      render(<ImportExportMenu />);
      await selectFile('{"timers":[...]}');
      await expect(screen.findByText(/overwrites existing/i)).resolves.toBeInTheDocument();
    });
  });
});
