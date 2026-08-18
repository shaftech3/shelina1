import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { clearSessionCookie, hashPassword, readSession, setSessionCookie, verifyPassword } from '../lib/auth.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';
import { env } from '../lib/env.js';

export const authRouter = Router();

/**
 * Rate limiting on credential endpoints only — the storefront's read traffic
 * is untouched. This blunts online password guessing without needing an extra
 * security package.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

/**
 * A deliberately identical failure message for "no such account" and "wrong
 * password": distinguishing them tells an attacker which emails are registered.
 */
const INVALID_CREDENTIALS = 'Incorrect email or password.';

/* ───────────────────────────── Admin ───────────────────────────── */

authRouter.post('/admin/login', credentialLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const admin = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
    if (!admin) throw ApiError.unauthorized(INVALID_CREDENTIALS);

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) throw ApiError.unauthorized(INVALID_CREDENTIALS);

    setSessionCookie(res, 'admin', admin.id);
    res.json({
      success: true,
      data: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/admin/logout', (_req, res) => {
  // Clears ONLY the admin cookie. A customer session on the same browser, and
  // the customer's cart, are untouched.
  clearSessionCookie(res, 'admin');
  res.json({ success: true });
});

authRouter.get('/admin/me', async (req, res, next) => {
  try {
    const adminId = readSession(req.cookies ?? {}, 'admin');
    if (!adminId) {
      throw ApiError.unauthorized('Admin authentication required.');
    }
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!admin) {
      throw ApiError.unauthorized('Admin authentication required.');
    }
    res.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Customer ──────────────────────────── */

authRouter.post('/customer/register', credentialLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.customerUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw ApiError.conflict('An account with that email already exists.');

    const customer = await prisma.customerUser.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true },
    });

    setSessionCookie(res, 'customer', customer.id);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/customer/login', credentialLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const customer = await prisma.customerUser.findUnique({ where: { email } });
    if (!customer) throw ApiError.unauthorized(INVALID_CREDENTIALS);

    const valid = await verifyPassword(password, customer.passwordHash);
    if (!valid) throw ApiError.unauthorized(INVALID_CREDENTIALS);

    setSessionCookie(res, 'customer', customer.id);
    res.json({
      success: true,
      data: { id: customer.id, email: customer.email, name: customer.name },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/customer/logout', (_req, res) => {
  // Must never clear the cart — the cart is client-side and belongs to the
  // browser, not the session.
  clearSessionCookie(res, 'customer');
  res.json({ success: true });
});

authRouter.get('/customer/me', async (req, res, next) => {
  try {
    const customerId = readSession(req.cookies ?? {}, 'customer');
    if (!customerId) {
      res.json({ success: true, data: null });
      return;
    }
    const customer = await prisma.customerUser.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, name: true },
    });
    res.json({ success: true, data: customer ?? null });
  } catch (error) {
    next(error);
  }
});
