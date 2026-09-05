-- Add print pipeline status and error tracking columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS print_error TEXT;
