BEGIN;

CREATE INDEX IF NOT EXISTS idx_products_rubrique
ON products (rubrique);

CREATE INDEX IF NOT EXISTS idx_products_famille
ON products (famille);

CREATE INDEX IF NOT EXISTS idx_products_price
ON products (price);

CREATE INDEX IF NOT EXISTS idx_products_shop_visibility
ON products (
  is_active,
  is_available_on_site,
  stock
);

CREATE INDEX IF NOT EXISTS idx_products_shop_hierarchy
ON products (
  rubrique,
  categorie,
  famille
);

COMMIT;