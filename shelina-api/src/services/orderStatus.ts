/**
 * Order status: the allowed set and the legal transitions between them.
 *
 * Status lives in a String column rather than a Postgres enum so this file can
 * be the single auditable source of truth for both. Adding a status to a native
 * enum requires a migration; the rule about which transitions are *sensible*
 * would still have to live in code anyway, so keeping both here avoids the
 * truth being split across two places.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * The fulfilment pipeline moves forward one step at a time, and an order can
 * only be cancelled before anyone has started shipping it.
 *
 * Nonsensical jumps (DELIVERED → PENDING, SHIPPED → CANCELLED) are rejected.
 * DELIVERED and CANCELLED are terminal: nothing leaves them. This is kept
 * deliberately simple — there is no admin override, because the brief did not
 * ask for one and a silent override would undermine the audit trail.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses an admin may move this order to right now. */
export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Explains a rejected transition in words an admin can act on, rather than
 * echoing the raw status pair back at them.
 */
export function describeTransitionFailure(from: OrderStatus, to: OrderStatus): string {
  if (from === to) return `This order is already ${to}.`;
  const allowed = TRANSITIONS[from];
  if (allowed.length === 0) {
    return `A ${from} order is final and cannot be changed.`;
  }
  return `A ${from} order cannot move to ${to}. Allowed next: ${allowed.join(', ')}.`;
}
