BEGIN;

ALTER TABLE products
ADD COLUMN price_multiplier NUMERIC(10, 4);

ALTER TABLE products
ADD CONSTRAINT chk_products_price_multiplier
CHECK (
    price_multiplier IS NULL
    OR price_multiplier > 0
);

COMMENT ON COLUMN products.price_multiplier IS
'Multiplicateur appliqué au prix de base pour calculer le prix de vente margé. NULL = utilisation directe du prix de base.';

COMMIT;