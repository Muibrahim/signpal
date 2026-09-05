-- Create orders table for SignPal AI Design Tool
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_description TEXT,
  designs_json TEXT, -- JSON string representing generated designs array
  selected_design INTEGER, -- Index of selected design
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  notes TEXT,
  admin_response TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
