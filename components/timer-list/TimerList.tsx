'use client';

import { useContext, useState } from 'react';
import { toast } from 'sonner';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AboutDialog } from '@/components/shared/AboutDialog';
import { Brand } from '@/components/shared/Brand';
import { ThemeMenu } from '@/components/shared/ThemeMenu';
import { ActiveTimerContext } from '@/contexts/ActiveTimerContext';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { BuildInfo } from '@/lib/build-info';
import type { TimerConfig } from '@/types/timer';

import { ImportExportMenu } from './ImportExportMenu';
import { TimerFormSheet } from './TimerFormSheet';
import { TimerListItem } from './TimerListItem';
import { UpdateBanner } from './UpdateBanner';

interface TimerListProps {
  update?: BuildInfo | null;
  onDismissUpdate?: () => void;
  onRefresh?: () => void;
}

export function TimerList({
  update = null,
  onDismissUpdate = () => undefined,
  onRefresh = () => undefined,
}: TimerListProps = {}) {
  const { timers, deleteTimer, importTimers } = useTimerStore();
  const activeTimer = useContext(ActiveTimerContext);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<TimerConfig | undefined>(undefined);
  const [cloningTimer, setCloningTimer] = useState<TimerConfig | undefined>(undefined);

  const openCreate = () => {
    setEditingTimer(undefined);
    setCloningTimer(undefined);
    setSheetOpen(true);
  };

  const openEdit = (timer: TimerConfig) => {
    setEditingTimer(timer);
    setCloningTimer(undefined);
    setSheetOpen(true);
  };

  const openClone = (timer: TimerConfig) => {
    setEditingTimer(undefined);
    setCloningTimer(timer);
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
    <div className="relative isolate flex flex-1 flex-col">
      <div className="bg-run-gradient pointer-events-none absolute inset-0 -z-10" />

      <div className="sticky top-0 z-10">
        {update !== null && <UpdateBanner update={update} onDismiss={onDismissUpdate} onRefresh={onRefresh} />}
        <header className="bg-background border-b">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 p-4">
            <Brand onClick={() => setAboutOpen(true)} />
            <div className="flex items-center gap-2">
              <Button type="button" onClick={openCreate}>
                <Plus />
                New Timer
              </Button>
              <ImportExportMenu onConfirm={handleImportConfirm} />
              <ThemeMenu />
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <main className="flex-1 p-4">
          {timers.length === 0 ? (
            <p className="text-muted-foreground text-center">
              No timers yet. Click &quot;New Timer&quot; to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {timers.map((timer, i) => (
                <TimerListItem
                  key={timer.id}
                  timer={timer}
                  index={i}
                  isActive={
                    activeTimer !== null && activeTimer.state.configId === timer.id && activeTimer.isViewingRunView
                  }
                  onEdit={openEdit}
                  onClone={openClone}
                  onDelete={handleDelete}
                  onStart={handleStart}
                />
              ))}
            </ul>
          )}
        </main>

        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
        <TimerFormSheet open={sheetOpen} onOpenChange={setSheetOpen} timer={editingTimer} cloneFrom={cloningTimer} />
      </div>
    </div>
  );
}
