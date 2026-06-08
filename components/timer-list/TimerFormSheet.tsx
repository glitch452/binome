'use client';

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

  const handleSubmit = (values: TimerFormValues) => {
    if (isEdit) {
      updateTimer(timer.id, values);
    } else {
      addTimer(values);
    }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-2 data-[side=right]:max-sm:w-full">
        <SheetHeader className="pb-1">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <TimerForm initialValues={initialValues} onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
