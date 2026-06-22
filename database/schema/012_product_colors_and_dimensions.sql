BEGIN;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_color_variants BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10, 2);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS depth_cm NUMERIC(10, 2);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10, 2);

-- Tous les produits existants sont considérés comme non disponibles
-- en plusieurs couleurs.
UPDATE products
SET
    has_color_variants = FALSE,
    colors = '[]'::jsonb;

-- Normalisation temporaire des anciennes tailles.
--
-- Cas pris en charge :
-- ["80×180"]
-- ["80x180"]
-- ["80 X 180"]
-- ["80", "180"]
-- ["80", "40", "180"]
--
-- Pour deux valeurs :
-- largeur = première valeur
-- hauteur = deuxième valeur
--
-- Pour trois valeurs :
-- largeur = première valeur
-- profondeur = deuxième valeur
-- hauteur = troisième valeur

WITH normalized_sizes AS (
    SELECT
        id,
        CASE
            WHEN jsonb_typeof(sizes::jsonb) = 'array'
            THEN ARRAY(
                SELECT trim(value)
                FROM jsonb_array_elements_text(sizes::jsonb)
            )
            ELSE ARRAY[]::text[]
        END AS size_values
    FROM products
),
split_sizes AS (
    SELECT
        id,
        CASE
            WHEN cardinality(size_values) = 1
            THEN regexp_split_to_array(
                regexp_replace(
                    size_values[1],
                    '\s+',
                    '',
                    'g'
                ),
                '[xX×*]'
            )
            ELSE size_values
        END AS dimensions
    FROM normalized_sizes
),
clean_dimensions AS (
    SELECT
        id,
        ARRAY(
            SELECT NULLIF(
                regexp_replace(value, '[^0-9.,]', '', 'g'),
                ''
            )
            FROM unnest(dimensions) AS value
        ) AS dimensions
    FROM split_sizes
)
UPDATE products AS product
SET
    width_cm = CASE
        WHEN dimensions[1] IS NOT NULL
        THEN replace(dimensions[1], ',', '.')::numeric
        ELSE NULL
    END,

    depth_cm = CASE
        WHEN cardinality(dimensions) >= 3
             AND dimensions[2] IS NOT NULL
        THEN replace(dimensions[2], ',', '.')::numeric
        ELSE NULL
    END,

    height_cm = CASE
        WHEN cardinality(dimensions) >= 3
             AND dimensions[3] IS NOT NULL
        THEN replace(dimensions[3], ',', '.')::numeric

        WHEN cardinality(dimensions) = 2
             AND dimensions[2] IS NOT NULL
        THEN replace(dimensions[2], ',', '.')::numeric

        ELSE NULL
    END
FROM clean_dimensions
WHERE clean_dimensions.id = product.id;

ALTER TABLE products
DROP COLUMN IF EXISTS sizes;

COMMIT;