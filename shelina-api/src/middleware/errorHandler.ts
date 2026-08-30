import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../lib/errors.js';

/** 404 for unmatched routes, in the same envelope as every other error. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
}

/**
 * Single error funnel.
 *
 * Operational ApiError, Multer, Zod, and descriptive validation errors
 * are cleanly surfaced to the client with appropriate HTTP status codes.
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

  if (error instanceof multer.MulterError) {
    let message = error.message;
    let status = 400;
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the 50 MB limit. Please upload a smaller file.';
      status = 413;
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field "${error.field || 'file'}".`;
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded at once.';
    }
    res.status(status).json({ success: false, message });
    return;
  }

  /**
   * `express.json()` throws a SyntaxError tagged with a 400 status when the
   * request body is not valid JSON.
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

  const errorId = randomUUID().slice(0, 8);
  console.error(`[api] unhandled error [${errorId}]:`, error);

  // Surface operational error message if available and not an opaque Prisma/database internal
  const rawMsg = error instanceof Error ? error.message : '';
  const isPrismaInternal =
    rawMsg.includes('Invalid `prisma.') ||
    rawMsg.includes('prisma-client') ||
    rawMsg.includes('raw query failed');

  const safeMessage =
    rawMsg && !isPrismaInternal
      ? rawMsg
      : 'An unexpected error occurred. Please try again or check server logs.';

  res.status(500).json({
    success: false,
    message: safeMessage,
    errorId,
  });
}
