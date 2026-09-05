-- Customer fulfillment choice and payment safety boundary.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_token VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;

CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders(payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_token_idx ON orders(public_token) WHERE public_token IS NOT NULL;
