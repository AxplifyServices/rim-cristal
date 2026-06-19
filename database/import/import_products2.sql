\set ON_ERROR_STOP on

/*
Exécution attendue depuis la racine du projet :

psql "$DATABASE_URL" \
  -v csv_path='Traitement des images/output/produits.csv' \
  -f database/import/import_products.sql

Sous PowerShell :

psql "$env:DATABASE_URL" `
  -v "csv_path=Traitement des images/output/produits.csv" `
  -f "database/import/import_products.sql"
*/

BEGIN;

CREATE TEMP TABLE product_import_staging (
    csv_id                    TEXT,
    name                      TEXT,
    slug                      TEXT,
    reference                 TEXT,
    marque                    TEXT,
    rubrique                  TEXT,
    categorie                 TEXT,
    famille                   TEXT,
    description               TEXT,
    url_image1                TEXT,
    url_image2                TEXT,
    url_image3                TEXT,
    url_image4                TEXT,
    url_image5                TEXT,
    price                     TEXT,
    colors                    TEXT,
    sizes                     TEXT,
    stock                     TEXT,
    weight                    TEXT,
    badge                     TEXT,
    is_active                 TEXT,
    is_featured               TEXT,
    is_new                    TEXT,
    is_bestseller             TEXT,
    rating                    TEXT,
    reviews_count             TEXT,
    created_at                TEXT,
    updated_at                TEXT,
    category_id               TEXT,
    subcategory_id            TEXT,
    care_instructions         TEXT,
    origin_country            TEXT,
    collection_name           TEXT,
    seo_title                 TEXT,
    seo_description           TEXT,
    price_wholesale           TEXT,
    wholesale_min_qty         TEXT,
    is_available_on_site      TEXT
) ON COMMIT DROP;

\copy product_import_staging (csv_id, name, slug, reference, marque, rubrique, categorie, famille, description, url_image1, url_image2, url_image3, url_image4, url_image5, price, colors, sizes, stock, weight, badge, is_active, is_featured, is_new, is_bestseller, rating, reviews_count, created_at, updated_at, category_id, subcategory_id, care_instructions, origin_country, collection_name, seo_title, seo_description, price_wholesale, wholesale_min_qty, is_available_on_site) FROM 'C:/Users/zzaka/OneDrive/Bureau/Projet Dev/Rim_cristal/Traitement des images/output/produits.csv' WITH (FORMAT CSV, HEADER TRUE, ENCODING 'UTF8', DELIMITER ',', QUOTE '"', ESCAPE '"');
/*
Validation avant insertion.
Toute anomalie annule l'import grâce à ON_ERROR_STOP et à la transaction.
*/

DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO invalid_count
    FROM product_import_staging
    WHERE NULLIF(BTRIM(name), '') IS NULL
       OR NULLIF(BTRIM(slug), '') IS NULL
       OR NULLIF(BTRIM(reference), '') IS NULL
       OR NULLIF(BTRIM(price), '') IS NULL;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'Import annulé : % ligne(s) ont un nom, slug, référence ou prix vide.',
            invalid_count;
    END IF;
END
$$;

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT reference
        FROM product_import_staging
        GROUP BY reference
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION
            'Import annulé : % référence(s) sont en double dans le CSV.',
            duplicate_count;
    END IF;
END
$$;

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT slug
        FROM product_import_staging
        GROUP BY slug
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION
            'Import annulé : % slug(s) sont en double dans le CSV.',
            duplicate_count;
    END IF;
END
$$;

/*
Empêche de réattribuer à un produit un slug déjà utilisé
par une autre référence existante.
*/

DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM product_import_staging staging
    JOIN products existing
      ON existing.slug = BTRIM(staging.slug)
     AND existing.reference <> BTRIM(staging.reference);

    IF conflict_count > 0 THEN
        RAISE EXCEPTION
            'Import annulé : % slug(s) appartiennent déjà à une autre référence.',
            conflict_count;
    END IF;
END
$$;

/*
Création ou mise à jour de la catégorie multilingue principale.
La migration 005 contient normalement déjà ces catégories.
*/

