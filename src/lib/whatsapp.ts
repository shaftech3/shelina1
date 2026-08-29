import { OFFICIAL_WHATSAPP_NUMBER, SITE_URL } from './constants';
import { formatPrice, effectivePrice } from './format';
import type { CartItem, Product } from '@/types';

/**
 * Returns the absolute production URL for a given path.
 * Prefers the current browser location if on production domain, otherwise uses SITE_URL.
 */
export function getProductShareUrl(slug: string): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
    return `${window.location.origin}/product/${slug}`;
  }
  return `${SITE_URL}/product/${slug}`;
}

/**
 * Generates an encoded WhatsApp URL for ordering a specific product with selected options.
 */
export function buildProductWhatsAppUrl(params: {
  product: Product;
  size?: string | null;
  color?: string | null;
  quantity?: number;
}): string {
  const { product, size, color, quantity = 1 } = params;
  const payable = effectivePrice(product.price, product.salePrice);
  const productUrl = getProductShareUrl(product.slug);

  const lines: string[] = [
    'Hello Shelina, I would like to order:',
    '',
    `Product: ${product.name}`,
    `Product Link: ${productUrl}`,
    `Price: ${formatPrice(payable)}`,
  ];

  if (size) {
    lines.push(`Size: ${size}`);
  }
  if (color) {
    lines.push(`Color: ${color}`);
  }
  if (quantity > 1) {
    lines.push(`Quantity: ${quantity}`);
    lines.push(`Total: ${formatPrice(payable * quantity)}`);
  } else {
    lines.push('Quantity: 1');
  }

  lines.push('');
  lines.push('Please confirm availability and order details.');

  const message = lines.join('\n');
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an encoded WhatsApp URL for placing an order from the entire cart.
 */
export function buildCartWhatsAppUrl(params: {
  items: CartItem[];
  subtotal: number;
  shippingFee?: number;
}): string {
  const { items, subtotal, shippingFee } = params;
  const grandTotal = subtotal + (shippingFee ?? (subtotal >= 5000 ? 0 : 250));

  const lines: string[] = [
    'Hello Shelina, I would like to place an order:',
    '',
  ];

  items.forEach((item, index) => {
    const productUrl = getProductShareUrl(item.product.slug);
    lines.push(`${index + 1}. ${item.product.name}`);
    lines.push(`   Price: ${formatPrice(item.unitPrice)}`);
    if (item.size) lines.push(`   Size: ${item.size}`);
    if (item.color) lines.push(`   Color: ${item.color}`);
    lines.push(`   Quantity: ${item.quantity}`);
    lines.push(`   Line Total: ${formatPrice(item.unitPrice * item.quantity)}`);
    lines.push(`   Product: ${productUrl}`);
    lines.push('');
  });

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  lines.push(`Total Items: ${totalItemsCount}`);
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  if (typeof shippingFee === 'number') {
    lines.push(`Delivery Charges: ${shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}`);
  }
  lines.push(`Estimated Total: ${formatPrice(grandTotal)} (Cash on Delivery)`);
  lines.push('');
  lines.push('Please confirm availability and order details.');

  const message = lines.join('\n');
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an encoded WhatsApp URL for confirming a checkout order with full customer delivery details.
 */
export function buildCheckoutWhatsAppUrl(params: {
  customer: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    province: string;
    city: string;
    area: string;
    streetAddress: string;
    notes?: string;
  };
  items: CartItem[];
  subtotal: number;
  shippingFee?: number;
}): string {
  const { customer, items, subtotal, shippingFee } = params;
  const fee = shippingFee ?? (subtotal >= 5000 ? 0 : 250);
  const grandTotal = subtotal + fee;

  const lines: string[] = [
    'Hello Shelina, I would like to confirm my order via WhatsApp.',
    '',
    'Customer Details:',
    `Name: ${customer.customerName || 'Not specified'}`,
    `Email: ${customer.customerEmail || 'Not specified'}`,
    `Phone: ${customer.customerPhone || 'Not specified'}`,
    '',
    'Delivery Address:',
    `Province: ${customer.province || 'Punjab'}`,
    `City: ${customer.city || 'Not specified'}`,
    `Area: ${customer.area || 'Not specified'}`,
    `Street/Home Address: ${customer.streetAddress || 'Not specified'}`,
  ];

  if (customer.notes?.trim()) {
    lines.push(`Order Notes: ${customer.notes.trim()}`);
  }

  lines.push('');
  lines.push('Order Items:');

  items.forEach((item, index) => {
    const productUrl = getProductShareUrl(item.product.slug);
    lines.push(`${index + 1}. ${item.product.name}`);
    if (item.size) lines.push(`   Size: ${item.size}`);
    if (item.color) lines.push(`   Color: ${item.color}`);
    lines.push(`   Quantity: ${item.quantity}`);
    lines.push(`   Price: ${formatPrice(item.unitPrice)}`);
    lines.push(`   Line Total: ${formatPrice(item.unitPrice * item.quantity)}`);
    lines.push(`   Product Link: ${productUrl}`);
    lines.push('');
  });

  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  lines.push(`Delivery Charges: ${fee === 0 ? 'FREE' : formatPrice(fee)}`);
  lines.push(`Total: ${formatPrice(grandTotal)}`);
  lines.push('');
  lines.push('Payment Method:');
  lines.push('Cash on Delivery');
  lines.push('');
  lines.push('Please contact me to confirm the order.');

  const message = lines.join('\n');
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates an inquiry WhatsApp URL.
 */
export function buildInquiryWhatsAppUrl(customText?: string): string {
  const text = customText || 'Hello Shelina, I have an inquiry regarding your handcrafted footwear collection.';
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
