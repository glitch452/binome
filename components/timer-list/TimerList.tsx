'use client';

import { useContext, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerConfig } from '@/types/timer';

import { TimerFormSheet } from './TimerFormSheet';
import { TimerListItem } from './TimerListItem';

export function TimerList() {
  const { timers, deleteTimer } = useTimerStore();
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <h1 className="text-xl font-bold">Binome</h1>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={openCreate}>
            New Timer
          </Button>
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
