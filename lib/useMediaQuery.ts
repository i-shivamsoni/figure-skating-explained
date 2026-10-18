"use client";

import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches; `serverDefault` is what the server render assumes. */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/** Tailwind's `sm` breakpoint and up: side docks instead of a bottom sheet. */
export const useIsWide = () => useMediaQuery("(min-width: 640px)", true);
