import { useContext } from 'react';
import { CartContext, type CartContextValue } from './context';

/**
 * Access the cart.
 *
 * Kept separate from the provider so neither file mixes components with
 * non-component exports — that keeps React Fast Refresh working for both.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
