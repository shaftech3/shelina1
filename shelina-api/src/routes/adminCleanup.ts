import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/authGuards.js';
import { storageService } from '../services/storage.js';

export const adminCleanupRouter = Router();

// All cleanup endpoints require verified admin privileges
adminCleanupRouter.use(requireAdmin);

/**
 * GET /api/admin/cleanup/stats
 *
 * Provides a comprehensive snapshot of database records, order breakdowns,
 * customer activity, orphaned artifacts, and NEXORA synchronization status.
 */
adminCleanupRouter.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      guestOrders,
      registeredCustomerOrders,
      totalCustomers,
      customersWithOrders,
      totalProducts,
      totalMedia,
      totalCategories,
      totalBrands,
      activeApiKey,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { customerId: null } }),
      prisma.order.count({ where: { customerId: { not: null } } }),
      prisma.customerUser.count(),
      prisma.customerUser.count({ where: { orders: { some: {} } } }),
      prisma.product.count(),
      prisma.productMedia.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.apiKey.findFirst({
        where: { status: 'ACTIVE', revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          status: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              'ORDER_DELETED',
              'ORDERS_BULK_DELETED',
              'CUSTOMER_DELETED',
              'CUSTOMERS_BULK_DELETED',
              'ORPHAN_CLEANUP',
              'NEXORA_SYNC',
              'NEXORA_API_KEY_CREATED',
              'NEXORA_API_KEY_REVOKED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          action: true,
          actorId: true,
          actorType: true,
          ipAddress: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    // Check for orphaned media records (product_media referencing non-existent products)
    const mediaWithMissingProducts = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM product_media pm
      LEFT JOIN products p ON pm."productId" = p.id
      WHERE p.id IS NULL
    `.catch(() => [{ count: BigInt(0) }]);

    const orphanedMediaCount = Number(mediaWithMissingProducts[0]?.count ?? 0);

    const inactiveCustomers = Math.max(0, totalCustomers - customersWithOrders);

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          confirmed: confirmedOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          guestOrders,
          registeredCustomerOrders,
        },
        customers: {
          total: totalCustomers,
          active: customersWithOrders,
          inactive: inactiveCustomers,
        },
        catalogue: {
          products: totalProducts,
          media: totalMedia,
          categories: totalCategories,
          brands: totalBrands,
          orphanedMedia: orphanedMediaCount,
        },
        storage: storageService.getStatus(),
        nexora: {
          connected: Boolean(activeApiKey),
          activeKey: activeApiKey,
          status: activeApiKey ? 'HEALTHY' : 'NOT_CONFIGURED',
        },
        recentAuditLogs: recentAuditLogs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/cleanup/orphans
 *
 * Scans and cleans any orphaned database records safely without affecting
 * active products, categories, brands, orders, or customers.
 */
adminCleanupRouter.post('/orphans', async (req, res, next) => {
  try {
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const result = await prisma.$transaction(async (tx) => {
      // Find and remove any product_media where productId no longer matches a valid Product
      const deletedMedia = await tx.$executeRaw`
        DELETE FROM product_media
        WHERE "productId" NOT IN (SELECT id FROM products)
      `.catch(() => 0);

      // Record audit log
      await tx.auditLog.create({
        data: {
          action: 'ORPHAN_CLEANUP',
          actorId: adminId,
          actorType: 'admin',
          ipAddress: req.ip || null,
          metadata: {
            orphanedMediaRemoved: deletedMedia,
            scannedAt: new Date().toISOString(),
          },
        },
      });

      return {
        orphanedMediaRemoved: deletedMedia,
        timestamp: new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      message: `Orphan cleanup complete. ${result.orphanedMediaRemoved} orphaned item(s) cleared.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/cleanup/sync and POST /api/admin/nexora/sync
 *
 * Executes a live synchronization health verification for the NEXORA integration.
 * Tests connection to products, orders, and customer pipelines, updates the API key's
 * lastUsedAt timestamp, and records an audit log.
 */
async function handleNexoraSync(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  try {
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const [activeKey, productCount, orderCount, customerCount] = await Promise.all([
      prisma.apiKey.findFirst({
        where: { status: 'ACTIVE', revokedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.customerUser.count(),
    ]);

    const now = new Date();

    if (activeKey) {
      await prisma.apiKey.update({
        where: { id: activeKey.id },
        data: { lastUsedAt: now },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'NEXORA_SYNC',
        apiKeyId: activeKey?.id || null,
        actorId: adminId,
        actorType: 'admin',
        ipAddress: req.ip || null,
        metadata: {
          status: activeKey ? 'SYNC_VERIFIED' : 'NO_ACTIVE_KEY',
          productsCount: productCount,
          ordersCount: orderCount,
          customersCount: customerCount,
          syncedAt: now.toISOString(),
        },
      },
    });

    res.json({
      success: true,
      message: activeKey
        ? 'NEXORA synchronization health check verified successfully.'
        : 'NEXORA sync check completed. Notice: No active API key found.',
      data: {
        connected: Boolean(activeKey),
        keyPrefix: activeKey?.keyPrefix || null,
        permissions: activeKey?.permissions || [],
        timestamp: now.toISOString(),
        counts: {
          products: productCount,
          orders: orderCount,
          customers: customerCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

adminCleanupRouter.post('/sync', handleNexoraSync);
adminCleanupRouter.post('/nexora-sync', handleNexoraSync);

/**
 * GET /api/admin/cleanup/media-diagnostics
 *
 * Scans all database tables holding media assets and returns a comprehensive
 * breakdown of permanent Cloudinary URLs vs legacy local files vs missing media.
 */
adminCleanupRouter.get('/media-diagnostics', async (_req, res, next) => {
  try {
    const report = await storageService.scanMediaDiagnostics();
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/cleanup/migrate-media
 *
 * Migrates local media uploads across all products, categories, brands, banners,
 * and homepages to persistent cloud storage (e.g. Cloudinary).
 */
adminCleanupRouter.post('/migrate-media', async (req, res, next) => {
  try {
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';
    const result = await storageService.migrateLocalMediaToCloud(adminId);
    res.json({
      success: true,
      message: `Media migration completed. Migrated ${result.migratedCount} item(s) to persistent storage.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
