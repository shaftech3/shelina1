import { z } from 'zod';

/**
 * Server-side validation. The frontend validates too, for fast feedback, but
 * the backend NEVER trusts it — every mutation is re-checked here.
 *
 * CRITICAL: sizes and colours are validated for SHAPE only (a non-empty
 * string). Their VALUES are never checked against any list, enum or
 * dictionary. "38", "UK 6", "Free Size" and "Coffee" are all equally valid.
 */

const trimmed = (max: number) => z.string().trim().max(max);

/** Free-form size. Any non-empty string the admin types. */
const sizeSchema = z.object({
  value: z.string().trim().min(1, 'A size cannot be empty.').max(60),
  available: z.boolean().default(true),
});

/** Free-form colour. `swatch` is an optional admin-supplied CSS colour. */
const colorSchema = z.object({
  name: z.string().trim().min(1, 'A colour cannot be empty.').max(60),
  swatch: z.string().trim().max(40).optional().nullable(),
  available: z.boolean().default(true),
});

const mediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().trim().min(1, 'Media needs a URL.').max(500),
  alt: trimmed(300).optional().nullable(),
  poster: trimmed(500).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required.').max(200),
    slug: trimmed(200).optional(),
    sku: trimmed(80).optional().nullable(),
    shortDescription: trimmed(500).optional().nullable(),
    description: trimmed(8000).optional().nullable(),

    price: z.number({ message: 'Price is required.' }).int('Price must be a whole number.').min(1, 'Price must be greater than zero.'),
    salePrice: z.number().int().min(0).optional().nullable(),

    stock: z.number().int().min(0, 'Stock cannot be negative.').default(0),
    stockStatus: z.enum(['in-stock', 'low-stock', 'out-of-stock', 'pre-order']).default('in-stock'),

    deliveryCharge: z.number().int().min(0, 'Delivery charge cannot be negative.').default(0),

    status: z.enum(['active', 'draft', 'archived']).default('active'),
    featured: z.boolean().default(false),
    newArrival: z.boolean().default(false),
    onSale: z.boolean().default(false),

    // Free-form, per product. No dictionary.
    sizes: z.array(sizeSchema).default([]),
    colors: z.array(colorSchema).default([]),
    tags: z.array(z.string().trim().min(1).max(60)).default([]),

    seoTitle: trimmed(200).optional().nullable(),
    seoDescription: trimmed(500).optional().nullable(),

    categoryId: z.string().trim().min(1, 'Category is required.'),
    brandId: z.string().trim().min(1, 'Brand is required.'),

    media: z.array(mediaSchema).default([]),
  })
  .refine(
    (data) =>
      data.salePrice === null ||
      data.salePrice === undefined ||
      data.salePrice === 0 ||
      data.salePrice < data.price,
    { message: 'Sale price must be lower than the regular price.', path: ['salePrice'] },
  );

export const productUpdateSchema = productInputSchema;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(120),
  slug: trimmed(120).optional(),
  description: trimmed(1000).optional().nullable(),
  image: trimmed(500).optional().nullable(),
  imageAlt: trimmed(300).optional().nullable(),
  group: trimmed(80).optional().nullable(),
  featured: z.boolean().optional(),
  seoTitle: trimmed(200).optional().nullable(),
  seoDescription: trimmed(500).optional().nullable(),
});

export const brandInputSchema = z.object({
  name: z.string().trim().min(1, 'Brand name is required.').max(120),
  slug: trimmed(120).optional(),
  description: trimmed(1000).optional().nullable(),
  logo: trimmed(500).optional().nullable(),
  logoAlt: trimmed(300).optional().nullable(),
  seoTitle: trimmed(200).optional().nullable(),
  seoDescription: trimmed(500).optional().nullable(),
});

export const homepageInputSchema = z.object({
  eyebrow: trimmed(120).optional().nullable(),
  heading: z.string().trim().min(1, 'Hero heading is required.').max(200),
  subheading: trimmed(500).optional().nullable(),
  badge: trimmed(80).optional().nullable(),
  image: trimmed(500).optional().nullable(),
  imageAlt: trimmed(300).optional().nullable(),
  secondaryImage: trimmed(500).optional().nullable(),
  ctaText: trimmed(80).optional().nullable(),
  ctaLink: trimmed(300).optional().nullable(),
  secondaryCtaText: trimmed(80).optional().nullable(),
  secondaryCtaLink: trimmed(300).optional().nullable(),
  editorialEyebrow: trimmed(120).optional().nullable(),
  editorialHeading: trimmed(200).optional().nullable(),
  editorialDescription: trimmed(2000).optional().nullable(),
  editorialImage: trimmed(500).optional().nullable(),
  editorialImageAlt: trimmed(300).optional().nullable(),
  editorialCtaText: trimmed(80).optional().nullable(),
  editorialCtaLink: trimmed(300).optional().nullable(),
});

