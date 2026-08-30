/**
 * Consistent API error shape:  { success: false, message: string }
 *
 * Anything thrown that is NOT an ApiError is treated as unexpected: the real
 * reason is logged server-side and the client gets a generic message, so stack
 * traces, SQL text and credentials never reach a response body.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    /** Optional field-level detail for form validation. */
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: Record<string, string>) {
    return new ApiError(message, 400, details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(message, 401);
  }
  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(message, 403);
  }
  static notFound(message = 'Not found.') {
    return new ApiError(message, 404);
  }
  static conflict(message: string) {
    return new ApiError(message, 409);
  }
  static payloadTooLarge(message = 'File or payload too large.') {
    return new ApiError(message, 413);
  }
  /** 422 — well-formed request, but the submitted information is not usable. */
  static unprocessable(message: string, details?: Record<string, string>) {
    return new ApiError(message, 422, details);
  }
  static internal(message = 'Internal server error.') {
    return new ApiError(message, 500);
  }
}

/**
 * Express 5 types route params as `string | string[]` (a path can repeat a
 * name). Every route here expects a single value, so narrow it once, safely,
 * instead of casting at each call site.
 */
export function param(value: string | string[] | undefined, name: string): string {
  const single = Array.isArray(value) ? value[0] : value;
  if (!single) throw ApiError.badRequest(`Missing ${name}.`);
  return single;
}
