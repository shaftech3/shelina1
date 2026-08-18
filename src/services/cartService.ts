import { cartItemKey, type Cart, type CartItem, type CartTotals } from '@/types';

/**
 * Cart service.
 *
 * This is the ONLY module in the codebase that touches cart persistence.
 * Components and hooks call these functions; nothing else reads or writes the
 * storage key. That boundary is what makes the later swap to a server-side
 * cart a single-file change — the function signatures below are already
 * async-friendly in shape and deliberately free of React concerns.
 *
 * Persistence is localStorage for this stage. No backend, no auth, no cookies.
 */

const STORAGE_KEY = 'shelina.cart.v1';
const CART_VERSION = 1;

/** Hard ceiling per line so a stuck key repeat can't create absurd quantities. */
export const MAX_LINE_QUANTITY = 99;

function emptyCart(): Cart {
  return { items: [], version: CART_VERSION, updatedAt: new Date().toISOString() };
}

/** Narrow an unknown parsed value to a CartItem, discarding anything malformed. */
function isValidItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.key === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.productName === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    typeof item.unitPrice === 'number' &&
    Number.isFinite(item.unitPrice) &&
    (item.size === null || typeof item.size === 'string') &&
    (item.color === null || typeof item.color === 'string')
  );
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probe = '__shelina_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing or a storage quota error — degrade to in-memory.
    return false;
  }
}

/** In-memory fallback so the cart still works when storage is unavailable. */
let memoryCart: Cart = emptyCart();

function read(): Cart {
  if (!isStorageAvailable()) return memoryCart;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart();

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyCart();

    const candidate = parsed as Partial<Cart>;
    // A future schema bump lands here; for now an unknown version is discarded
    // rather than trusted, which is safer than guessing at its shape.
    if (candidate.version !== CART_VERSION) return emptyCart();

    const items = Array.isArray(candidate.items) ? candidate.items.filter(isValidItem) : [];
    return {
      items: items.map((item) => ({
        ...item,
        quantity: Math.min(Math.max(1, Math.floor(item.quantity)), MAX_LINE_QUANTITY),
      })),
      version: CART_VERSION,
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    };
  } catch {
    // Corrupted JSON must never break the storefront.
    return emptyCart();
  }
}

function write(cart: Cart): Cart {
  const next: Cart = { ...cart, version: CART_VERSION, updatedAt: new Date().toISOString() };
  memoryCart = next;
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota exceeded — the in-memory copy above keeps the session usable.
    }
  }
  return next;
}

/** Clamp a requested quantity into [1, min(max, MAX_LINE_QUANTITY)]. */
function clampQuantity(quantity: number, max?: number): number {
  const ceiling = Math.min(max && max > 0 ? max : MAX_LINE_QUANTITY, MAX_LINE_QUANTITY);
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(Math.max(1, Math.floor(quantity)), ceiling);
}

/** What `addToCart` accepts. The caller resolves pricing; the cart stores it. */
export type CartItemInput = Omit<CartItem, 'key' | 'quantity'> & { quantity?: number };

export const cartService = {
  getCart(): Cart {
    return read();
  },

  getItems(): CartItem[] {
    return read().items;
  },

  /**
   * Adds a variant, merging only on an exact product + size + colour match.
   * Returns the updated cart.
   */
  addToCart(input: CartItemInput): Cart {
    const cart = read();
    const key = cartItemKey(input.productId, input.size, input.color);
    const requested = clampQuantity(input.quantity ?? 1, input.maxQuantity);

    const existing = cart.items.find((item) => item.key === key);
    const items = existing
      ? cart.items.map((item) =>
          item.key === key
            ? { ...item, quantity: clampQuantity(item.quantity + requested, item.maxQuantity) }
            : item,
        )
      : [...cart.items, { ...input, key, quantity: requested }];

    return write({ ...cart, items });
  },

  /** Sets an absolute quantity for one line. Quantity 0 or less removes it. */
  updateCartItem(key: string, quantity: number): Cart {
    const cart = read();
    if (quantity <= 0) return cartService.removeFromCart(key);

    const items = cart.items.map((item) =>
      item.key === key ? { ...item, quantity: clampQuantity(quantity, item.maxQuantity) } : item,
    );
    return write({ ...cart, items });
  },

  removeFromCart(key: string): Cart {
    const cart = read();
    return write({ ...cart, items: cart.items.filter((item) => item.key !== key) });
  },

  clearCart(): Cart {
    return write(emptyCart());
  },

  /** Total units across all lines — this is the number the header badge shows. */
  getCartCount(): number {
    return read().items.reduce((total, item) => total + item.quantity, 0);
  },

  getCartSubtotal(): number {
    return read().items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  },

  getTotals(): CartTotals {
    return cartService.computeTotals(read().items);
  },

  /** Pure totals calculation, exposed so the UI can derive without re-reading. */
  computeTotals(items: CartItem[]): CartTotals {
    return items.reduce<CartTotals>(
      (totals, item) => ({
        count: totals.count + item.quantity,
        subtotal: totals.subtotal + item.unitPrice * item.quantity,
        savings: totals.savings + Math.max(0, item.listPrice - item.unitPrice) * item.quantity,
        lineCount: totals.lineCount + 1,
      }),
      { count: 0, subtotal: 0, savings: 0, lineCount: 0 },
    );
  },

  /** Storage key exposed for cross-tab sync in the hook layer. */
  storageKey: STORAGE_KEY,
};
