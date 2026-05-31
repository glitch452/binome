'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTimerStore } from '@/hooks/useTimerStore';
import type { TimerConfig } from '@/types/timer';

import { TimerForm, type TimerFormValues } from './TimerForm';

interface TimerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timer?: TimerConfig;
}

export function TimerFormSheet({ open, onOpenChange, timer }: TimerFormSheetProps) {
  const { addTimer, updateTimer } = useTimerStore();
  const isEdit = timer !== undefined;

  const handleSubmit = (values: TimerFormValues) => {
    if (isEdit) {
      updateTimer(timer.id, values);
    } else {
      addTimer(values);
    }
    onOpenChange(false);
  };

  const initialValues: Partial<TimerFormValues> | undefined = isEdit
    ? {
        name: timer.name,
        durationSeconds: timer.durationSeconds,
        flash: timer.flash,
        sound: timer.sound,
        soundId: timer.soundId,
        countUp: timer.countUp,
      }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Timer' : 'New Timer'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <TimerForm initialValues={initialValues} onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
