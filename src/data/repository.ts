/**
 * ============================================================================
 * DATA REVISION SIGNAL  (Stage 5)
 * ============================================================================
 *
 * This file used to be the local mock repository — the single mutable store
 * behind every service, persisted to localStorage.
 *
 * That role now belongs to PostgreSQL, reached through the REST API. The
 * browser holds no catalogue state at all, so there is nothing left to store.
 *
 * What remains is the piece the UI still genuinely needs: a revision counter
 * that says "server data changed, re-run your queries". Every catalogue,
 * content and admin hook already includes `useDataRevision()` in its
 * dependency list, so bumping this after a successful mutation refreshes the
 * admin table AND the storefront without a reload — exactly the behaviour
 * Stage 4 had, with no hook or component rewritten.
 *
 * `slugify` stays here because the admin forms use it to suggest a slug while
 * typing. The authoritative, collision-checked slug is generated on the server.
 */

let revision = 0;
const listeners = new Set<() => void>();

export const repository = {
  /** Subscribe to data-change notifications (used by useSyncExternalStore). */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getRevision(): number {
    return revision;
  },

  /**
   * Called by services after a successful write. Invalidates every mounted
   * query so views reflect the new server state.
   */
  invalidate(): void {
    revision += 1;
    listeners.forEach((listener) => listener());
  },
};

/** URL-safe slug. Mirrors the server's implementation for live suggestions. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
