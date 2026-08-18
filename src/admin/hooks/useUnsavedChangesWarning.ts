import { useEffect } from 'react';

/**
 * Warns before a full page unload (reload, tab close, external link) while a
 * form has unsaved edits.
 *
 * Scope note (§33 — "do not over-engineer this"): this covers browser-level
 * navigation only. Blocking in-app router navigation reliably needs a data
 * router, which this project does not use, so the forms instead keep Cancel
 * explicit and Save always visible in a sticky bar.
 */
export function useUnsavedChangesWarning(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by older browsers; modern ones show their own generic text.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
