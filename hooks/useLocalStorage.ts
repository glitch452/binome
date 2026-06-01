import { useCallback, useEffect, useRef, useState } from 'react';

function readFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- generic JSON deserialization; caller is responsible for T correctness
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Persists state to localStorage with JSON serialization.
 * SSR-safe: initializes with defaultValue to match server output, then
 * hydrates from localStorage after mount to avoid hydration mismatch.
 * @param key
 * @param defaultValue
 * @param sync - subscribe to storage events for cross-tab synchronization
 * @param sync.sync
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  { sync = false } = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  // Always start with defaultValue so server and client agree on the initial render.
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const defaultValueRef = useRef(defaultValue);

  // Hydrate from localStorage after mount. Runs again if key changes.
  useEffect(() => {
    setStoredValue(readFromStorage(key, defaultValueRef.current));
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(key, JSON.stringify(next));
          } catch {
            // storage quota exceeded — keep state update, skip persist
          }
        }
        return next;
      });
    },
    [key],
  );

  useEffect(() => {
    if (!sync || typeof window === 'undefined') {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null) {
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- generic JSON deserialization; caller is responsible for T correctness
        setStoredValue(JSON.parse(event.newValue) as T);
      } catch {
        // ignore malformed values from other tabs
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, sync]);

  return [storedValue, setValue];
}
