import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Traps Tab focus inside an overlay and restores focus to the trigger on close.
 * Required for accessible modals and the mobile navigation drawer.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onEscape?: () => void) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    /**
     * The container ref is read lazily on every attempt rather than captured
     * once. When a portal mounts in the same commit that activates the trap,
     * `containerRef.current` is still null at effect time, so a single rAF can
     * fire before the node exists and focus is silently left outside the
     * dialog. Retry across a few frames until the node is attached.
     */
    let frame = 0;
    let raf = 0;
    const focusFirst = () => {
      const container = containerRef.current;
      if (!container) {
        // Give the portal a few frames to attach before giving up.
        if (frame < 10) {
          frame += 1;
          raf = requestAnimationFrame(focusFirst);
        }
        return;
      }
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      (items.length ? items[0] : container).focus();
    };
    raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }
      const container = containerRef.current;
      if (event.key !== 'Tab' || !container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [active, onEscape]);

  return containerRef;
}
