import 'dotenv/config';

/**
 * Environment access, validated once at boot.
 *
 * Nothing here is ever sent to the browser. The frontend only learns the API
 * base URL (a public value); DATABASE_URL and SESSION_SECRET stay server-side.
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProduction = NODE_ENV === 'production';

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (value && value.trim()) return value.trim();
  if (isProduction) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  return 'postgresql://shelina@127.0.0.1:5432/shelina_dev?schema=public';
}

function getSessionSecret(): string {
  const value = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (value && value.trim()) {
    if (isProduction && value.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters in production.');
    }
    return value.trim();
  }
  if (isProduction) {
    throw new Error('Missing required environment variable: SESSION_SECRET');
  }
  return 'dev-only-local-secret-replace-in-production-0e9f2a';
}

const databaseUrl = getDatabaseUrl();
const sessionSecret = getSessionSecret();

export const env = {
  NODE_ENV,
  isProduction,
  port: Number(process.env.API_PORT ?? (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 4000)),
  databaseUrl,
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
  /** Brevo SMTP / Email Configuration */
  brevo: {
    smtpHost: process.env.BREVO_SMTP_HOST ?? process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
    smtpPort: Number(process.env.BREVO_SMTP_PORT ?? process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.BREVO_SMTP_USER ?? process.env.SMTP_USER ?? '',
    smtpPassword: process.env.BREVO_SMTP_PASSWORD ?? process.env.SMTP_PASSWORD ?? '',
    fromEmail: process.env.BREVO_FROM_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? 'orders@shelina.pk',
    fromName: process.env.BREVO_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? 'Shelina Footwear Atelier',
    isConfigured: Boolean(
      (process.env.BREVO_SMTP_USER || process.env.SMTP_USER) &&
      (process.env.BREVO_SMTP_PASSWORD || process.env.SMTP_PASSWORD)
    ),
  },
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
