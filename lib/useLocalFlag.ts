"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * A boolean kept in localStorage ("1" when set). `fallback` is what the server render and a
 * blocked storage report; choose it so a returning visitor sees no flash.
 */
export function useLocalFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (v: boolean) => {
      try {
        if (v) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      } catch {
        /* private mode */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
