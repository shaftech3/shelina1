import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';
let previousPadding = '';

/** Locks body scroll (drawer/modal) without causing a layout jump. Supports multiple locks. */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { body } = document;
    if (lockCount === 0) {
      previousOverflow = body.style.overflow;
      previousPadding = body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
      }
    };
  }, [locked]);
}
