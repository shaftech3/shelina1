import { useEffect, useRef, useState } from 'react';

export interface ScrollRevealOptions {
  /** Fraction of the element that must be visible. */
  threshold?: number;
  /** Extra margin around the viewport, e.g. reveal slightly before entry. */
  rootMargin?: string;
  /** Reveal only once (default) or every time it re-enters. */
  once?: boolean;
}

/**
 * IntersectionObserver-backed reveal trigger.
 * Uses a single observer per element and disconnects after firing, so long
 * pages stay cheap. Animation itself is CSS (transform + opacity only).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  { threshold = 0.14, rootMargin = '0px 0px -8% 0px', once = true }: ScrollRevealOptions = {},
) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, revealed };
}
