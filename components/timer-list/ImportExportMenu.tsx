'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Menu as MenuIcon, Upload } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { MenuItem, MenuPopup, MenuPortal, MenuPositioner, MenuRoot, MenuTrigger } from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { useTimerStore } from '@/hooks/useTimerStore';
import { downloadJson } from '@/lib/download';
import { EXPORT_FILE_NAME, buildExportObject, parseImportContent } from '@/lib/importExport';
import type { TimerConfig } from '@/types/timer';

import { ImportDialog, type ImportDialogCandidate } from './ImportDialog';

interface ImportExportMenuProps {
  /** Called with the user-selected timers after the import selection dialog is confirmed. */
  onConfirm?: (selected: TimerConfig[]) => void;
}

/**
 * A single icon button (hamburger / menu icon) that opens a small popup menu
 * containing Export Timers and Import Timers actions.
 * @param root0
 * @param root0.onConfirm
 */
export function ImportExportMenu({ onConfirm }: ImportExportMenuProps) {
  const { timers } = useTimerStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [candidates, setCandidates] = useState<ImportDialogCandidate[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);
  const [importKey, setImportKey] = useState(0);

  const handleExport = () => {
    downloadJson(EXPORT_FILE_NAME, buildExportObject(timers));
  };

  const handleImportClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      <MenuRoot>
        <MenuTrigger
          render={
            // Use a plain <button> (not ButtonPrimitive) so base-ui can attach
            // its own event handlers without conflicting with another base-ui component.
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
              aria-label="Import or export timers"
            >
              <MenuIcon aria-hidden="true" />
            </button>
          }
        />
        <MenuPortal>
          <MenuPositioner sideOffset={8} align="end">
            <MenuPopup>
              <MenuItem onClick={handleExport} disabled={timers.length === 0}>
                <Download aria-hidden="true" />
                Export Timers
              </MenuItem>
              <MenuItem onClick={handleImportClick}>
                <Upload aria-hidden="true" />
                Import Timers
              </MenuItem>
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </MenuRoot>

      {/* Hidden file input — triggered programmatically by the Import menu item. */}
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
