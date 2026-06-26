BEGIN;

-- ============================================================
-- ORIGINE ET SOURCE DE STOCK DES COMMANDES
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_origin VARCHAR(40)
    NOT NULL DEFAULT 'website',

  ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER,

  ADD COLUMN IF NOT EXISTS stock_source_type VARCHAR(40)
    NOT NULL DEFAULT 'global',

  ADD COLUMN IF NOT EXISTS stock_deducted_at TIMESTAMP(6),

  ADD COLUMN IF NOT EXISTS stock_restored_at TIMESTAMP(6);

-- Les anciennes commandes sont considérées comme provenant du site.
UPDATE orders
SET order_origin = 'website'
WHERE order_origin IS NULL
   OR BTRIM(order_origin) = '';

-- Une ancienne commande déjà rattachée à un point de vente
-- utilise ce point de vente comme source de stock.
UPDATE orders
SET stock_source_type =
  CASE
    WHEN point_of_sale_id IS NULL THEN 'global'
    ELSE 'point_of_sale'
  END
WHERE stock_source_type IS NULL
   OR stock_source_type NOT IN ('global', 'point_of_sale');

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_orders_order_origin;

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_order_origin
  CHECK (
    order_origin IN (
      'website',
      'admin',
      'point_of_sale'
    )
  );

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_orders_stock_source_type;

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_stock_source_type
  CHECK (
    stock_source_type IN (
      'global',
      'point_of_sale'
    )
  );

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS fk_orders_created_by_user;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_created_by_user
  FOREIGN KEY (created_by_user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Une source globale ne doit pas avoir de point de vente.
-- Une source point_of_sale doit obligatoirement en avoir un.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS chk_orders_stock_source;

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_stock_source
  CHECK (
    (
      stock_source_type = 'global'
      AND point_of_sale_id IS NULL
    )
    OR
    (
      stock_source_type = 'point_of_sale'
      AND point_of_sale_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_orders_origin
  ON orders(order_origin);

CREATE INDEX IF NOT EXISTS idx_orders_created_by_user
  ON orders(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_orders_stock_source
  ON orders(stock_source_type, point_of_sale_id);

-- ============================================================
-- LIEN ENTRE LES MOUVEMENTS DE STOCK ET LES COMMANDES
-- ============================================================

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS order_id INTEGER;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS fk_stock_movements_order;

ALTER TABLE stock_movements
  ADD CONSTRAINT fk_stock_movements_order
  FOREIGN KEY (order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_order
  ON stock_movements(order_id);

COMMIT;