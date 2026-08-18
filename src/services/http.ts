/**
 * Shared service error type.
 *
 * Every service talks to the backend through `apiClient.ts`; this module holds
 * only the error class both it and the individual services throw, so that a
 * `catch` can narrow on one type regardless of which service produced it.
 *
 * The Stage 1 transport helpers that used to live here (`resolveMock`, a second
 * `request()` and a duplicate `API_BASE_URL`) were removed during the Stage 6
 * cleanup: the mock transport is gone, and `apiClient.ts` is now the single
 * REST client.
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
