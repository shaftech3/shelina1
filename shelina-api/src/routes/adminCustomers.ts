import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError, param } from '../lib/errors.js';
import { requireAdmin } from '../middleware/authGuards.js';

export const adminCustomersRouter = Router();

// All customer management endpoints require verified admin privileges
adminCustomersRouter.use(requireAdmin);

/**
 * GET /api/admin/customers
 *
 * Lists registered customers with pagination, keyword search (name, email),
 * sorting (newest, oldest, orders-high, spent-high), order metrics, and total spend.
 */
adminCustomersRouter.get('/', async (req, res, next) => {
  try {
    const { search, sort, page, pageSize } = req.query as Record<string, string | undefined>;

    const where: Prisma.CustomerUserWhereInput = {};

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;

    // Standard Prisma ordering for database-level sorts
    let orderBy: Prisma.CustomerUserOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'name-asc') {
      orderBy = { name: 'asc' };
    }

    const [total, customers] = await Promise.all([
      prisma.customerUser.count({ where }),
      prisma.customerUser.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          orders: {
            select: {
              id: true,
              orderNumber: true,
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

    let data = customers.map((c) => {
      const validOrders = c.orders.filter((o) => o.status !== 'CANCELLED');
      const totalSpent = validOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const lastOrder = c.orders[0];
      const phone = lastOrder?.customerPhone || null;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone,
        orderCount: c.orders.length,
        validOrderCount: validOrders.length,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    // In-memory sort if client requested ordering by calculated order metrics
    if (sort === 'orders-high') {
      data.sort((a, b) => b.orderCount - a.orderCount);
    } else if (sort === 'spent-high') {
      data.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    res.json({
      success: true,
      data,
      meta: {
        total,
        page: currentPage,
        pageSize: take,
        pageCount: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/customers/:id
 *
 * Detailed customer profile, including complete order history.
 */
adminCustomersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = param(req.params.id, 'customer id');
    const customer = await prisma.customerUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            grandTotal: true,
            status: true,
            paymentStatus: true,
            customerPhone: true,
            city: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                quantity: true,
                lineTotal: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found.');
    }

    const validOrders = customer.orders.filter((o) => o.status !== 'CANCELLED');
    const totalSpent = validOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const lastOrder = customer.orders[0];

    res.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: lastOrder?.customerPhone || null,
        orderCount: customer.orders.length,
        totalSpent,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        orders: customer.orders.map((o) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk delete customer handler
 */
async function handleBulkDeleteCustomers(
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
      throw ApiError.badRequest('No customer IDs provided for deletion.');
    }

    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const result = await prisma.$transaction(async (tx) => {
      const customers = await tx.customerUser.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          email: true,
          _count: { select: { orders: true } },
        },
      });

      if (customers.length === 0) {
        return { count: 0, deletedIds: [] };
      }

      const foundIds = customers.map((c) => c.id);

      // Decouple existing historical orders by setting customerId to null.
      // This guarantees that past purchase records and guest checkout are NEVER destroyed or broken!
      await tx.order.updateMany({
        where: { customerId: { in: foundIds } },
        data: { customerId: null },
      });

      // Delete customer user accounts
      const deleteResult = await tx.customerUser.deleteMany({
        where: { id: { in: foundIds } },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          action: 'CUSTOMERS_BULK_DELETED',
          actorId: adminId,
          actorType: 'admin',
          ipAddress: req.ip || null,
          metadata: {
            deletedCount: deleteResult.count,
            customers: customers.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              retainedOrdersCount: c._count.orders,
            })),
          },
        },
      });

      return { count: deleteResult.count, deletedIds: foundIds };
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.count} customer account(s). Historical orders have been safely preserved as guest orders.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

adminCustomersRouter.delete('/bulk', handleBulkDeleteCustomers);
adminCustomersRouter.post('/bulk-delete', handleBulkDeleteCustomers);

/**
 * DELETE /api/admin/customers/:id
 *
 * Deletes an individual customer account.
 * Historical orders are safely dissociated (customerId -> null) so purchase history
 * remains accessible as guest orders and referential integrity is preserved.
 */
adminCustomersRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = param(req.params.id, 'customer id');
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';

    const deleted = await prisma.$transaction(async (tx) => {
      const customer = await tx.customerUser.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      });

      if (!customer) {
        throw ApiError.notFound('Customer not found.');
      }

      // Safely decouple historical orders
      await tx.order.updateMany({
        where: { customerId: customer.id },
        data: { customerId: null },
      });

      // Delete customer record
      await tx.customerUser.delete({
        where: { id: customer.id },
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          action: 'CUSTOMER_DELETED',
          actorId: adminId,
          actorType: 'admin',
          ipAddress: req.ip || null,
          metadata: {
            customerId: customer.id,
            name: customer.name,
            email: customer.email,
            retainedOrdersCount: customer._count.orders,
            registeredAt: customer.createdAt.toISOString(),
          },
        },
      });

      return customer;
    });

    res.json({
      success: true,
      message: `Customer ${deleted.name} (${deleted.email}) was deleted successfully. Any historical orders were safely preserved.`,
      data: {
        id: deleted.id,
        name: deleted.name,
        email: deleted.email,
      },
    });
  } catch (error) {
    next(error);
  }
});
