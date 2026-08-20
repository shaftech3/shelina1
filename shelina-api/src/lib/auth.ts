import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import type { IncomingHttpHeaders } from 'node:http';
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
 * Tokens are signed JWTs delivered in HttpOnly cookies and/or Bearer token headers.
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

export function signSessionToken(audience: Audience, subject: string): string {
  return jwt.sign({ sub: subject, aud: audience }, env.sessionSecret, {
    expiresIn: Math.floor(env.sessionMaxAgeMs / 1000),
  });
}

function sign(payload: SessionPayload): string {
  return jwt.sign(payload, env.sessionSecret, {
    expiresIn: Math.floor(env.sessionMaxAgeMs / 1000),
  });
}

export type SessionRequestSource =
  | Request
  | {
      cookies?: Record<string, string | undefined>;
      headers?: IncomingHttpHeaders | Record<string, string | string[] | undefined>;
    }
  | Record<string, string | undefined>;

/**
 * Reads and verifies a session token for ONE audience.
 * Checks both Authorization: Bearer <token> header and HttpOnly cookie.
 * Returns null for a missing, malformed, expired or wrong-audience token.
 */
export function readSession(
  source: SessionRequestSource | null | undefined,
  audience: Audience,
): string | null {
  if (!source || typeof source !== 'object') return null;

  let token: string | undefined;

  // 1. Check Authorization Bearer header
  if ('headers' in source && source.headers && typeof source.headers === 'object') {
    const headers = source.headers as Record<string, string | string[] | undefined>;
    const rawAuth = headers['authorization'] ?? headers['Authorization'];
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  // 2. Check Cookie
  if (!token) {
    const cookieName = COOKIE_NAME[audience];
    if ('cookies' in source && source.cookies && typeof source.cookies === 'object') {
      token = source.cookies[cookieName];
    } else if (!('headers' in source)) {
      const cookieDict = source as Record<string, string | undefined>;
      token = cookieDict[cookieName];
    }
  }

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
