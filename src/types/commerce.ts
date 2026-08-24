import type { ID } from './catalog';

/**
 * Order domain types.
 *
 * These mirror the Stage 6 API exactly. The Stage 1 placeholder shapes that
 * used to live here (`reference`, lowercase statuses, a `currency` field) were
 * never rendered by any component and have been replaced rather than kept
 * alongside — two competing Order types would be a trap.
 */

/**
 * The controlled status set. Upper-case because that is what the database
 * stores; `ORDER_STATUS_LABELS` handles presentation.
 */
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

/** Cash on Delivery only in this stage — no payment gateway exists. */
export type PaymentStatus = 'UNPAID' | 'PAID';

/**
 * One purchased line, as stored at purchase time.
 *
 * Every field here is a SNAPSHOT written when the order was placed. Renaming,
 * re-pricing or deleting the product afterwards does not change it, which is
 * why the order and its invoice stay truthful forever.
 */
export interface OrderItem {
  id: ID;
  /** May be null if the product was later deleted; display never depends on it. */
  productId: ID | null;
  productName: string;
  sku: string | null;
  productImage: string | null;
  productSlug: string | null;
  /** The exact free-form strings the customer chose. Never normalised. */
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: ID;
  /** Human-readable reference, e.g. SHL-20260816-0001. */
  orderNumber: string;
  customerId: ID;
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  province?: string | null;
  area?: string | null;
  streetAddress?: string | null;
  city: string;
  notes: string | null;

  subtotal: number;
  shippingFee: number;
  deliveryCharge?: number;
  grandTotal: number;
  /** Total units across all lines. */
  itemCount: number;

  items: OrderItem[];
  createdAt: string;
  updatedAt: string;

  /** Admin detail responses include the legal next statuses. */
  allowedTransitions?: OrderStatus[];
}

/** The shipping/contact details collected at checkout. */
export interface CheckoutDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  province: string;
  city: string;
  area: string;
  streetAddress: string;
  shippingAddress?: string;
  notes?: string;
}

/**
 * What the browser sends for one line. Note the absence of any money field:
 * the server prices the order from its own data, so there is nothing to tamper
 * with. Client-side totals exist for display only.
 */
export interface CheckoutItemInput {
  productId: ID;
  size: string | null;
  color: string | null;
  quantity: number;
}

export interface PlaceOrderInput extends CheckoutDetails {
  items: CheckoutItemInput[];
  /** Makes a double-clicked submit return the first order instead of a second. */
  idempotencyKey?: string;
}

export interface OrderListMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface OrderList {
  orders: Order[];
  meta: OrderListMeta;
}

export interface AdminOrderQuery {
  search?: string;
  status?: OrderStatus | '';
  sort?: OrderSort;
  page?: number;
  pageSize?: number;
}

export type OrderSort = 'newest' | 'oldest' | 'total-high' | 'total-low';

/** Presentation labels. Status is always conveyed in words, never colour alone. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];
