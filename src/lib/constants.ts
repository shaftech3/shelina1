/** Store-wide configuration. Replace with CMS/env values in a later stage. */
export const STORE_CONFIG = {
  name: 'Shelina',
  tagline: 'Footwear, refined.',
  currency: 'PKR',
  locale: 'en-PK',
  supportEmail: 'care@shelina.pk',
  supportPhone: '+92 300 0000000',
  address: 'Faisalabad, Punjab, Pakistan',
  /**
   * Display only — used for the announcement strip and any "spend X more"
   * copy. The fee a customer is actually charged is always decided by the
   * backend (`FREE_SHIPPING_THRESHOLD` / `SHIPPING_FEE`) and read at checkout
   * via `orderService.shippingQuote()`. Keep this in step with the API env so
   * the storefront never advertises a promise the server will not honour.
   */
  freeShippingThreshold: 5000,
} as const;

export const SITE_URL = 'https://shelina.pk';

/**
 * Brand asset slots.
 * The owner replaces ONLY these files/paths — no component change required.
 */
export const BRAND_ASSETS = {
  logoDesktop: '/images/brand/shelina-logo.jpeg',
  logoMobile: '/images/brand/shelina-logo.jpeg',
  logoFooter: '/images/brand/shelina-logo.jpeg',
  favicon: '/images/brand/shelina-logo.jpeg',
} as const;

export type BrandAssetSlot = keyof typeof BRAND_ASSETS;
