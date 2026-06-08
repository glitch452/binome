import { useContext } from 'react';

import { AccentContext, type AccentContextValue } from '@/contexts/AccentContext';

export function useAccent(): AccentContextValue {
  const context = useContext(AccentContext);
  if (!context) {
    throw new Error('useAccent must be used within an AccentProvider');
  }
  return context;
}
