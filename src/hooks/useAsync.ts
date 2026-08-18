import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Re-runs the async task; wired to the ErrorState retry action. */
  retry: () => void;
}

/**
 * Generic async resolver used by every data-consuming component.
 * Keeps UI decoupled from the service implementation and gives every screen
 * a consistent loading / error / retry contract.
 *
 * `enabled` defers the task until a precondition is met — used by the
 * customer-scoped hooks so a protected request is never fired before the
 * session has been resolved (which would answer 401 and log a console error).
 * While disabled the state stays in `loading`, so guarded pages show their
 * skeleton rather than flashing an error.
 */
export function useAsync<T>(
  task: () => Promise<T>,
  deps: readonly unknown[] = [],
  enabled = true,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    setLoading(true);
    setError(null);

    taskRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause : new Error('Something went wrong'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, retry };
}
