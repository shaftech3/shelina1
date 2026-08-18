import 'dotenv/config';

/**
 * Environment access, validated once at boot.
 *
 * Nothing here is ever sent to the browser. The frontend only learns the API
 * base URL (a public value); DATABASE_URL and SESSION_SECRET stay server-side.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function getSecret(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}${fallbackName ? ` or ${fallbackName}` : ''}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProduction = NODE_ENV === 'production';

const sessionSecret = getSecret('SESSION_SECRET', 'JWT_SECRET');

// A weak secret is a real vulnerability in production, so fail loudly rather
// than booting with something guessable.
if (isProduction && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production.');
}

export const env = {
  NODE_ENV,
  isProduction,
  port: Number(process.env.API_PORT ?? (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 4000)),
  databaseUrl: required('DATABASE_URL'),
  sessionSecret,
  /** Comma-separated allowlist. Never "*" — credentials are involved. */
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Single admin account configuration */
  adminEmail: (process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'shelinaofficial@gmail.com')
    .trim()
    .toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? '',
  adminName: process.env.ADMIN_NAME ?? process.env.SEED_ADMIN_NAME ?? 'Shelina Admin',
  /** Session lifetime for both admin and customer cookies. */
  sessionMaxAgeMs: 1000 * 60 * 60 * 8,
  /**
   * Failed-login attempts allowed per IP per 15 minutes.
   * Configurable so an automated test run can raise it; production should
   * leave it at the default. It is never disabled outright.
   */
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT ?? 20),
  /**
   * Flat Cash-on-Delivery shipping fee in integer PKR, and the subtotal at or
   * above which delivery is free. Configuration, not a shipping-provider
   * integration — and deliberately server-side, so the fee a customer is
   * charged can never be set by the browser.
   */
  shippingFee: Number(process.env.SHIPPING_FEE ?? 250),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 5000),
};
