import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimerStore } from '@/hooks/useTimerStore';
import { downloadJson } from '@/lib/download';
import { EXPORT_FILE_NAME } from '@/lib/importExport';
import type { TimerConfig } from '@/types/timer';

import { ExportButton } from './ExportButton';

vi.mock('@/hooks/useTimerStore');
vi.mock('@/lib/download');

const SAMPLE_TIMER: TimerConfig = {
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

/**
 * Seed the useTimerStore mock with the given timer list (default: empty).
 * @param timers
 */
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

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore();
  });

  it('renders a button with an accessible name', () => {
    render(<ExportButton />);
    expect(screen.getByRole('button', { name: /export timers/i })).toBeInTheDocument();
  });

  it('is disabled when the timer list is empty', () => {
    render(<ExportButton />);
    expect(screen.getByRole('button', { name: /export timers/i })).toBeDisabled();
  });

  it('is enabled when the timer list has at least one timer', () => {
    mockStore([SAMPLE_TIMER]);
    render(<ExportButton />);
    expect(screen.getByRole('button', { name: /export timers/i })).not.toBeDisabled();
  });

  it('calls downloadJson with the export filename on click', async () => {
    mockStore([SAMPLE_TIMER]);
    render(<ExportButton />);
    await userEvent.click(screen.getByRole('button', { name: /export timers/i }));
    expect(vi.mocked(downloadJson)).toHaveBeenCalledWith(EXPORT_FILE_NAME, expect.anything());
  });

  it('calls downloadJson with the timer envelope on click', async () => {
    mockStore([SAMPLE_TIMER]);
    render(<ExportButton />);
    await userEvent.click(screen.getByRole('button', { name: /export timers/i }));
    expect(vi.mocked(downloadJson)).toHaveBeenCalledWith(expect.anything(), { timers: [SAMPLE_TIMER] });
  });

  it('does not call downloadJson when disabled', async () => {
    render(<ExportButton />);
    await userEvent.click(screen.getByRole('button', { name: /export timers/i }));
    expect(vi.mocked(downloadJson)).not.toHaveBeenCalled();
  });
});
