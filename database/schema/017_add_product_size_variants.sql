BEGIN;

-- ============================================================
-- 1. Activation des variantes de taille sur les produits
-- ============================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_size_variants BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.has_size_variants IS
'Indique si le produit propose plusieurs tailles sélectionnables.';


-- ============================================================
-- 2. Table des variantes de taille
-- ============================================================

CREATE TABLE IF NOT EXISTS product_size_variants (
    id BIGSERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL,

    label VARCHAR(160),

    reference VARCHAR(140),

    width_cm NUMERIC(10, 2),

    depth_cm NUMERIC(10, 2),

    height_cm NUMERIC(10, 2),

    price NUMERIC(12, 2) NOT NULL DEFAULT 0,

    price_wholesale NUMERIC(12, 2) NOT NULL DEFAULT 0,

    wholesale_min_qty INTEGER NOT NULL DEFAULT 1,

    stock INTEGER NOT NULL DEFAULT 0,

    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_size_variants_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT product_size_variants_price_check
        CHECK (price >= 0),

    CONSTRAINT product_size_variants_wholesale_price_check
        CHECK (price_wholesale >= 0),

    CONSTRAINT product_size_variants_wholesale_qty_check
        CHECK (wholesale_min_qty >= 1),

    CONSTRAINT product_size_variants_stock_check
        CHECK (stock >= 0),

    CONSTRAINT product_size_variants_dimensions_check
        CHECK (
            (width_cm IS NULL OR width_cm >= 0)
            AND
            (depth_cm IS NULL OR depth_cm >= 0)
            AND
            (height_cm IS NULL OR height_cm >= 0)
        )
);

CREATE INDEX IF NOT EXISTS idx_product_size_variants_product
ON product_size_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_product_size_variants_active
ON product_size_variants(product_id, is_active);

CREATE INDEX IF NOT EXISTS idx_product_size_variants_stock
ON product_size_variants(stock);

