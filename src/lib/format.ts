import { STORE_CONFIG } from '@/lib/constants';

/** Formats a numeric amount into the store currency (PKR by default). */
export function formatPrice(amount: number, currency: string = STORE_CONFIG.currency): string {
  return new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Percentage saved between an original price and a sale price. */
export function discountPercent(price: number, salePrice?: number | null): number | null {
  if (!salePrice || salePrice >= price || price <= 0) return null;
  return Math.round(((price - salePrice) / price) * 100);
}

/** The price a customer actually pays. */
export function effectivePrice(price: number, salePrice?: number | null): number {
  return salePrice && salePrice < price ? salePrice : price;
}

/** Formats an ISO date string or Date object into a localized display date. */
export function formatDate(date: string | Date | number | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(STORE_CONFIG.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

