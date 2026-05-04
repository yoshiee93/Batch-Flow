import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const PREFIX = 'smartDefault:';

export function useSmartDefault(key: string) {
  const { user } = useAuth();
  const userId = user?.id ?? '_anon';
  const storageKey = `${PREFIX}${userId}:${key}`;

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
