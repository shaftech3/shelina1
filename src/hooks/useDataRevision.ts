import { useSyncExternalStore } from 'react';
import { repository } from '@/data/repository';

/**
 * Subscribes to content changes in the shared development repository.
 *
 * Data hooks include the returned revision in their dependency list, so any
 * admin write re-runs the storefront's queries and the change appears without
 * a reload. `useSyncExternalStore` is the built-in React primitive for exactly
 * this — no extra dependency, and it is tear-free under concurrent rendering.
 *
 * In Stage 5 this becomes a no-op (or a cache-invalidation signal) once the
 * server owns the data.
 */
export function useDataRevision(): number {
  return useSyncExternalStore(
    repository.subscribe,
    repository.getRevision,
    repository.getRevision,
  );
}
