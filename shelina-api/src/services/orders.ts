import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { env } from '../lib/env.js';
import { nextOrderNumber } from './orderNumber.js';

/**
 * Order creation and pricing.
 *
 * The single most important rule in this file: **money is never accepted from
 * the client.** The checkout payload carries product ids, variants and
 * quantities — nothing else. Unit prices come from the product rows, the
 * subtotal is summed here, shipping comes from server configuration, and the
 * grand total is derived. A malicious client can change what it is buying, but
 * not what it costs.
 */

/** Shape of one validated, priced line, ready to be written. */
interface PricedLine {
  productId: string;
  productName: string;
  sku: string | null;
  productImage: string | null;
  productSlug: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutItemInput {
  productId: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  notes?: string | null;
  items: CheckoutItemInput[];
  idempotencyKey?: string;
}

/** Shapes stored in the product's free-form JSON variant columns. */
interface SizeOption {
  value: string;
  available?: boolean;
}
interface ColorOption {
  name: string;
  available?: boolean;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Compares a customer-selected variant against the product's own options.
 *
 * Matching is trimmed and case-insensitive so "black" and "Black " resolve to
 * the authored "Black" — the SAME normalisation the cart already uses to
 * decide variant identity. Crucially this is not validation against any global
 * list: the only authority is the product row itself, and the value written to
 * the order is the product's own authored spelling.
 */
function matchOption(selected: string | null | undefined, authored: string[]): string | null | undefined {
  if (selected === null || selected === undefined || selected === '') return undefined;
  const needle = selected.trim().toLowerCase();
  return authored.find((option) => option.trim().toLowerCase() === needle) ?? null;
}

/**
 * Flat fee, waived above a configured subtotal. Deliberately trivial: the brief
 * asked for a configurable fee, not a shipping-provider integration.
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (env.freeShippingThreshold > 0 && subtotal >= env.freeShippingThreshold) return 0;
  return env.shippingFee;
}

/**
 * Creates an order atomically.
 *
 * Everything below happens inside ONE transaction: validation, stock checks,
 * the order row, its items and the stock decrements. If any step throws, the
 * whole thing rolls back and no partial order survives.
 */
export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    /**
     * Idempotency, first pass. A double-clicked "Place order" sends the same
     * key twice; if the first request already finished, return its order
     * rather than creating a second one.
     *
     * This lookup alone is not sufficient — two simultaneous requests can both
     * miss it — so the UNIQUE constraint on `idempotencyKey` is the real
     * guarantee. The caller catches that violation and re-reads the winner.
     */
    if (input.idempotencyKey) {
      const existing = await tx.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true },
      });
      if (existing) return existing;
    }

    // Load every referenced product once, in a single query.
    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const lines: PricedLine[] = [];
    const fieldErrors: Record<string, string> = {};

    for (const [index, item] of input.items.entries()) {
      const product = byId.get(item.productId);

      if (!product) {
        fieldErrors[`items.${index}`] = 'This product is no longer available.';
        continue;
      }

      // A draft or archived product must not be purchasable, even if it was
      // active when it went into the cart.
      if (product.status !== 'active') {
        fieldErrors[`items.${index}`] = `${product.name} is no longer available.`;
        continue;
      }

      // ── Variant validation, against THIS product only ──────────────────
      const authoredSizes = asArray<SizeOption>(product.sizes)
        .filter((size) => size.available !== false)
        .map((size) => size.value);
      const authoredColors = asArray<ColorOption>(product.colors)
        .filter((color) => color.available !== false)
        .map((color) => color.name);

      let size: string | null = null;
      if (authoredSizes.length > 0) {
        const matched = matchOption(item.size, authoredSizes);
        if (matched === undefined) {
          fieldErrors[`items.${index}`] = `Choose a size for ${product.name}.`;
          continue;
        }
        if (matched === null) {
          fieldErrors[`items.${index}`] = `“${item.size}” is not an available size for ${product.name}.`;
          continue;
        }
        size = matched;
      } else if (item.size) {
        // The product declares no sizes, so any supplied size is bogus.
        fieldErrors[`items.${index}`] = `${product.name} does not come in sizes.`;
        continue;
      }

      let color: string | null = null;
      if (authoredColors.length > 0) {
        const matched = matchOption(item.color, authoredColors);
        if (matched === undefined) {
          fieldErrors[`items.${index}`] = `Choose a colour for ${product.name}.`;
          continue;
        }
        if (matched === null) {
          fieldErrors[`items.${index}`] = `“${item.color}” is not an available colour for ${product.name}.`;
          continue;
        }
        color = matched;
      } else if (item.color) {
        fieldErrors[`items.${index}`] = `${product.name} does not come in colours.`;
        continue;
      }

      // ── Stock ──────────────────────────────────────────────────────────
      if (product.stock < item.quantity) {
        fieldErrors[`items.${index}`] =
          product.stock <= 0
            ? `${product.name} is out of stock.`
            : `Only ${product.stock} left of ${product.name}.`;
        continue;
      }

      // ── Price, read from the database and nowhere else ─────────────────
      const unitPrice =
        product.salePrice !== null && product.salePrice < product.price ? product.salePrice : product.price;

      lines.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        productImage: product.media[0]?.url ?? null,
        productSlug: product.slug,
        size,
        color,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      });
    }

    if (Object.keys(fieldErrors).length > 0) {
      // 409: the request was well-formed, but the catalogue moved underneath
      // it. The whole order is rejected — never a partial one.
      throw new ApiError(
        'Some products are no longer available in the requested quantity.',
        409,
        fieldErrors,
      );
    }

    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
    const shippingFee = calculateShipping(subtotal);
    const grandTotal = subtotal + shippingFee;

    const order = await tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(tx),
        idempotencyKey: input.idempotencyKey ?? null,
        customerId: input.customerId,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress,
        city: input.city,
        notes: input.notes ?? null,
        subtotal,
        shippingFee,
        grandTotal,
        items: { create: lines },
      },
      include: { items: true },
    });

    // Decrement stock with a guarded conditional update. `stock: { gte: qty }`
    // means a concurrent order that emptied the shelf between our check and
    // this write causes 0 rows to match — which we turn into a rollback rather
    // than allowing negative stock.
    for (const line of lines) {
      const updated = await tx.product.updateMany({
        where: { id: line.productId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (updated.count !== 1) {
        throw new ApiError(
          'Some products are no longer available in the requested quantity.',
          409,
        );
      }
    }

    return order;
  });
}

/**
 * Cancels an order and returns its units to stock — exactly once.
 *
 * `stockRestoredAt` is the guard: it is set in the same transaction as the
 * restock, so a second cancellation (or an admin re-saving CANCELLED) finds it
 * already stamped and restores nothing. The conditional `updateMany` on that
 * column also makes two concurrent cancellations safe: only one can match.
 */
export async function cancelOrderAndRestoreStock(tx: Prisma.TransactionClient, orderId: string) {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, stockRestoredAt: null },
    data: { status: 'CANCELLED', stockRestoredAt: new Date() },
  });

  // Someone else already cancelled this order and restored its stock.
  if (claimed.count !== 1) return false;

  const items = await tx.orderItem.findMany({
    where: { orderId, productId: { not: null } },
    select: { productId: true, quantity: true },
  });

  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
  }

  return true;
}
