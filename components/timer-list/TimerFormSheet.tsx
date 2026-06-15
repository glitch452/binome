'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerConfig } from '@/types/timer';

import { TimerForm, type TimerFormValues } from './TimerForm';

interface TimerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timer?: TimerConfig;
  cloneFrom?: TimerConfig;
}

export function TimerFormSheet({ open, onOpenChange, timer, cloneFrom }: TimerFormSheetProps) {
  const { addTimer, updateTimer } = useTimerStore();
  const isEdit = timer !== undefined;
  const [isDirty, setIsDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const handleSubmit = (values: TimerFormValues) => {
    if (isEdit) {
      updateTimer(timer.id, values);
    } else {
      addTimer(values);
    }
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleSheetOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleRequestClose();
    }
  };

  const handleDiscard = () => {
    setDiscardOpen(false);
    onOpenChange(false);
  };

  const sourceForValues = isEdit ? timer : cloneFrom;
  const initialValues: Partial<TimerFormValues> | undefined = sourceForValues
    ? {
        name: sourceForValues.name,
        durationSeconds: sourceForValues.durationSeconds,
        flash: sourceForValues.flash,
        sound: sourceForValues.sound,
        soundId: sourceForValues.soundId,
        soundRepeat: sourceForValues.soundRepeat,
        countUp: sourceForValues.countUp,
        hideName: sourceForValues.hideName,
        notify: sourceForValues.notify,
        notifyMode: sourceForValues.notifyMode,
      }
    : undefined;

  const title = isEdit ? 'Edit Timer' : cloneFrom ? 'Copy Timer' : 'New Timer';

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="gap-2 data-[side=right]:max-sm:w-full">
          <SheetHeader className="pb-1">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <TimerForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onCancel={handleRequestClose}
              onDirtyChange={setIsDirty}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>Your unsaved changes will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
