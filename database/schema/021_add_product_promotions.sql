BEGIN;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS promotion_percentage NUMERIC(5, 2);

ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_promotion_percentage_check;

ALTER TABLE products
ADD CONSTRAINT products_promotion_percentage_check
CHECK (
    promotion_percentage IS NULL
    OR (
        promotion_percentage > 0
        AND promotion_percentage < 100
    )
);

COMMENT ON COLUMN products.promotion_percentage IS
'Pourcentage de remise appliqué sur le site. NULL signifie aucune promotion.';

CREATE INDEX IF NOT EXISTS idx_products_promotion_percentage
ON products (promotion_percentage)
WHERE promotion_percentage IS NOT NULL;

COMMIT;