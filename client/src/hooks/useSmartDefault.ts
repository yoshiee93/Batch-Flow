import { useCallback } from 'react';

const PREFIX = 'smartDefault:';

export function useSmartDefault(key: string) {
  const storageKey = `${PREFIX}${key}`;

  const get = useCallback((): string => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  }, [storageKey]);

  const set = useCallback((value: string) => {
    try {
      if (value) {
        localStorage.setItem(storageKey, value);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
    }
  }, [storageKey]);

  return { get, set };
}
