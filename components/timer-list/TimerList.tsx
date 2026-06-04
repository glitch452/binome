'use client';

import { useContext, useState } from 'react';
import { toast } from 'sonner';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerConfig } from '@/types/timer';

import { ImportExportMenu } from './ImportExportMenu';
import { TimerFormSheet } from './TimerFormSheet';
import { TimerListItem } from './TimerListItem';

export function TimerList() {
  const { timers, deleteTimer, importTimers } = useTimerStore();
  const activeTimer = useContext(ActiveTimerContext);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<TimerConfig | undefined>(undefined);

  const openCreate = () => {
    setEditingTimer(undefined);
    setSheetOpen(true);
  };

  const openEdit = (timer: TimerConfig) => {
    setEditingTimer(timer);
    setSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    if (activeTimer?.state.configId === id) {
      activeTimer.reset();
    }
    deleteTimer(id);
  };

  const handleStart = (id: string) => {
    const timer = timers.find((t) => t.id === id);
    if (timer) {
      activeTimer?.start(id, timer.durationSeconds, timer.countUp);
    }
  };

  const handleImportConfirm = (selected: TimerConfig[]) => {
    // Determine whether the currently-running timer is among the overwrites
    // before modifying the store so we can act on the pre-import state.
    const existingIds = new Set(timers.map((t) => t.id));
    const activeConfigId = activeTimer?.state.configId;
    const activeTimerOverwritten =
      activeConfigId !== null &&
      activeConfigId !== undefined &&
      selected.some((t) => t.id === activeConfigId && existingIds.has(t.id));

    const { added, overwritten } = importTimers(selected);

    if (activeTimerOverwritten) {
      activeTimer?.reset();
    }

    const total = added + overwritten;
    toast.success(`Imported ${total} timer${total !== 1 ? 's' : ''} (${overwritten} overwritten).`);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b p-4">
        <h1 className="text-xl font-bold">Binome</h1>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={openCreate}>
            <Plus />
            New Timer
          </Button>
          <ImportExportMenu onConfirm={handleImportConfirm} />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 p-4">
        {timers.length === 0 ? (
          <p className="text-muted-foreground text-center">
            No timers yet. Click &quot;New Timer&quot; to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timers.map((timer) => (
              <TimerListItem
                key={timer.id}
                timer={timer}
                isActive={
                  activeTimer !== null && activeTimer.state.configId === timer.id && activeTimer.isViewingRunView
                }
                onEdit={openEdit}
                onDelete={handleDelete}
                onStart={handleStart}
              />
            ))}
          </ul>
        )}
      </main>

      <TimerFormSheet open={sheetOpen} onOpenChange={setSheetOpen} timer={editingTimer} />
    </div>
  );
}