CREATE INDEX IF NOT EXISTS idx_product_size_variants_display_order
ON product_size_variants(product_id, display_order, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_size_variants_reference
ON product_size_variants(reference)
WHERE reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_primary_size_variant
ON product_size_variants(product_id)
WHERE is_primary = TRUE;


-- ============================================================
-- 3. Création d'une variante principale pour chaque produit
--    existant
-- ============================================================

INSERT INTO product_size_variants (
    product_id,
    label,
    reference,
    width_cm,
    depth_cm,
    height_cm,
    price,
    price_wholesale,
    wholesale_min_qty,
    stock,
    is_primary,
    is_active,
    display_order,
    created_at,
    updated_at
)
SELECT
    p.id,
    CASE
        WHEN p.width_cm IS NOT NULL
          OR p.depth_cm IS NOT NULL
          OR p.height_cm IS NOT NULL
        THEN CONCAT_WS(
            ' × ',
            CASE
                WHEN p.width_cm IS NOT NULL
                THEN TRIM(TRAILING '.00' FROM p.width_cm::TEXT)
            END,
            CASE
                WHEN p.depth_cm IS NOT NULL
                THEN TRIM(TRAILING '.00' FROM p.depth_cm::TEXT)
            END,
            CASE
                WHEN p.height_cm IS NOT NULL
                THEN TRIM(TRAILING '.00' FROM p.height_cm::TEXT)
            END
        ) || ' cm'
        ELSE 'Taille standard'
    END,
    p.reference || '-T1',
    p.width_cm,
    p.depth_cm,
    p.height_cm,
    p.price,
    COALESCE(p.price_wholesale, 0),
    GREATEST(COALESCE(p.wholesale_min_qty, 1), 1),
    GREATEST(COALESCE(p.stock, 0), 0),
    TRUE,
    TRUE,
    0,
    COALESCE(p.created_at, CURRENT_TIMESTAMP),
    COALESCE(p.updated_at, CURRENT_TIMESTAMP)
FROM products p
WHERE NOT EXISTS (
    SELECT 1
    FROM product_size_variants psv
    WHERE psv.product_id = p.id
);


-- ============================================================
-- 4. Liaison de la taille aux commandes web
-- ============================================================

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_size_variant_id BIGINT;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_width_cm NUMERIC(10, 2);

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_depth_cm NUMERIC(10, 2);

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS selected_height_cm NUMERIC(10, 2);

ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_size_variant
FOREIGN KEY (product_size_variant_id)
REFERENCES product_size_variants(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_size_variant
ON order_items(product_size_variant_id);

UPDATE order_items oi
SET
    product_size_variant_id = psv.id,
    selected_size = COALESCE(
        NULLIF(oi.selected_size, ''),
        psv.label
    ),
    selected_width_cm = psv.width_cm,
    selected_depth_cm = psv.depth_cm,
    selected_height_cm = psv.height_cm
FROM product_size_variants psv
WHERE
    oi.product_id = psv.product_id
    AND psv.is_primary = TRUE
    AND oi.product_size_variant_id IS NULL;


-- ============================================================
-- 5. Liaison de la taille aux ventes point de vente
-- ============================================================

ALTER TABLE point_of_sale_sale_items
ADD COLUMN IF NOT EXISTS product_size_variant_id BIGINT;

ALTER TABLE point_of_sale_sale_items
ADD COLUMN IF NOT EXISTS selected_size VARCHAR(160);

ALTER TABLE point_of_sale_sale_items
ADD COLUMN IF NOT EXISTS selected_width_cm NUMERIC(10, 2);

ALTER TABLE point_of_sale_sale_items
ADD COLUMN IF NOT EXISTS selected_depth_cm NUMERIC(10, 2);

ALTER TABLE point_of_sale_sale_items
ADD COLUMN IF NOT EXISTS selected_height_cm NUMERIC(10, 2);

ALTER TABLE point_of_sale_sale_items
ADD CONSTRAINT fk_pos_sale_items_size_variant
FOREIGN KEY (product_size_variant_id)
REFERENCES product_size_variants(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_size_variant
ON point_of_sale_sale_items(product_size_variant_id);

UPDATE point_of_sale_sale_items psi
SET
    product_size_variant_id = psv.id,
    selected_size = psv.label,
    selected_width_cm = psv.width_cm,
    selected_depth_cm = psv.depth_cm,
    selected_height_cm = psv.height_cm
FROM product_size_variants psv
WHERE
    psi.product_id = psv.product_id
    AND psv.is_primary = TRUE
    AND psi.product_size_variant_id IS NULL;


-- ============================================================
-- 6. Stock par taille dans chaque point de vente
-- ============================================================

ALTER TABLE point_of_sale_stocks
ADD COLUMN IF NOT EXISTS product_size_variant_id BIGINT;

ALTER TABLE point_of_sale_stocks
ADD CONSTRAINT fk_pos_stocks_size_variant
FOREIGN KEY (product_size_variant_id)
REFERENCES product_size_variants(id)
ON DELETE CASCADE;

UPDATE point_of_sale_stocks pss
SET product_size_variant_id = psv.id
FROM product_size_variants psv
WHERE
    pss.product_id = psv.product_id
    AND psv.is_primary = TRUE
    AND pss.product_size_variant_id IS NULL;

ALTER TABLE point_of_sale_stocks
ALTER COLUMN product_size_variant_id SET NOT NULL;

ALTER TABLE point_of_sale_stocks
DROP CONSTRAINT IF EXISTS uq_pos_product_stock;

DROP INDEX IF EXISTS uq_pos_product_stock;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_product_size_variant_stock
ON point_of_sale_stocks(
    point_of_sale_id,
    product_size_variant_id
);

CREATE INDEX IF NOT EXISTS idx_pos_stocks_size_variant
ON point_of_sale_stocks(product_size_variant_id);


-- ============================================================
-- 7. Historique des mouvements de stock par taille
-- ============================================================

ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS product_size_variant_id BIGINT;

ALTER TABLE stock_movements
ADD CONSTRAINT fk_stock_movements_size_variant
FOREIGN KEY (product_size_variant_id)
REFERENCES product_size_variants(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_size_variant
ON stock_movements(product_size_variant_id);

UPDATE stock_movements sm
SET product_size_variant_id = psv.id
FROM product_size_variants psv
WHERE
    sm.product_id = psv.product_id
    AND psv.is_primary = TRUE
    AND sm.product_size_variant_id IS NULL;


-- ============================================================
-- 8. Fonction de recalcul des données compatibles dans products
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_product_size_variant_summary(
    target_product_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    primary_variant product_size_variants%ROWTYPE;
    total_stock INTEGER;
BEGIN
    SELECT *
    INTO primary_variant
    FROM product_size_variants
    WHERE
        product_id = target_product_id
        AND is_primary = TRUE
    ORDER BY id
    LIMIT 1;

    SELECT COALESCE(SUM(stock), 0)
    INTO total_stock
    FROM product_size_variants
    WHERE
        product_id = target_product_id
        AND is_active = TRUE;

    IF primary_variant.id IS NOT NULL THEN
        UPDATE products
        SET
            price = primary_variant.price,
            price_wholesale = primary_variant.price_wholesale,
            wholesale_min_qty = primary_variant.wholesale_min_qty,
            width_cm = primary_variant.width_cm,
            depth_cm = primary_variant.depth_cm,
            height_cm = primary_variant.height_cm,
            stock = total_stock,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = target_product_id;
    ELSE
        UPDATE products
        SET
            stock = total_stock,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = target_product_id;
    END IF;
END;
$$;


-- ============================================================
-- 9. Trigger de synchronisation automatique
-- ============================================================

CREATE OR REPLACE FUNCTION sync_product_after_size_variant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_product_id INTEGER;
BEGIN
    affected_product_id := COALESCE(
        NEW.product_id,
        OLD.product_id
    );

    PERFORM refresh_product_size_variant_summary(
        affected_product_id
    );

    IF
        TG_OP = 'UPDATE'
        AND OLD.product_id IS DISTINCT FROM NEW.product_id
    THEN
        PERFORM refresh_product_size_variant_summary(
            OLD.product_id
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_after_size_variant_change
ON product_size_variants;

CREATE TRIGGER trg_sync_product_after_size_variant_change
AFTER INSERT OR UPDATE OR DELETE
ON product_size_variants
FOR EACH ROW
EXECUTE FUNCTION sync_product_after_size_variant_change();


-- ============================================================
-- 10. Protection : chaque produit doit conserver une taille
--     principale
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_primary_size_variant_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_primary = TRUE THEN
        IF NOT EXISTS (
            SELECT 1
            FROM product_size_variants
            WHERE
                product_id = OLD.product_id
                AND id <> OLD.id
                AND is_primary = TRUE
        ) THEN
            RAISE EXCEPTION
                'A product must keep one primary size variant';
        END IF;
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_primary_size_variant_removal
ON product_size_variants;

CREATE TRIGGER trg_prevent_primary_size_variant_removal
BEFORE DELETE
ON product_size_variants
FOR EACH ROW
EXECUTE FUNCTION prevent_primary_size_variant_removal();


-- ============================================================
-- 11. Recalcul initial
-- ============================================================

DO $$
DECLARE
    product_row RECORD;
BEGIN
    FOR product_row IN
        SELECT id
        FROM products
    LOOP
        PERFORM refresh_product_size_variant_summary(
            product_row.id
        );
    END LOOP;
END;
$$;

COMMIT;