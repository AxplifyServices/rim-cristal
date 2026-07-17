BEGIN;

CREATE TEMP TABLE product_image_migration_backup AS
SELECT
    id,
    url_image1,
    url_image2,
    url_image3,
    url_image4,
    url_image5
FROM products;

UPDATE products
SET
    url_image1 = CASE
        WHEN url_image1 IS NULL THEN NULL
        WHEN url_image1 LIKE '/uploads/products/%'
            THEN replace(
                url_image1,
                '/uploads/products/',
                '/media/products/'
            )
        WHEN url_image1 LIKE 'uploads/products/%'
            THEN replace(
                url_image1,
                'uploads/products/',
                '/media/products/'
            )
        WHEN url_image1 LIKE 'backend/uploads/products/%'
            THEN replace(
                url_image1,
                'backend/uploads/products/',
                '/media/products/'
            )
        WHEN url_image1 LIKE 'backend\ uploads\ products\ %' ESCAPE ' '
            THEN replace(
                replace(url_image1, '\', '/'),
                'backend/uploads/products/',
                '/media/products/'
            )
        ELSE url_image1
    END,

    url_image2 = CASE
        WHEN url_image2 IS NULL THEN NULL
        WHEN url_image2 LIKE '/uploads/products/%'
            THEN replace(
                url_image2,
                '/uploads/products/',
                '/media/products/'
            )
        WHEN url_image2 LIKE 'uploads/products/%'
            THEN replace(
                url_image2,
                'uploads/products/',
                '/media/products/'
            )
        WHEN url_image2 LIKE 'backend/uploads/products/%'
            THEN replace(
                url_image2,
                'backend/uploads/products/',
                '/media/products/'
            )
        ELSE url_image2
    END,

    url_image3 = CASE
        WHEN url_image3 IS NULL THEN NULL
        WHEN url_image3 LIKE '/uploads/products/%'
            THEN replace(
                url_image3,
                '/uploads/products/',
                '/media/products/'
            )
        WHEN url_image3 LIKE 'uploads/products/%'
            THEN replace(
                url_image3,
                'uploads/products/',
                '/media/products/'
            )
        WHEN url_image3 LIKE 'backend/uploads/products/%'
            THEN replace(
                url_image3,
                'backend/uploads/products/',
                '/media/products/'
            )
        ELSE url_image3
    END,

    url_image4 = CASE
        WHEN url_image4 IS NULL THEN NULL
        WHEN url_image4 LIKE '/uploads/products/%'
            THEN replace(
                url_image4,
                '/uploads/products/',
                '/media/products/'
            )
        WHEN url_image4 LIKE 'uploads/products/%'
            THEN replace(
                url_image4,
                'uploads/products/',
                '/media/products/'
            )
        WHEN url_image4 LIKE 'backend/uploads/products/%'
            THEN replace(
                url_image4,
                'backend/uploads/products/',
                '/media/products/'
            )
        ELSE url_image4
    END,

    url_image5 = CASE
        WHEN url_image5 IS NULL THEN NULL
        WHEN url_image5 LIKE '/uploads/products/%'
            THEN replace(
                url_image5,
                '/uploads/products/',
                '/media/products/'
            )
        WHEN url_image5 LIKE 'uploads/products/%'
            THEN replace(
                url_image5,
                'uploads/products/',
                '/media/products/'
            )
        WHEN url_image5 LIKE 'backend/uploads/products/%'
            THEN replace(
                url_image5,
                'backend/uploads/products/',
                '/media/products/'
            )
        ELSE url_image5
    END,

    updated_at = now();

DO $$
DECLARE
    remaining_local_urls INTEGER;
BEGIN
    SELECT count(*)
    INTO remaining_local_urls
    FROM products
    WHERE
        coalesce(url_image1, '') LIKE '%uploads/products/%'
        OR coalesce(url_image2, '') LIKE '%uploads/products/%'
        OR coalesce(url_image3, '') LIKE '%uploads/products/%'
        OR coalesce(url_image4, '') LIKE '%uploads/products/%'
        OR coalesce(url_image5, '') LIKE '%uploads/products/%';

    IF remaining_local_urls > 0 THEN
        RAISE EXCEPTION
            'Migration interrompue : % produit(s) contiennent encore une URL locale.',
            remaining_local_urls;
    END IF;
END
$$;

COMMIT;

SELECT
    count(*) FILTER (
        WHERE url_image1 LIKE '/media/%'
    ) AS image1_minio,
    count(*) FILTER (
        WHERE url_image2 LIKE '/media/%'
    ) AS image2_minio,
    count(*) FILTER (
        WHERE url_image3 LIKE '/media/%'
    ) AS image3_minio,
    count(*) FILTER (
        WHERE url_image4 LIKE '/media/%'
    ) AS image4_minio,
    count(*) FILTER (
        WHERE url_image5 LIKE '/media/%'
    ) AS image5_minio
FROM products;