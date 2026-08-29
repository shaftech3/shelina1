import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { nexoraRateLimiter, requireNexoraScope } from '../lib/nexoraAuth.js';

export const nexoraRouter = Router();

/** Formats media URLs to fully-qualified URLs for third-party consumers */
function formatMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://shelina1.onrender.com';
  return `${base.replace(/\/+$/, '')}${cleanPath}`;
}

// Apply rate limiting (60 req/min) to all NEXORA endpoints
nexoraRouter.use(nexoraRateLimiter);

/** Helper for safe integer pagination */
function parsePagination(query: Record<string, unknown>) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/** Helper for updatedSince filtering */
function parseUpdatedSince(val: unknown): Date | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

/* ─────────────────────────── Test & Connection ─────────────────────────── */

/**
 * GET /api/nexora/v1/test
 *
 * Used by NEXORA Custom REST Adapter to test connection and detect available capabilities.
 */
nexoraRouter.get('/test', requireNexoraScope(), async (req, res, next) => {
  try {
    const permissions = req.nexoraApiKey?.permissions || [];
    const capabilities = [
      ...(permissions.includes('products:read') ? ['products', 'products:read'] : []),
      ...(permissions.includes('customers:read') ? ['customers', 'customers:read'] : []),
      ...(permissions.includes('orders:read') ? ['orders', 'orders:read'] : []),
      ...(permissions.includes('inventory:read') ? ['inventory', 'inventory:read'] : []),
    ];

    const [productsCount, ordersCount, customersCount] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customerUser.count(),
    ]);

    const resultPayload = {
      connected: true,
      store: 'Shelina Footwear',
      storeId: 'shelina-store',
      apiVersion: 'v1',
      activeKeyPrefix: req.nexoraApiKey?.keyPrefix,
      capabilities,
      permissions,
      stats: {
        products: productsCount,
        orders: ordersCount,
        customers: customersCount,
        inventory: productsCount,
      },
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      ...resultPayload,
      data: resultPayload,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Store Metadata ─────────────────────────── */

/**
 * GET /api/nexora/v1/store
 *
 * Returns safe business metadata for the store. Never exposes private secrets or DB URLs.
 */
nexoraRouter.get('/store', requireNexoraScope(), async (_req, res, next) => {
  try {
    let settings = await prisma.storeSettings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings) {
      settings = await prisma.storeSettings.findFirst();
    }

    const storePayload = {
      id: 'shelina-store',
      name: 'Shelina Footwear',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      country: 'Pakistan',
      contactEmail: settings?.contactEmail || 'shelinaoffical@gmail.com',
      contactPhone: settings?.contactPhone || '+92 300 1234567',
      whatsappNumber: settings?.whatsappNumber || '+923001234567',
      defaultDeliveryFee: settings?.shippingFee ?? 250,
      freeShippingThreshold: settings?.freeShippingThreshold ?? 0,
      codEnabled: true,
      apiVersion: 'v1',
    };

    res.json({
      success: true,
      data: storePayload,
      store: storePayload,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Products Endpoint ─────────────────────────── */

/**
 * GET /api/nexora/v1/products
 *
 * Returns normalized product data with pagination and incremental updatedSince sync.
 */
nexoraRouter.get('/products', requireNexoraScope('products:read'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const updatedSince = parseUpdatedSince(req.query.updatedSince);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const brand = typeof req.query.brand === 'string' ? req.query.brand.trim() : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

    const where: any = {};

    if (updatedSince) {
      where.updatedAt = { gte: updatedSince };
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = {
        OR: [{ id: category }, { slug: category }, { name: { contains: category, mode: 'insensitive' } }],
      };
    }

    if (brand) {
      where.brand = {
        OR: [{ id: brand }, { slug: brand }, { name: { contains: brand, mode: 'insensitive' } }],
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          media: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, type: true, url: true, alt: true, poster: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = products.map((p) => ({
      id: p.id,
      sku: p.sku || null,
      name: p.name,
      slug: p.slug,
      shortDescription: p.shortDescription || null,
      description: p.description || null,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      brand: p.brand ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug } : null,
      price: p.price,
      salePrice: p.salePrice || null,
      cost: null, // Cost tracking not currently modeled
      currency: 'PKR',
      status: p.status,
      stock: p.stock,
      stockStatus: p.stockStatus,
      deliveryCharge: p.deliveryCharge,
      featured: p.featured,
      newArrival: p.newArrival,
      onSale: p.onSale,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      tags: p.tags,
      images: p.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: formatMediaUrl(m.url),
        alt: m.alt || null,
        poster: m.poster ? formatMediaUrl(m.poster) : null,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.json({
      success: true,
      data,
      products: data,
      items: data,
      pagination,
      meta: pagination,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Customers Endpoint ─────────────────────────── */

/**
 * GET /api/nexora/v1/customers
 *
 * Returns customer data with order metrics. Passwords and security credentials are NEVER returned.
 */
nexoraRouter.get('/customers', requireNexoraScope('customers:read'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const updatedSince = parseUpdatedSince(req.query.updatedSince);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

    const where: any = {};

    if (updatedSince) {
      where.updatedAt = { gte: updatedSince };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customerUser.count({ where }),
      prisma.customerUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            select: {
              id: true,
              grandTotal: true,
              status: true,
              customerPhone: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = customers.map((c) => {
      const validOrders = c.orders.filter((o) => o.status !== 'CANCELLED');
      const totalRevenue = validOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const lastOrder = c.orders[0];
      const phone = lastOrder?.customerPhone || null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone,
        totalOrders: c.orders.length,
        totalRevenue,
        lastOrderAt: lastOrder ? lastOrder.createdAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.json({
      success: true,
      data,
      customers: data,
      items: data,
      pagination,
      meta: pagination,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Orders Endpoint ─────────────────────────── */

/**
 * GET /api/nexora/v1/orders
 *
 * Returns normalized orders and item snapshots.
 */
nexoraRouter.get('/orders', requireNexoraScope('orders:read'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const updatedSince = parseUpdatedSince(req.query.updatedSince);
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const paymentStatus = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus.trim() : undefined;

    const where: any = {};

    if (updatedSince) {
      where.updatedAt = { gte: updatedSince };
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: {
        id: o.customerId || null,
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
      },
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: 'Cash on Delivery (COD)',
      subtotal: o.subtotal,
      shippingFee: o.shippingFee,
      grandTotal: o.grandTotal,
      currency: 'PKR',
      shippingAddress: o.shippingAddress,
      city: o.city,
      province: o.province || null,
      area: o.area || null,
      streetAddress: o.streetAddress || null,
      notes: o.notes || null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId || null,
        sku: i.sku || null,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
        size: i.size || null,
        color: i.color || null,
      })),
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.json({
      success: true,
      data,
      orders: data,
      items: data,
      pagination,
      meta: pagination,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────── Inventory Endpoint ─────────────────────────── */

/**
 * GET /api/nexora/v1/inventory
 *
 * Returns product inventory levels and stock statuses.
 */
nexoraRouter.get('/inventory', requireNexoraScope('inventory:read'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const updatedSince = parseUpdatedSince(req.query.updatedSince);
    const stockStatus = typeof req.query.stockStatus === 'string' ? req.query.stockStatus.trim() : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

    const where: any = {};

    if (updatedSince) {
      where.updatedAt = { gte: updatedSince };
    }

    if (stockStatus) {
      where.stockStatus = stockStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          stock: true,
          stockStatus: true,
          updatedAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const data = products.map((p) => ({
      productId: p.id,
      sku: p.sku || null,
      name: p.name,
      slug: p.slug,
      quantity: p.stock,
      availableQuantity: p.stock,
      reservedQuantity: 0,
      stockStatus: p.stockStatus,
      reorderPoint: 5,
      updatedAt: p.updatedAt.toISOString(),
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.json({
      success: true,
      data,
      inventory: data,
      items: data,
      pagination,
      meta: pagination,
    });
  } catch (error) {
    next(error);
  }
});
