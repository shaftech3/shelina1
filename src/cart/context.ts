import { createContext } from 'react';
import type { CartItem, CartTotals } from '@/types';
import type { Product } from '@/types';

/**
 * Cart context lives in its own module (no components) so both the provider
 * and the hook can import it without breaking React Fast Refresh.
 */

export interface AddToCartArgs {
  product: Product;
  size: string | null;
  color: string | null;
  quantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  totals: CartTotals;
  /** Drawer visibility is cart state — several unrelated components toggle it. */
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (args: AddToCartArgs) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