INSERT INTO product_categories (
    parent_id,
    name_fr,
    name_en,
    slug,
    level,
    sort_order,
    is_active,
    updated_at
)
VALUES (
    NULL,
    'Luminaires',
    'Lighting',
    'luminaires',
    1,
    10,
    TRUE,
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
    name_fr = EXCLUDED.name_fr,
    name_en = EXCLUDED.name_en,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

/*
Sous-catégorie multilingue correspondant aux luminaires suspendus.
*/

INSERT INTO product_categories (
    parent_id,
    name_fr,
    name_en,
    slug,
    level,
    sort_order,
    is_active,
    updated_at
)
SELECT
    parent.id,
    'Suspensions',
    'Pendant lights',
    'suspensions',
    2,
    10,
    TRUE,
    NOW()
FROM product_categories parent
WHERE parent.slug = 'luminaires'
ON CONFLICT (slug) DO UPDATE
SET
    parent_id = EXCLUDED.parent_id,
    name_fr = EXCLUDED.name_fr,
    name_en = EXCLUDED.name_en,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = NOW();

/*
Import des produits.

Important :
- l'id du CSV n'est pas importé ;
- le stock existant n'est pas écrasé lors d'une mise à jour ;
- les relations existantes sont conservées ;
- les images sont converties de
  backend/uploads/products/image.jpg
  vers
  /uploads/products/image.jpg.
*/

INSERT INTO products (
    name,
    slug,
    reference,
    marque,
    rubrique,
    categorie,
    famille,
    description,

    url_image1,
    url_image2,
    url_image3,
    url_image4,
    url_image5,

    price,
    colors,
    sizes,
    stock,
    weight,
    badge,

    is_active,
    is_featured,
    is_new,
    is_bestseller,

    rating,
    reviews_count,

    category_id,
    subcategory_id,

    care_instructions,
    origin_country,
    collection_name,
    seo_title,
    seo_description,

    price_wholesale,
    wholesale_min_qty,
    is_available_on_site,

    created_at,
    updated_at
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

    CASE
        WHEN NULLIF(BTRIM(staging.url_image1), '') IS NULL THEN NULL
        ELSE REGEXP_REPLACE(
            REPLACE(BTRIM(staging.url_image1), '\', '/'),
            '^backend/',
            '/'
        )
    END,

    CASE
        WHEN NULLIF(BTRIM(staging.url_image2), '') IS NULL THEN NULL
        ELSE REGEXP_REPLACE(
            REPLACE(BTRIM(staging.url_image2), '\', '/'),
            '^backend/',
            '/'
        )
    END,

    CASE
        WHEN NULLIF(BTRIM(staging.url_image3), '') IS NULL THEN NULL
        ELSE REGEXP_REPLACE(
            REPLACE(BTRIM(staging.url_image3), '\', '/'),
            '^backend/',
            '/'
        )
    END,

    CASE
        WHEN NULLIF(BTRIM(staging.url_image4), '') IS NULL THEN NULL
        ELSE REGEXP_REPLACE(
            REPLACE(BTRIM(staging.url_image4), '\', '/'),
            '^backend/',
            '/'
        )
    END,

    CASE
        WHEN NULLIF(BTRIM(staging.url_image5), '') IS NULL THEN NULL
        ELSE REGEXP_REPLACE(
            REPLACE(BTRIM(staging.url_image5), '\', '/'),
            '^backend/',
            '/'
        )
    END,

    BTRIM(staging.price)::NUMERIC(12, 2),

    COALESCE(NULLIF(BTRIM(staging.colors), ''), '[]')::JSONB,
    COALESCE(NULLIF(BTRIM(staging.sizes), ''), '[]')::JSONB,

    COALESCE(NULLIF(BTRIM(staging.stock), ''), '0')::INTEGER,

    CASE
        WHEN NULLIF(BTRIM(staging.weight), '') IS NULL THEN NULL
        ELSE BTRIM(staging.weight)::NUMERIC(12, 2)
    END,

    NULLIF(BTRIM(staging.badge), ''),

    COALESCE(NULLIF(BTRIM(staging.is_active), ''), 'true')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.is_featured), ''), 'false')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.is_new), ''), 'false')::BOOLEAN,
    COALESCE(NULLIF(BTRIM(staging.is_bestseller), ''), 'false')::BOOLEAN,

    COALESCE(NULLIF(BTRIM(staging.rating), ''), '0')::NUMERIC(3, 2),
    COALESCE(NULLIF(BTRIM(staging.reviews_count), ''), '0')::INTEGER,

    main_category.id,
    subcategory.id,

    NULLIF(BTRIM(staging.care_instructions), ''),
    NULLIF(BTRIM(staging.origin_country), ''),
    NULLIF(BTRIM(staging.collection_name), ''),
    NULLIF(BTRIM(staging.seo_title), ''),
    NULLIF(BTRIM(staging.seo_description), ''),

    COALESCE(
        NULLIF(BTRIM(staging.price_wholesale), ''),
        '0'
    )::NUMERIC(12, 2),

    COALESCE(
        NULLIF(BTRIM(staging.wholesale_min_qty), ''),
        '1'
    )::INTEGER,

    COALESCE(
        NULLIF(BTRIM(staging.is_available_on_site), ''),
        'true'
    )::BOOLEAN,

    NOW(),
    NOW()

FROM product_import_staging staging

LEFT JOIN product_categories main_category
       ON main_category.slug = 'luminaires'

LEFT JOIN product_categories subcategory
       ON subcategory.slug = 'suspensions'

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
    sizes = EXCLUDED.sizes,

    /*
    Ne pas mettre :
        stock = EXCLUDED.stock

    Le stock est géré séparément par les mouvements de stock
    et les affectations aux points de vente.
    */

    weight = EXCLUDED.weight,
    badge = EXCLUDED.badge,

    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    is_new = EXCLUDED.is_new,
    is_bestseller = EXCLUDED.is_bestseller,

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

    updated_at = NOW();

/*
Synchronise la séquence sans modifier les IDs existants.
*/

SELECT SETVAL(
    PG_GET_SERIAL_SEQUENCE('products', 'id'),
    COALESCE((SELECT MAX(id) FROM products), 1),
    TRUE
);

COMMIT;

/*
Résumé visible dans le terminal après l'import.
*/

SELECT
    COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE is_active) AS active_products,
    COUNT(*) FILTER (WHERE is_available_on_site) AS website_products,
    COUNT(*) FILTER (WHERE url_image1 IS NOT NULL) AS products_with_image
FROM products;

SELECT
    id,
    reference,
    name,
    slug,
    price,
    stock,
    url_image1,
    category_id,
    subcategory_id
FROM products
ORDER BY id DESC
LIMIT 30;