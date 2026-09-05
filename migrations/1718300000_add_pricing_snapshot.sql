-- Kept separate so installations that already ran the checkout migration also
-- receive the quantity-aware pricing fields.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB;
