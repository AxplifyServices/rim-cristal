\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE product_import_staging (
    name TEXT,
    slug TEXT,
    reference TEXT,
    marque TEXT,
    rubrique TEXT,
    categorie TEXT,
    famille TEXT,
    description TEXT,
    url_image1 TEXT,
    url_image2 TEXT,
    url_image3 TEXT,
    url_image4 TEXT,
    url_image5 TEXT,
    price TEXT,
    colors TEXT,
    stock TEXT,
    weight TEXT,
    badge TEXT,
    is_active TEXT,
    is_featured TEXT,
    is_new TEXT,
    is_bestseller TEXT,
    rating TEXT,
    reviews_count TEXT,
    category_slug TEXT,
    subcategory_slug TEXT,
    care_instructions TEXT,
    origin_country TEXT,
    collection_name TEXT,
    seo_title TEXT,
    seo_description TEXT,
    price_wholesale TEXT,
    wholesale_min_qty TEXT,
    is_available_on_site TEXT,
    has_color_variants TEXT,
    width_cm TEXT,
    depth_cm TEXT,
    height_cm TEXT
) ON COMMIT DROP;

\copy product_import_staging FROM 'database/import/products_import_ready_gpt5.csv' WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8', DELIMITER ',', QUOTE '"', ESCAPE '"');

DO $$
DECLARE invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM product_import_staging
    WHERE NULLIF(BTRIM(name), '') IS NULL
       OR NULLIF(BTRIM(slug), '') IS NULL
       OR NULLIF(BTRIM(reference), '') IS NULL
       OR NULLIF(BTRIM(price), '') IS NULL;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Import annulé : % ligne(s) obligatoire(s) invalide(s).', invalid_count;
    END IF;
END $$;

DO $$
DECLARE duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT BTRIM(reference)
        FROM product_import_staging
        GROUP BY BTRIM(reference)
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Import annulé : % référence(s) dupliquée(s).', duplicate_count;
    END IF;
END $$;

DO $$
DECLARE duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT BTRIM(slug)
        FROM product_import_staging
        GROUP BY BTRIM(slug)
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Import annulé : % slug(s) dupliqué(s).', duplicate_count;
    END IF;
END $$;

DO $$
DECLARE conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM product_import_staging staging
    JOIN products existing
      ON existing.slug = BTRIM(staging.slug)
     AND existing.reference <> BTRIM(staging.reference);

    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Import annulé : % slug(s) appartiennent déjà à une autre référence.', conflict_count;
    END IF;
END $$;

CREATE TEMP TABLE product_stock_before AS
SELECT
    staging.reference,
    product.id AS product_id,
    product.stock AS stock_before
FROM product_import_staging staging
JOIN products product
  ON product.reference = BTRIM(staging.reference);

INSERT INTO products (
    name, slug, reference, marque, rubrique, categorie, famille, description,
    url_image1, url_image2, url_image3, url_image4, url_image5,
    price, colors, stock, weight, badge,
    is_active, is_featured, is_new, is_bestseller,
    rating, reviews_count,
    category_id, subcategory_id,
    care_instructions, origin_country, collection_name,
    seo_title, seo_description,
    price_wholesale, wholesale_min_qty, is_available_on_site,
    has_color_variants, width_cm, depth_cm, height_cm,
    created_at, updated_at
)
SELECT
    BTRIM(staging.name),
    BTRIM(staging.slug),
    BTRIM(staging.reference),
    NULLIF(BTRIM(staging.marque), ''),
    NULLIF(BTRIM(staging.rubrique), ''),
    NULLIF(BTRIM(staging.categorie), ''),
    NULLIF(BTRIM(staging.famille), ''),
    NULLIF(BTRIM(staging.description), ''),
    NULLIF(REGEXP_REPLACE(REPLACE(BTRIM(staging.url_image1), '\\', '/'), '^backend/', '/'), ''),
    NULLIF(REGEXP_REPLACE(REPLACE(BTRIM(staging.url_image2), '\\', '/'), '^backend/', '/'), ''),
    NULLIF(REGEXP_REPLACE(REPLACE(BTRIM(staging.url_image3), '\\', '/'), '^backend/', '/'), ''),
    NULLIF(REGEXP_REPLACE(REPLACE(BTRIM(staging.url_image4), '\\', '/'), '^backend/', '/'), ''),
    NULLIF(REGEXP_REPLACE(REPLACE(BTRIM(staging.url_image5), '\\', '/'), '^backend/', '/'), ''),
    BTRIM(staging.price)::NUMERIC(12, 2),
    COALESCE(NULLIF(BTRIM(staging.colors), ''), '[]')::JSONB,
    10000,
    CASE WHEN NULLIF(BTRIM(staging.weight), '') IS NULL THEN NULL ELSE BTRIM(staging.weight)::NUMERIC(12, 2) END,
    NULLIF(BTRIM(staging.badge), ''),
    COALESCE(NULLIF(BTRIM(staging.is_active), ''), 'true')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.is_featured), ''), 'false')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.is_new), ''), 'false')::BOOLEAN,
    FALSE,
    COALESCE(NULLIF(BTRIM(staging.rating), ''), '0')::NUMERIC(3, 2),
    COALESCE(NULLIF(BTRIM(staging.reviews_count), ''), '0')::INTEGER,
    main_category.id,
    subcategory.id,
    NULLIF(BTRIM(staging.care_instructions), ''),
    NULLIF(BTRIM(staging.origin_country), ''),
    NULLIF(BTRIM(staging.collection_name), ''),
    NULLIF(BTRIM(staging.seo_title), ''),
    NULLIF(BTRIM(staging.seo_description), ''),
    COALESCE(NULLIF(BTRIM(staging.price_wholesale), ''), '0')::NUMERIC(12, 2),
    COALESCE(NULLIF(BTRIM(staging.wholesale_min_qty), ''), '1')::INTEGER,
    COALESCE(NULLIF(BTRIM(staging.is_available_on_site), ''), 'false')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.has_color_variants), ''), 'false')::BOOLEAN,
    CASE WHEN NULLIF(BTRIM(staging.width_cm), '') IS NULL THEN NULL ELSE BTRIM(staging.width_cm)::NUMERIC(10, 2) END,
    CASE WHEN NULLIF(BTRIM(staging.depth_cm), '') IS NULL THEN NULL ELSE BTRIM(staging.depth_cm)::NUMERIC(10, 2) END,
    CASE WHEN NULLIF(BTRIM(staging.height_cm), '') IS NULL THEN NULL ELSE BTRIM(staging.height_cm)::NUMERIC(10, 2) END,
    NOW(),
    NOW()
