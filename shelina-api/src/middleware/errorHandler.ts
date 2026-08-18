import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';

/** 404 for unmatched routes, in the same envelope as every other error. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
}

/**
 * Single error funnel.
 *
 * Only ApiError and validation messages are shown to the client. Anything else
 * is logged server-side and replaced with a generic message so stack traces,
 * SQL errors and connection strings never leak.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies an error handler by its arity; `next` must stay.
  _next: NextFunction,
) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.details ? { errors: error.details } : {}),
    });
    return;
  }

  if (error instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'value';
      if (!details[key]) details[key] = issue.message;
    }
    res.status(400).json({ success: false, message: 'Validation failed.', errors: details });
    return;
  }

  /**
   * `express.json()` throws a SyntaxError tagged with a 400 status when the
   * request body is not valid JSON. That is a client mistake, not a server
   * fault, so it must not be reported as a 500 — and its message quotes the
   * malformed body back, so it is replaced with a fixed string.
   */
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: number }).status === 400 &&
    'body' in error
  ) {
    res.status(400).json({ success: false, message: 'Malformed request body.' });
    return;
  }

  /**
   * Unexpected: log the truth, return a safe message.
   *
   * The response body NEVER carries the error text, even in development.
   * Prisma's messages embed absolute source paths, model names and SQL detail,
   * and a dev-only leak still ends up in screenshots, bug reports and browser
   * consoles. Instead the full error is logged with a short correlation id that
   * is echoed to the client, so a report can be matched to a log line without
   * exposing anything about the internals.
   */
  const errorId = randomUUID().slice(0, 8);
  console.error(`[api] unhandled error [${errorId}]:`, error);
  res.status(500).json({
    success: false,
    message: 'Something went wrong.',
    errorId,
  });
}
