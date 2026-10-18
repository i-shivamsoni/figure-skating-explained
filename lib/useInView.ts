"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * True once the element has scrolled near the viewport (IntersectionObserver with a margin), so
 * heavy content (a WebGL canvas) mounts only when it is about to be seen. `disabled` reports true
 * at once; environments without the observer also report true.
 */
export function useInView<T extends Element>({ rootMargin = "200px", once = true, disabled = false }: { rootMargin?: string; once?: boolean; disabled?: boolean } = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(disabled);
  useEffect(() => {
    const el = ref.current;
    if (disabled || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      // no observer (very old browsers): mount on the next frame
      const id = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) setInView(false);
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once, disabled]);
  return [ref, inView];
}
