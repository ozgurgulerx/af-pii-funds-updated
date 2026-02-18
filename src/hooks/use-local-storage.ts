"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = newValue instanceof Function ? newValue(prev) : newValue;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        }
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      // ignore
    }
  }, [key]);

  return [value, setStoredValue];
}
