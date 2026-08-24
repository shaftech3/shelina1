import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';
import { ApiError } from './errors.js';

export const DEFAULT_NEXORA_PERMISSIONS = [
  'products:read',
  'customers:read',
  'orders:read',
  'inventory:read',
] as const;

export type NexoraPermission =
  | 'products:read'
  | 'customers:read'
  | 'orders:read'
  | 'inventory:read'
  | 'products:write'
  | 'inventory:write';

export interface NexoraKeyGenerationResult {
  secretKey: string; // Shown only once
  keyPrefix: string; // Safe prefix for identification
  keyHash: string; // SHA-256 hash stored in DB
  permissions: string[];
}

/**
 * Generates a cryptographically secure random API key for NEXORA.
 * Format: nex_live_<48 hex chars>
 * Uses Node.js crypto.randomBytes for high entropy.
 */
export function generateNexoraKey(
  permissions: string[] = [...DEFAULT_NEXORA_PERMISSIONS],
): NexoraKeyGenerationResult {
  const randomEntropy = crypto.randomBytes(24).toString('hex'); // 48 chars
  const secretKey = `nex_live_${randomEntropy}`;
  const keyPrefix = `nex_live_${randomEntropy.slice(0, 8)}...`;
  const keyHash = hashNexoraKey(secretKey);

  return {
    secretKey,
    keyPrefix,
    keyHash,
    permissions,
  };
}

/**
 * Computes a secure one-way SHA-256 hash of a NEXORA secret key.
 */
export function hashNexoraKey(secretKey: string): string {
  return crypto.createHash('sha256').update(secretKey.trim()).digest('hex');
}

/**
 * Records an auditable event in the audit_logs table.
 * Crucial rule: Never record the full raw API secret in logs.
 */
export async function recordNexoraAuditLog(params: {
  action: 'NEXORA_API_KEY_CREATED' | 'NEXORA_API_KEY_REVOKED' | 'NEXORA_API_KEY_REGENERATED' | 'NEXORA_API_KEY_USED';
  apiKeyId?: string | null;
  actorId?: string | null;
  actorType?: 'admin' | 'system' | 'api_key';
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        apiKeyId: params.apiKeyId || null,
        actorId: params.actorId || null,
        actorType: params.actorType || 'admin',
        ipAddress: params.ipAddress || null,
        metadata: params.metadata ? (params.metadata as any) : {},
      },
    });
  } catch (error) {
    // Non-blocking for request flow, log to console
    console.error('[audit] Failed to write audit log:', error instanceof Error ? error.message : error);
  }
}

// ─────────────────────────── Rate Limiter ───────────────────────────

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60; // 60 req/min

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export function nexoraRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const authHeader = req.headers.authorization || '';
  const identifier = authHeader ? hashNexoraKey(authHeader.replace(/^Bearer\s+/i, '')) : `ip_${ip}`;

  const now = Date.now();
  let bucket = rateLimitStore.get(identifier);

  if (!bucket || now > bucket.resetTime) {
    bucket = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(identifier, bucket);
  } else {
    bucket.count += 1;
  }

  const remaining = Math.max(0, MAX_REQUESTS_PER_MINUTE - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetSeconds);

  if (bucket.count > MAX_REQUESTS_PER_MINUTE) {
    res.setHeader('Retry-After', resetSeconds);
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `NEXORA API rate limit exceeded (max ${MAX_REQUESTS_PER_MINUTE} req/min). Please retry in ${resetSeconds} seconds.`,
      retryAfterSeconds: resetSeconds,
    });
    return;
  }

  next();
}

// ─────────────────────────── Auth Middleware ───────────────────────────

declare global {
  namespace Express {
    interface Request {
      nexoraApiKey?: {
        id: string;
        name: string;
        keyPrefix: string;
        permissions: string[];
        status: string;
        createdBy?: string | null;
      };
      nexoraStore?: {
        id: string;
        name: string;
        currency: string;
        timezone: string;
      };
    }
  }
}

// Throttle lastUsedAt updates and audit log to once every 2 minutes per key
const lastUsedUpdateMap = new Map<string, number>();

/**
 * Dedicated API-key authentication middleware for NEXORA.
 *
 * Flow:
 * 1. Extract Bearer token from Authorization header.
 * 2. Hash token using SHA-256.
 * 3. Find matching ApiKey in database.
 * 4. Verify status is ACTIVE, not revoked, and not expired.
 * 5. Verify requested permission scope if specified.
 * 6. Attach key context & store info to request.
 */
export function requireNexoraScope(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Missing or invalid Authorization header. Expected: Bearer <API_KEY>');
      }

      const rawToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!rawToken) {
        throw ApiError.unauthorized('NEXORA API key cannot be empty.');
      }

      // Hash the incoming key to look up in database
      const keyHash = hashNexoraKey(rawToken);

      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
      });

      if (!apiKey) {
        throw ApiError.unauthorized('Invalid NEXORA API key.');
      }

      if (apiKey.status !== 'ACTIVE' || apiKey.revokedAt) {
        throw ApiError.unauthorized('This NEXORA API key has been revoked or is inactive.');
      }

      if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
        throw ApiError.unauthorized('This NEXORA API key has expired.');
      }

      // Scope permission check
      if (requiredScope && !apiKey.permissions.includes(requiredScope)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Insufficient permissions. This endpoint requires the '${requiredScope}' scope.`,
          authorizedScopes: apiKey.permissions,
        });
        return;
      }

      // Populate request context
      req.nexoraApiKey = {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        status: apiKey.status,
        createdBy: apiKey.createdBy,
      };

      req.nexoraStore = {
        id: 'shelina-store',
        name: 'Shelina Footwear',
        currency: 'PKR',
        timezone: 'Asia/Karachi',
      };

      // Asynchronously update lastUsedAt without slowing down response
      const now = Date.now();
      const lastRecorded = lastUsedUpdateMap.get(apiKey.id) || 0;
      if (now - lastRecorded > 2 * 60 * 1000) {
        lastUsedUpdateMap.set(apiKey.id, now);
        prisma.apiKey
          .update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {});

        recordNexoraAuditLog({
          action: 'NEXORA_API_KEY_USED',
          apiKeyId: apiKey.id,
          actorId: apiKey.id,
          actorType: 'api_key',
          ipAddress: req.ip || req.socket.remoteAddress,
          metadata: {
            path: req.originalUrl || req.path,
            method: req.method,
            userAgent: req.headers['user-agent'] || 'NEXORA',
          },
        }).catch(() => {});
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