FROM product_import_staging staging
LEFT JOIN product_categories main_category
  ON main_category.slug = NULLIF(BTRIM(staging.category_slug), '')
LEFT JOIN product_categories subcategory
  ON subcategory.slug = NULLIF(BTRIM(staging.subcategory_slug), '')
ON CONFLICT (reference) DO UPDATE
SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    marque = EXCLUDED.marque,
    rubrique = EXCLUDED.rubrique,
    categorie = EXCLUDED.categorie,
    famille = EXCLUDED.famille,
    description = EXCLUDED.description,
    url_image1 = EXCLUDED.url_image1,
    url_image2 = EXCLUDED.url_image2,
    url_image3 = EXCLUDED.url_image3,
    url_image4 = EXCLUDED.url_image4,
    url_image5 = EXCLUDED.url_image5,
    price = EXCLUDED.price,
    colors = EXCLUDED.colors,
    stock = 10000,
    weight = EXCLUDED.weight,
    badge = EXCLUDED.badge,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    is_new = EXCLUDED.is_new,
    is_bestseller = FALSE,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    care_instructions = EXCLUDED.care_instructions,
    origin_country = EXCLUDED.origin_country,
    collection_name = EXCLUDED.collection_name,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    price_wholesale = EXCLUDED.price_wholesale,
    wholesale_min_qty = EXCLUDED.wholesale_min_qty,
    is_available_on_site = EXCLUDED.is_available_on_site,
    has_color_variants = EXCLUDED.has_color_variants,
    width_cm = EXCLUDED.width_cm,
    depth_cm = EXCLUDED.depth_cm,
    height_cm = EXCLUDED.height_cm,
    updated_at = NOW();

INSERT INTO stock_movements (
    product_id,
    point_of_sale_id,
    movement_type,
    quantity,
    stock_global_before,
    stock_global_after,
    note,
    created_at
)
SELECT
    product.id,
    NULL,
    'global_adjustment',
    10000 - COALESCE(before.stock_before, 0),
    COALESCE(before.stock_before, 0),
    10000,
    'Initialisation stock import catalogue GPT-5',
    NOW()
FROM product_import_staging staging
JOIN products product
  ON product.reference = BTRIM(staging.reference)
LEFT JOIN product_stock_before before
  ON before.reference = BTRIM(staging.reference)
WHERE COALESCE(before.stock_before, 0) <> 10000;

SELECT SETVAL(
    PG_GET_SERIAL_SEQUENCE('products', 'id'),
    COALESCE((SELECT MAX(id) FROM products), 1),
    TRUE
);

COMMIT;

SELECT
    COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE stock = 10000) AS products_stock_10000,
    COUNT(*) FILTER (WHERE is_bestseller) AS bestsellers,
    COUNT(*) FILTER (WHERE url_image1 IS NOT NULL) AS products_with_image,
    COUNT(*) FILTER (WHERE is_available_on_site) AS products_available_on_site
FROM products;
