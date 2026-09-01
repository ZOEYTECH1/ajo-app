import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until `delay` milliseconds have elapsed
 * since the last change to `value`.  Use this to avoid triggering expensive
 * operations (API calls, heavy filtering) on every keystroke.
 *
 * @param value - The value to debounce.
 * @param delay - Debounce delay in milliseconds (default: 300 ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
