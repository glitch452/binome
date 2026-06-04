'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/hooks/useTimerStore';
import { parseImportContent } from '@/lib/importExport';
import type { TimerConfig } from '@/types/timer';

import { ImportDialog, type ImportDialogCandidate } from './ImportDialog';

interface ImportButtonProps {
  /** Called with the user-selected timers after the selection dialog is confirmed. */
  onConfirm?: (selected: TimerConfig[]) => void;
}

/**
 * Icon button that reads a JSON file from disk, validates it, and opens the
 * import selection dialog on success. Shows a `sonner` toast on any parse failure.
 * The hidden `<input type="file">` is reset after each pick so re-selecting the
 * same file re-triggers the `change` event.
 * @param root0
 * @param root0.onConfirm
 */
export function ImportButton({ onConfirm }: ImportButtonProps) {
  const { timers } = useTimerStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [candidates, setCandidates] = useState<ImportDialogCandidate[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);
  // Incremented on every new file pick so ImportDialog remounts and re-seeds its
  // checkbox state from the fresh candidates (avoids setState-in-effect).
  const [importKey, setImportKey] = useState(0);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear immediately so the same file can be re-selected later.
    event.target.value = '';

    if (!file) {
      return;
    }

    const text = await file.text();
    const result = parseImportContent(text);

    if (!result.ok) {
      switch (result.reason) {
        case 'json':
          toast.error('Could not import: the file is not valid JSON.');
          break;
        case 'shape':
          toast.error('Could not import: this is not a valid Binome export file.');
          break;
        case 'empty':
          toast.info('No valid timers found in the file.');
          break;
      }
      return;
    }

    const existingIds = new Set(timers.map((t) => t.id));
    setCandidates(result.timers.map((timer) => ({ timer, conflict: existingIds.has(timer.id) })));
    setDroppedCount(result.droppedCount);
    setImportKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleConfirm = (selected: TimerConfig[]) => {
    onConfirm?.(selected);
  };

  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={handleButtonClick} aria-label="Import timers">
        <Upload aria-hidden="true" />
      </Button>
      {/* sr-only keeps the input out of the visual layout while remaining reachable. */}
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={handleFileChange}
      />
      <ImportDialog
        key={importKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidates={candidates}
        droppedCount={droppedCount}
        onConfirm={handleConfirm}
      />
    </>
  );
}
