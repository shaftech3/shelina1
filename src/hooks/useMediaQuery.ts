import { useEffect, useState } from 'react';

/**
 * Reactive media-query reader.
 *
 * Used where a breakpoint changes *behaviour* rather than styling — the header
 * account menu renders a popover on wide screens and a drawer on narrow ones,
 * which a CSS class cannot express. Anything that is purely visual should stay
 * in Tailwind's responsive variants instead of calling this.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    // Re-sync on mount: the query may have changed between render and effect.
    setMatches(media.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
