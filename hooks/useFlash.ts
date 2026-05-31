import { useCallback, useEffect, useRef, useState } from 'react';

import { FLASH_DURATION_MS } from '@/lib/constants';

export interface UseFlashReturn {
  isFlashing: boolean;
  trigger: () => void;
}

export function useFlash(): UseFlashReturn {
  const [isFlashing, setIsFlashing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsFlashing(true);
    timeoutRef.current = setTimeout(() => {
      setIsFlashing(false);
      timeoutRef.current = null;
    }, FLASH_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isFlashing, trigger };
}
