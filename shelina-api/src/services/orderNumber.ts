import type { Prisma } from '@prisma/client';

/**
 * Human-readable order numbers: SHL-20260816-0001
 *
 * The cuid primary key is unusable as a customer-facing reference — nobody can
 * read "cmf3k2x9p0001" over the phone. This format is short, sortable, dated,
 * and obviously a Shelina order.
 *
 * The sequence restarts each day, which keeps the number short and leaks less
 * about total volume than a global counter would.
 */

const PREFIX = 'SHL';

function datePart(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Namespace for the advisory lock below. Any constant works; it only has to be
 * stable and not collide with another advisory lock in this database.
 */
const ORDER_NUMBER_LOCK_KEY = 8_476_120_001;

/**
 * Allocates the next order number for today.
 *
 * MUST be called inside the order-creation transaction.
 *
 * "Read the highest number, add one" is a read-modify-write, so two checkouts
 * committing at the same instant will read the same maximum and derive the same
 * number. The UNIQUE constraint on `orders.orderNumber` stops the duplicate
 * from ever reaching the database, but on its own it turns an ordinary
 * concurrent checkout into a failed one — a customer losing a race through no
 * fault of their own.
 *
 * A transaction-scoped advisory lock makes the allocation serial instead:
 * concurrent transactions queue here for the few milliseconds it takes to read
 * the maximum and insert, and PostgreSQL releases the lock automatically on
 * commit OR rollback, so a failed order cannot strand it. The UNIQUE constraint
 * stays as the last line of defence.
 *
 * Reading the highest existing number for the day (instead of counting rows)
 * means a deleted order can never cause a number to be reused.
 */
export async function nextOrderNumber(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const stamp = datePart(now);
  const todayPrefix = `${PREFIX}-${stamp}-`;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ORDER_NUMBER_LOCK_KEY}::bigint)`;

  const latest = await tx.order.findFirst({
    where: { orderNumber: { startsWith: todayPrefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  const lastSequence = latest ? Number.parseInt(latest.orderNumber.slice(todayPrefix.length), 10) : 0;
  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `${todayPrefix}${String(next).padStart(4, '0')}`;
}
