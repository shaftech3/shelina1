-- Migration for Store Settings and Delivery configuration

-- 1. Create store_settings table
CREATE TABLE IF NOT EXISTS "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'settings',
    "shippingFee" INTEGER NOT NULL DEFAULT 250,
    "freeShippingThreshold" INTEGER NOT NULL DEFAULT 0,
    "contactPhone" TEXT DEFAULT '+92 300 1234567',
    "contactEmail" TEXT DEFAULT 'support@shelina.pk',
    "whatsappNumber" TEXT DEFAULT '+923001234567',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- 2. Add deliveryCharge to products table if missing
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "deliveryCharge" INTEGER NOT NULL DEFAULT 0;

-- 3. Add province, area, streetAddress to orders table if missing
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "streetAddress" TEXT;

-- 4. Ensure customerId in orders is nullable for guest orders
ALTER TABLE "orders" ALTER COLUMN "customerId" DROP NOT NULL;
