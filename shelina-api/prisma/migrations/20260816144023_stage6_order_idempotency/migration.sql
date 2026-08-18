-- Idempotency key for order creation: a double-clicked "Place order" reuses
-- the same key, and this UNIQUE index makes the duplicate insert fail so the
-- API can return the original order instead of creating a second one.
ALTER TABLE "orders" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");
