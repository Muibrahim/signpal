-- Add typography font pairings and extended 5-color roles to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS heading_font VARCHAR(100) DEFAULT 'Montserrat';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS body_font VARCHAR(100) DEFAULT 'Inter';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#FF6F61';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#FFFFFF';
