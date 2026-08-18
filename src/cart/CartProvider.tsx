import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartService, type CartItemInput } from '@/services';
import { effectivePrice } from '@/lib/format';
import type { CartItem } from '@/types';
import { CartContext, type AddToCartArgs, type CartContextValue } from './context';

/**
 * Cart state container.
 *
 * All persistence lives in `cartService`; this provider only mirrors it into
 * React state and re-broadcasts changes. Keeping the two separate means the
 * storage mechanism can change without touching a single component.
 */


/** Maps a product plus the customer's chosen variant into a storable line. */
function toCartInput({ product, size, color, quantity }: AddToCartArgs): CartItemInput {
  const payable = effectivePrice(product.price, product.salePrice);
  return {
    productId: product.id,
    slug: product.slug,
    productName: product.name,
    brand: product.brand,
    size,
    color,
    unitPrice: payable,
    listPrice: product.price,
    image: product.images[0],
    maxQuantity: product.stockCount,
    quantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser: read storage once on mount rather than on every render.
  const [items, setItems] = useState<CartItem[]>(() => cartService.getItems());
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((args: AddToCartArgs) => {
    setItems(cartService.addToCart(toCartInput(args)).items);
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems(cartService.updateCartItem(key, quantity).items);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems(cartService.removeFromCart(key).items);
  }, []);

  const clear = useCallback(() => {
    setItems(cartService.clearCart().items);
  }, []);

  // Keep duplicate tabs in agreement. `storage` only fires in *other* tabs,
  // so this cannot loop back on the tab that made the change.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === cartService.storageKey) setItems(cartService.getItems());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const totals = useMemo(() => cartService.computeTotals(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({ items, totals, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear }),
    [items, totals, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
