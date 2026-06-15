BEGIN;

DROP INDEX IF EXISTS idx_products_material_tags;
DROP INDEX IF EXISTS idx_products_room_tags;
DROP INDEX IF EXISTS idx_products_style_tags;

ALTER TABLE products
  DROP COLUMN IF EXISTS sale_price,
  DROP COLUMN IF EXISTS discount_percent,
  DROP COLUMN IF EXISTS features,
  DROP COLUMN IF EXISTS specs,
  DROP COLUMN IF EXISTS room_tags,
  DROP COLUMN IF EXISTS material_tags,
  DROP COLUMN IF EXISTS style_tags,
  DROP COLUMN IF EXISTS dimensions;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_available_on_site BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN products.weight IS 'Poids du produit en grammes';
COMMENT ON COLUMN products.is_available_on_site IS 'Indique si le produit est vendable sur le site web public';

CREATE INDEX IF NOT EXISTS idx_products_available_on_site
  ON products(is_available_on_site);

COMMIT;