-- Add flat and upscaled design columns to orders table for printing pipeline
ALTER TABLE orders ADD COLUMN IF NOT EXISTS flat_design_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upscaled_design_url TEXT;
