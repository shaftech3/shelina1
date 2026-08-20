import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from './env.js';

/**
 * ============================================================================
 * AUTHENTICATION PRIMITIVES
 * ============================================================================
 *
 * Two completely separate session systems share this file but never share a
 * token or a cookie:
 *
 *   admin    → cookie `shelina_admin_session`,    audience "admin"
 *   customer → cookie `shelina_customer_session`, audience "customer"
 *
 * A token minted for one audience is rejected by the other's guard, so an
 * admin session can never authorise a customer action and a customer session
 * can never grant admin access — even if a cookie is copied by hand.
 *
 * Tokens are signed JWTs delivered in HttpOnly cookies. They are never
 * readable by JavaScript and never returned in a response body, so the browser
 * bundle holds no secret of any kind.
 */

export type Audience = 'admin' | 'customer';

const COOKIE_NAME: Record<Audience, string> = {
  admin: 'shelina_admin_session',
  customer: 'shelina_customer_session',
};

/** Cost 12 — deliberate: slow enough to matter, fast enough for a login. */
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

interface SessionPayload {
  sub: string;
  aud: Audience;
}

function sign(payload: SessionPayload): string {
  return jwt.sign(payload, env.sessionSecret, {
    expiresIn: Math.floor(env.sessionMaxAgeMs / 1000),
  });
}

/**
 * Reads and verifies a session token for ONE audience.
 * Returns null for a missing, malformed, expired or wrong-audience token.
 */
export function readSession(
  cookies: Record<string, string | undefined>,
  audience: Audience,
): string | null {
  const token = cookies[COOKIE_NAME[audience]];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.sessionSecret) as SessionPayload;
    // The audience check is what keeps admin and customer sessions apart.
    if (decoded.aud !== audience) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, audience: Audience, subject: string): void {
  const isHttps =
    env.isProduction ||
    Boolean(res.req?.secure) ||
    res.req?.headers['x-forwarded-proto'] === 'https' ||
    Boolean(process.env.COOKIE_SECURE);

  res.cookie(COOKIE_NAME[audience], sign({ sub: subject, aud: audience }), {
    httpOnly: true, // never visible to document.cookie
    secure: isHttps, // HTTPS-only (required for sameSite: 'none' and iframes)
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: env.sessionMaxAgeMs,
    path: '/',
  });
}

export function clearSessionCookie(res: Response, audience: Audience): void {
  const isHttps =
    env.isProduction ||
    Boolean(res.req?.secure) ||
    res.req?.headers['x-forwarded-proto'] === 'https' ||
    Boolean(process.env.COOKIE_SECURE);

  res.clearCookie(COOKIE_NAME[audience], {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
  });
}
