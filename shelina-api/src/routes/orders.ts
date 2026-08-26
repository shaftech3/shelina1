import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError, param } from '../lib/errors.js';
import { requireAdmin, requireCustomer } from '../middleware/authGuards.js';
import { checkoutSchema, orderStatusSchema } from '../validation/schemas.js';
import { serializeOrder } from '../services/serialize.js';
import { createOrder, cancelOrderAndRestoreStock, calculateShipping } from '../services/orders.js';
import { renderInvoicePdf } from '../services/invoice.js';
import { sendEmail } from '../services/email.js';
import {
  allowedTransitions,
  canTransition,
  describeTransitionFailure,
  isOrderStatus,
  type OrderStatus,
} from '../services/orderStatus.js';
import { env } from '../lib/env.js';

export const ordersRouter = Router();
export const adminOrdersRouter = Router();

const ORDER_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' } },
} as const;

/* ═══════════════════════ Customer endpoints ═══════════════════════ */

/**
 * GET /api/orders/shipping-quote
 *
 * Lets the checkout page display the fee the server will actually charge,
 * instead of the browser guessing at it. Declared before `/:id` so the literal
 * path is not swallowed by the parameter route.
 */
ordersRouter.get('/shipping-quote', async (req, res, next) => {
  try {
    const subtotal = Number((req.query as Record<string, string | undefined>).subtotal ?? 0);
    const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? Math.floor(subtotal) : 0;
    const itemsRaw = (req.query as Record<string, string | undefined>).items;

    let itemsWithDelivery: { deliveryCharge?: number | null; quantity: number }[] | undefined;
    if (itemsRaw) {
      try {
        const parsed = JSON.parse(itemsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const productIds = parsed.map((p: { productId?: string }) => String(p.productId)).filter(Boolean);
          const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, deliveryCharge: true },
          });
          const prodMap = new Map(products.map((p) => [p.id, p.deliveryCharge]));
          itemsWithDelivery = parsed.map((p: { productId?: string; quantity?: number }) => ({
            deliveryCharge: prodMap.get(String(p.productId)) ?? 0,
            quantity: Number(p.quantity) || 1,
          }));
        }
      } catch {
        // Fallback to standard subtotal calculation
      }
    }

    let storeShippingFee: number | undefined;
    let storeFreeThreshold: number | undefined;
    try {
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'settings' } });
      if (settings) {
        storeShippingFee = settings.shippingFee;
        storeFreeThreshold = settings.freeShippingThreshold;
      }
    } catch {
      // Fallback
    }

    const freeThreshold = storeFreeThreshold !== undefined ? storeFreeThreshold : env.freeShippingThreshold;
    const shippingFee = calculateShipping(
      safeSubtotal,
      itemsWithDelivery,
      { defaultFee: storeShippingFee, freeThreshold: storeFreeThreshold },
    );

    res.json({
      success: true,
      data: {
        subtotal: safeSubtotal,
        shippingFee,
        freeShippingThreshold: freeThreshold,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders — place an order.
 *
 * Supports both guest checkout and logged-in customer orders.
 * The payload carries what is being bought, never what it costs.
 */
ordersRouter.post('/', async (req, res, next) => {
  try {
    /**
     * Checkout validation is reported as 422 rather than the generic 400 the
     * shared Zod handler produces: the request was well-formed, the details
     * inside it were not. The frontend keys field errors off this response.
     */
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      const details: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'value';
        if (!details[key]) details[key] = issue.message;
      }
      throw ApiError.unprocessable('Invalid checkout information.', details);
    }
    const input = parsed.data;

    // Optional customer identity (null for guest checkout)
    const { readSession } = await import('../lib/auth.js');
    const customerId = readSession(req, 'customer');

    try {
      const order = await createOrder({ ...input, customerId: customerId ?? null });

      // Asynchronously trigger Brevo order confirmation email (non-blocking)
      sendEmail({
        to: order.customerEmail,
        subject: `Order Confirmation — ${order.orderNumber} | Shelina Footwear Atelier`,
        text: `Dear ${order.customerName},\n\nThank you for choosing Shelina. Your order ${order.orderNumber} has been received and is being prepared.\n\nTotal: Rs. ${order.grandTotal.toLocaleString()}\nDelivery City: ${order.city}\nPayment: Cash on Delivery\n\nWarm regards,\nShelina Footwear Atelier`,
        html: `<div style="font-family: sans-serif; color: #1e1e1e; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #63331b; font-family: serif; margin-bottom: 8px;">Shelina Footwear Atelier</h2>
          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${order.customerName},</p>
          <p>Thank you for choosing Shelina. Your order <strong>${order.orderNumber}</strong> has been received and is being prepared by our craftsmen.</p>
          <div style="background-color: #f7f5f2; border: 1px solid #e7e2d9; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p style="margin: 4px 0;"><strong>Total Amount:</strong> Rs. ${order.grandTotal.toLocaleString()}</p>
            <p style="margin: 4px 0;"><strong>Payment Method:</strong> Cash on Delivery (COD)</p>
            <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${order.shippingAddress}, ${order.city}</p>
          </div>
          <p style="color: #6e6b66; font-size: 14px;">If you have any questions regarding your order, please reply directly to this email.</p>
        </div>`,
      }).catch((err) => console.error('[email] Order confirmation dispatch note:', err));

      res.status(201).json({ success: true, data: serializeOrder(order) });
    } catch (error) {
      /**
       * Two requests raced on the same idempotency key and this one lost the
       * unique-constraint fight. That is a success, not a failure: return the
       * order the winner created so a double-click yields exactly one order.
       */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        input.idempotencyKey
      ) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: ORDER_INCLUDE,
        });
        if (existing) {
          res.status(200).json({ success: true, data: serializeOrder(existing) });
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/** GET /api/orders — the signed-in customer's own order history. */
ordersRouter.get('/', requireCustomer, async (req, res, next) => {
  try {
    const { page, pageSize } = req.query as Record<string, string | undefined>;
    const take = Math.min(Math.max(Number(pageSize) || 20, 1), 50);
    const currentPage = Math.max(Number(page) || 1, 1);

    // Scoped to req.customerId, which comes from the verified session cookie —
    // never from a client-supplied id.
    const where = { customerId: req.customerId! };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (currentPage - 1) * take,
        take,
      }),
    ]);

    res.json({
      success: true,
      data: orders.map(serializeOrder),
      meta: { total, page: currentPage, pageSize: take, pageCount: Math.ceil(total / take) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Loads an order for a customer or guest.
 */
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const idOrNumber = param(req.params.id, 'order id');
    const { readSession } = await import('../lib/auth.js');
    const customerId = readSession(req, 'customer');
    const adminId = readSession(req, 'admin');

    let order = null;
    if (adminId) {
      order = await prisma.order.findFirst({
        where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
        include: ORDER_INCLUDE,
      });
    } else if (customerId) {
      order = await prisma.order.findFirst({
        where: { customerId, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
        include: ORDER_INCLUDE,
      });
    } else {
      order = await prisma.order.findFirst({
        where: { customerId: null, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
        include: ORDER_INCLUDE,
      });
    }

    if (!order) throw ApiError.notFound('Order not found.');
    res.json({ success: true, data: serializeOrder(order) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id/invoice — PDF invoice.
 *
 * A customer may download only their own invoice. An admin may download any.
 * A guest may download the invoice for their own guest order.
 */
ordersRouter.get('/:id/invoice', async (req, res, next) => {
  try {
    const idOrNumber = param(req.params.id, 'order id');
    const { readSession } = await import('../lib/auth.js');

    const customerId = readSession(req, 'customer');
    const adminId = readSession(req, 'admin');

    const order = adminId
      ? await prisma.order.findFirst({
          where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
          include: ORDER_INCLUDE,
        })
      : customerId
      ? await prisma.order.findFirst({
          where: { customerId: customerId, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
          include: ORDER_INCLUDE,
        })
      : await prisma.order.findFirst({
          where: { customerId: null, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
          include: ORDER_INCLUDE,
        });

    if (!order) throw ApiError.notFound('Order not found.');

    // Rendered purely from stored snapshots — no Product lookup anywhere.
    const pdf = await renderInvoicePdf({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      city: order.city,
      notes: order.notes,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      grandTotal: order.grandTotal,
      items: order.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="shelina-${order.orderNumber}.pdf"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.end(pdf);
  } catch (error) {
    next(error);
  }
});

/* ═══════════════════════ Admin endpoints ═══════════════════════ */

/**
 * GET /api/admin/orders — every order, with search, status filter and sorting.
 * Admin session required; a customer cookie will not satisfy `requireAdmin`.
 */
adminOrdersRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { search, status, sort, page, pageSize } = req.query as Record<string, string | undefined>;

    const where: Prisma.OrderWhereInput = {};

    if (status && isOrderStatus(status)) where.status = status;

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerEmail: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'total-high'
          ? { grandTotal: 'desc' }
          : sort === 'total-low'
            ? { grandTotal: 'asc' }
            : { createdAt: 'desc' };

    const take = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy,
        skip: (currentPage - 1) * take,
        take,
      }),
    ]);

    res.json({
      success: true,
      data: orders.map(serializeOrder),
      meta: { total, page: currentPage, pageSize: take, pageCount: Math.ceil(total / take) || 1 },
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/admin/orders/:id — any order. */
adminOrdersRouter.get('/:id', requireAdmin, async (req, res, next) => {
  try {
    const idOrNumber = param(req.params.id, 'order id');
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
      include: ORDER_INCLUDE,
    });
    if (!order) throw ApiError.notFound('Order not found.');
    res.json({
      success: true,
      data: {
        ...serializeOrder(order),
        allowedTransitions: allowedTransitions(order.status as OrderStatus),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 *
 * Only an admin may move an order, and only along a sensible path. Cancelling
 * also returns the reserved units to stock — exactly once, guarded inside the
 * same transaction.
 */
adminOrdersRouter.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = param(req.params.id, 'order id');
    const { status } = orderStatusSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!order) throw ApiError.notFound('Order not found.');

      const from = order.status as OrderStatus;
      if (!canTransition(from, status)) {
        throw ApiError.conflict(describeTransitionFailure(from, status));
      }

      if (status === 'CANCELLED') {
        await cancelOrderAndRestoreStock(tx, id);
      } else {
        await tx.order.update({ where: { id }, data: { status } });
      }

      return tx.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    });

    if (!updated) throw ApiError.notFound('Order not found.');

    res.json({
      success: true,
      data: {
        ...serializeOrder(updated),
        allowedTransitions: allowedTransitions(updated.status as OrderStatus),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/orders/bulk and POST /api/admin/orders/bulk-delete
 *
 * Allows an authorized admin to bulk-delete multiple selected orders safely.
 * Placed before `/:id` so the literal word 'bulk' is not captured as an id.
 */
async function handleBulkDeleteOrders(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  try {
    const rawIds = req.body?.ids || (req.query?.ids ? String(req.query.ids).split(',') : []);
    const ids = Array.isArray(rawIds)
      ? rawIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      throw ApiError.badRequest('No order IDs provided for deletion.');
    }

    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const result = await prisma.$transaction(async (tx) => {
      // Find orders to be deleted
      const orders = await tx.order.findMany({
        where: {
          OR: [{ id: { in: ids } }, { orderNumber: { in: ids } }],
        },
        select: {
          id: true,
          orderNumber: true,
          grandTotal: true,
          customerName: true,
          customerEmail: true,
          status: true,
        },
      });

      if (orders.length === 0) {
        return { count: 0, deletedIds: [] };
      }

      const foundIds = orders.map((o) => o.id);

      // Explicitly delete order items first to ensure foreign-key constraints are satisfied
      await tx.orderItem.deleteMany({
        where: { orderId: { in: foundIds } },
      });

      // Delete the orders
      const deleteResult = await tx.order.deleteMany({
        where: { id: { in: foundIds } },
      });

      // Record audit log for destructive action
      await tx.auditLog.create({
        data: {
          action: 'ORDERS_BULK_DELETED',
          actorId: adminId,
          actorType: 'admin',
          ipAddress: req.ip || null,
          metadata: {
            deletedCount: deleteResult.count,
            orders: orders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              customerEmail: o.customerEmail,
              grandTotal: o.grandTotal,
              status: o.status,
            })),
          },
        },
      });

      return { count: deleteResult.count, deletedIds: foundIds };
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.count} order(s).`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

adminOrdersRouter.delete('/bulk', requireAdmin, handleBulkDeleteOrders);
adminOrdersRouter.post('/bulk-delete', requireAdmin, handleBulkDeleteOrders);

/**
 * DELETE /api/admin/orders/:id
 *
 * Permanently deletes a single order. Dependent OrderItems are removed cleanly,
 * referential integrity is preserved, and an audit log is recorded.
 */
adminOrdersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const idOrNumber = param(req.params.id, 'order id');
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const deleted = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          grandTotal: true,
          status: true,
          createdAt: true,
        },
      });

      if (!order) {
        throw ApiError.notFound('Order not found.');
      }

      // Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      // Delete the order
      await tx.order.delete({
        where: { id: order.id },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          action: 'ORDER_DELETED',
          actorId: adminId,
          actorType: 'admin',
          ipAddress: req.ip || null,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            grandTotal: order.grandTotal,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
          },
        },
      });

      return order;
    });

    res.json({
      success: true,
      message: `Order ${deleted.orderNumber} was deleted successfully.`,
      data: {
        id: deleted.id,
        orderNumber: deleted.orderNumber,
      },
    });
  } catch (error) {
    next(error);
  }
});

