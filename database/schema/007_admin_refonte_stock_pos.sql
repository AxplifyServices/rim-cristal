BEGIN;

-- =========================================================
-- 1. Amélioration produits existants
-- =========================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS price_wholesale NUMERIC(12, 2) DEFAULT 0 NOT NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS wholesale_min_qty INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE products
ADD CONSTRAINT chk_products_stock_non_negative
CHECK (stock >= 0) NOT VALID;

ALTER TABLE products
ADD CONSTRAINT chk_products_wholesale_min_qty_positive
CHECK (wholesale_min_qty >= 1) NOT VALID;

ALTER TABLE products
ADD CONSTRAINT chk_products_price_wholesale_non_negative
CHECK (price_wholesale >= 0) NOT VALID;


-- =========================================================
-- 2. Points de vente
-- =========================================================

CREATE TABLE IF NOT EXISTS point_of_sales (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address TEXT,
  city VARCHAR(120),
  phone VARCHAR(50),
  manager_name VARCHAR(160),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_of_sales_active
ON point_of_sales(is_active);

CREATE INDEX IF NOT EXISTS idx_point_of_sales_city
ON point_of_sales(city);


-- =========================================================
-- 3. Stock propre à chaque point de vente
-- =========================================================

CREATE TABLE IF NOT EXISTS point_of_sale_stocks (
  id SERIAL PRIMARY KEY,
  point_of_sale_id INTEGER NOT NULL REFERENCES point_of_sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_pos_product_stock UNIQUE(point_of_sale_id, product_id),
  CONSTRAINT chk_pos_stock_quantity_non_negative CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pos_stocks_pos
ON point_of_sale_stocks(point_of_sale_id);

CREATE INDEX IF NOT EXISTS idx_pos_stocks_product
ON point_of_sale_stocks(product_id);


-- =========================================================
-- 4. Ventes depuis les points de vente
-- =========================================================

CREATE TABLE IF NOT EXISTS point_of_sale_sales (
  id SERIAL PRIMARY KEY,
  point_of_sale_id INTEGER NOT NULL REFERENCES point_of_sales(id) ON DELETE RESTRICT,
  sale_number VARCHAR(80) NOT NULL UNIQUE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  customer_name VARCHAR(160),
  customer_phone VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_pos
ON point_of_sale_sales(point_of_sale_id);

CREATE INDEX IF NOT EXISTS idx_pos_sales_created_at
ON point_of_sale_sales(created_at);


CREATE TABLE IF NOT EXISTS point_of_sale_sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES point_of_sale_sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_reference VARCHAR(100),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,

  CONSTRAINT chk_pos_sale_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale
ON point_of_sale_sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product
ON point_of_sale_sale_items(product_id);


-- =========================================================
-- 5. Historique des mouvements de stock
-- =========================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  point_of_sale_id INTEGER REFERENCES point_of_sales(id) ON DELETE SET NULL,
  movement_type VARCHAR(40) NOT NULL,
  quantity INTEGER NOT NULL,
  stock_global_before INTEGER,
  stock_global_after INTEGER,
  stock_pos_before INTEGER,
  stock_pos_after INTEGER,
  sale_id INTEGER REFERENCES point_of_sale_sales(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_stock_movement_type CHECK (
    movement_type IN (
      'global_adjustment',
      'global_to_pos',
      'pos_sale',
      'pos_adjustment'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_pos
ON stock_movements(point_of_sale_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type
ON stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
ON stock_movements(created_at);


-- =========================================================
-- 6. Associer les commandes web à un point de vente si besoin
-- =========================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS point_of_sale_id INTEGER REFERENCES point_of_sales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_point_of_sale
ON orders(point_of_sale_id);

COMMIT;