export const bannerInputSchema = z.object({
  title: z.string().trim().min(1, 'Banner heading is required.').max(200),
  description: trimmed(1000).optional().nullable(),
  eyebrow: trimmed(120).optional().nullable(),
  image: trimmed(500).optional().nullable(),
  imageAlt: trimmed(300).optional().nullable(),
  ctaText: trimmed(80).optional().nullable(),
  ctaLink: trimmed(300).optional().nullable(),
  variant: z.enum(['image', 'split', 'plain']).default('split'),
  tone: z.enum(['cream', 'primary', 'secondary', 'surface']).optional().nullable(),
  mediaSide: z.enum(['left', 'right']).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const seoInputSchema = z.object({
  siteTitle: z.string().trim().min(1, 'Site title is required.').max(200),
  siteDescription: trimmed(500).default(''),
  defaultImage: trimmed(500).optional().nullable(),
  keywords: z.array(z.string().trim().min(1).max(80)).default([]),
  ogTitle: trimmed(200).optional().nullable(),
  ogDescription: trimmed(500).optional().nullable(),
  ogImage: trimmed(500).optional().nullable(),
  twitterTitle: trimmed(200).optional().nullable(),
  twitterDescription: trimmed(500).optional().nullable(),
  twitterImage: trimmed(500).optional().nullable(),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password is too long.');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: passwordSchema,
});

/* ─────────────────────────── Orders (Stage 6) ─────────────────────────── */

/**
 * A single line the customer is trying to buy.
 *
 * Note what is NOT here: unitPrice, lineTotal, subtotal, shippingFee and
 * grandTotal. Money is never accepted from the client — the server reads
 * prices from the product rows and computes every total itself. A payload
 * carrying prices is not "corrected"; those fields simply have no way in.
 *
 * `size` and `color` are the exact free-form strings the customer picked.
 * They are shape-checked only. Whether a value is legitimate is decided by
 * comparing it against that specific product's own authored options at
 * checkout time — never against a global list, because none exists.
 */
export const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1, 'A cart line is missing its product.'),
  size: z.string().trim().max(60).optional().nullable(),
  color: z.string().trim().max(60).optional().nullable(),
  quantity: z
    .number({ message: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(99, 'Quantity is too large.'),
});

/**
 * A missing field should read like a form hint, not a type error. Zod's default
 * for `undefined` is "expected string, received undefined", which is useless to
 * a shopper, so every required field states its own message.
 */
const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message);

export const checkoutSchema = z.object({
  customerName: requiredText('Full name is required.').max(120),
  customerEmail: z
    .string({ error: 'Email address is required.' })
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.'),
  // Deliberately permissive: Pakistani numbers are written many ways
  // (03001234567, +92 300 1234567, 0300-1234567). Requiring one shape would
  // reject valid customers, so this checks it is plausibly a phone number.
  customerPhone: z
    .string({ error: 'Phone number is required.' })
    .trim()
    .min(7, 'Enter a valid phone number.')
    .max(30, 'Enter a valid phone number.')
    .regex(/^[0-9+()\-\s]+$/, 'A phone number can only contain digits, spaces, + ( ) and -.'),
  province: requiredText('Province / Region is required.').max(120),
  city: requiredText('City is required.').max(120),
  area: requiredText('Area / Neighborhood / Town is required.').max(150),
  streetAddress: requiredText('Street address / House no. is required.').max(300),
  shippingAddress: z.string().trim().max(500).optional(),
  notes: trimmed(1000).optional().nullable(),
  items: z
    .array(checkoutItemSchema, { error: 'Your cart is empty.' })
    .min(1, 'Your cart is empty.')
    .max(50, 'That is too many different products for one order.'),
  /**
   * Optional client-generated key that makes order creation idempotent, so a
   * double-clicked "Place order" returns the first order instead of creating
   * a second one. See POST /api/orders.
   */
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});
