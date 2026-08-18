import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { readSession } from '../lib/auth.js';

/**
 * Backend authorization.
 *
 * The frontend's route guards are a UX affordance only — every protected
 * endpoint re-checks the session here. Never rely on the client.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
      customerId?: string;
    }
  }
}

/** Requires a valid ADMIN session. A customer cookie will not satisfy this. */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const adminId = readSession(req.cookies ?? {}, 'admin');
    if (!adminId) throw ApiError.unauthorized('Admin authentication required.');

    // Confirm the account still exists — a deleted admin's token must die too.
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { id: true } });
    if (!admin) throw ApiError.unauthorized('Admin authentication required.');

    req.adminId = admin.id;
    next();
  } catch (error) {
    next(error);
  }
}

/** Requires a valid CUSTOMER session. An admin cookie will not satisfy this. */
export async function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  try {
    const customerId = readSession(req.cookies ?? {}, 'customer');
    if (!customerId) throw ApiError.unauthorized('Customer authentication required.');

    const customer = await prisma.customerUser.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) throw ApiError.unauthorized('Customer authentication required.');

    req.customerId = customer.id;
    next();
  } catch (error) {
    next(error);
  }
}
