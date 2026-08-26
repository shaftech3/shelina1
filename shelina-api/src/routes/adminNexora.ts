import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/authGuards.js';
import {
  DEFAULT_NEXORA_PERMISSIONS,
  generateNexoraKey,
  recordNexoraAuditLog,
} from '../lib/nexoraAuth.js';
import { ApiError } from '../lib/errors.js';

export const adminNexoraRouter = Router();

// All routes require valid Admin session
adminNexoraRouter.use(requireAdmin);

/**
 * GET /api/admin/integrations/nexora
 *
 * Fetches the active NEXORA integration state, active/past keys, and recent audit logs.
 */
adminNexoraRouter.get('/', async (_req, res, next) => {
  try {
    const [activeKey, allKeys, auditLogs, totalProducts, totalOrders, totalCustomers] = await Promise.all([
      prisma.apiKey.findFirst({
        where: { status: 'ACTIVE', revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          status: true,
          createdBy: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      }),
      prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          status: true,
          createdBy: true,
          createdAt: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'NEXORA_API_KEY_CREATED',
              'NEXORA_API_KEY_REVOKED',
              'NEXORA_API_KEY_REGENERATED',
              'NEXORA_API_KEY_USED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          apiKeyId: true,
          actorId: true,
          actorType: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.customerUser.count(),
    ]);

    const isConnected = Boolean(activeKey);

    res.json({
      success: true,
      data: {
        connected: isConnected,
        activeKey: activeKey || null,
        history: allKeys,
        auditLogs,
        store: {
          id: 'shelina-store',
          name: 'Shelina Footwear',
          currency: 'PKR',
          timezone: 'Asia/Karachi',
          apiVersion: 'v1',
          stats: {
            products: totalProducts,
            orders: totalOrders,
            customers: totalCustomers,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/integrations/nexora/keys
 *
 * Generates a new NEXORA API Key. Returns the full secret token ONCE.
 */
adminNexoraRouter.post('/keys', async (req, res, next) => {
  try {
    const permissions = Array.isArray(req.body?.permissions) && req.body.permissions.length > 0
      ? req.body.permissions.map(String)
      : [...DEFAULT_NEXORA_PERMISSIONS];

    const name = typeof req.body?.name === 'string' && req.body.name.trim()
      ? req.body.name.trim()
      : 'NEXORA Integration';

    const { secretKey, keyPrefix, keyHash } = generateNexoraKey(permissions);

    // Revoke any previous active keys if user is replacing
    if (req.body?.replaceActive !== false) {
      await prisma.apiKey.updateMany({
        where: { status: 'ACTIVE', revokedAt: null },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash,
        permissions,
        createdBy: req.adminId || 'Admin',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        status: true,
        createdBy: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    await recordNexoraAuditLog({
      action: 'NEXORA_API_KEY_CREATED',
      apiKeyId: apiKey.id,
      actorId: req.adminId || 'Admin',
      actorType: 'admin',
      ipAddress: req.ip || req.socket.remoteAddress,
      metadata: { keyPrefix, permissions },
    });

    res.status(201).json({
      success: true,
      data: {
        apiKey,
        secretKey, // ONLY RETURNED ONCE!
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/integrations/nexora/keys/:id/revoke
 *
 * Immediately revokes an API key.
 */
adminNexoraRouter.post('/keys/:id/revoke', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw ApiError.badRequest('API key ID is required.');

    const targetKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!targetKey) throw ApiError.notFound('API key not found.');

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        status: true,
        revokedAt: true,
      },
    });

    await recordNexoraAuditLog({
      action: 'NEXORA_API_KEY_REVOKED',
      apiKeyId: updated.id,
      actorId: req.adminId || 'Admin',
      actorType: 'admin',
      ipAddress: req.ip || req.socket.remoteAddress,
      metadata: { keyPrefix: updated.keyPrefix },
    });

    res.json({
      success: true,
      data: updated,
      message: 'API key revoked successfully. NEXORA access has been terminated.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/integrations/nexora/keys/:id/regenerate
 *
 * Invalidate current key and generate a replacement key immediately.
 */
adminNexoraRouter.post('/keys/:id/regenerate', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw ApiError.badRequest('API key ID is required.');

    const oldKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!oldKey) throw ApiError.notFound('Existing API key not found.');

    // Revoke old key
    await prisma.apiKey.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    // Generate new key with same permissions
    const permissions = oldKey.permissions.length > 0 ? oldKey.permissions : [...DEFAULT_NEXORA_PERMISSIONS];
    const { secretKey, keyPrefix, keyHash } = generateNexoraKey(permissions);

    const newKey = await prisma.apiKey.create({
      data: {
        name: oldKey.name || 'NEXORA Integration',
        keyPrefix,
        keyHash,
        permissions,
        createdBy: req.adminId || 'Admin',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        status: true,
        createdBy: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    await recordNexoraAuditLog({
      action: 'NEXORA_API_KEY_REGENERATED',
      apiKeyId: newKey.id,
      actorId: req.adminId || 'Admin',
      actorType: 'admin',
      ipAddress: req.ip || req.socket.remoteAddress,
      metadata: {
        previousKeyId: oldKey.id,
        previousKeyPrefix: oldKey.keyPrefix,
        newKeyPrefix: keyPrefix,
      },
    });

    res.json({
      success: true,
      data: {
        apiKey: newKey,
        secretKey, // ONLY RETURNED ONCE!
      },
      message: 'Old key invalidated and replacement key generated successfully.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/integrations/nexora/test
 *
 * Self-test connection verification.
 */
adminNexoraRouter.post('/test', async (_req, res, next) => {
  try {
    const activeKey = await prisma.apiKey.findFirst({
      where: { status: 'ACTIVE', revokedAt: null },
    });

    if (!activeKey) {
      const inactiveResult = {
        connected: false,
        message: 'No active NEXORA API key configured. Generate an API key to connect NEXORA.',
      };
      res.json({
        success: false,
        ...inactiveResult,
        data: inactiveResult,
      });
      return;
    }

    const [productsCount, ordersCount, customersCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customerUser.count(),
    ]);

    const activeResult = {
      connected: true,
      message: 'NEXORA integration connection test successful!',
      store: 'Shelina Footwear',
      apiVersion: 'v1',
      activeKeyPrefix: activeKey.keyPrefix,
      capabilities: [
        'products:read',
        'customers:read',
        'orders:read',
        'inventory:read',
      ],
      stats: {
        products: productsCount,
        orders: ordersCount,
        customers: customersCount,
      },
    };

    res.json({
      success: true,
      ...activeResult,
      data: activeResult,
    });
  } catch (error) {
    next(error);
  }
});
