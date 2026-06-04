'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/hooks/useTimerStore';
import { downloadJson } from '@/lib/download';
import { EXPORT_FILE_NAME, buildExportObject } from '@/lib/importExport';

/**
 * Icon button that exports the full timer library to a downloaded `binome.json`.
 * Disabled when the library is empty. Intended for the Timer List header.
 */
export function ExportButton() {
  const { timers } = useTimerStore();

  const handleClick = () => {
    downloadJson(EXPORT_FILE_NAME, buildExportObject(timers));
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={timers.length === 0}
      aria-label="Export timers"
    >
      <Download aria-hidden="true" />
    </Button>
  );
}
