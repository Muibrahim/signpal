-- Create brand_dna table for persistent brand identity
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tagline TEXT,
  industry VARCHAR(255),
  primary_color VARCHAR(20) DEFAULT '#001F3F',
  secondary_color VARCHAR(20) DEFAULT '#FFD700',
  background_color VARCHAR(20) DEFAULT '#000000',
  primary_language VARCHAR(50) DEFAULT 'English',
  secondary_language VARCHAR(50) DEFAULT 'Somali',
  contact_phone VARCHAR(100),
  contact_email VARCHAR(255),
  contact_address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add brand_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100) DEFAULT 'business_card';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selected_languages VARCHAR(100) DEFAULT 'English + Somali';
