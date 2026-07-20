BEGIN;

-- ============================================================
-- 1. TABLE DES VARIANTES D'IMAGES
-- ============================================================
--
-- Cette table ne remplace pas immédiatement :
--   products.url_image1 ... products.url_image5
--   homepage_brochures.image_url
--   homepage_brochures.mobile_image_url
--
-- Les anciennes colonnes restent la source de compatibilité.
-- Cette table complète le système avec les versions optimisées.
--
-- owner_type :
--   PRODUCT
--   HOMEPAGE_BROCHURE
--
-- source_slot :
--   PRODUCT_IMAGE_1 ... PRODUCT_IMAGE_5
--   BROCHURE_DESKTOP
--   BROCHURE_MOBILE
--
-- variant_type :
--   ORIGINAL
--   THUMBNAIL
--   CARD
--   MOBILE
--   TABLET
--   DETAIL
--   DESKTOP
--   LARGE
--
-- processing_status :
--   PENDING : variante à générer
--   PROCESSING : génération en cours
--   READY : variante disponible
--   FAILED : génération échouée
--

CREATE TABLE IF NOT EXISTS media_variants (
    id SERIAL PRIMARY KEY,

    owner_type VARCHAR(40) NOT NULL,
    owner_id INTEGER NOT NULL,
    source_slot VARCHAR(40) NOT NULL,

    variant_type VARCHAR(30) NOT NULL,

    original_url TEXT NOT NULL,
    variant_url TEXT NOT NULL,

    storage_object_key TEXT,

    width INTEGER,
    height INTEGER,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),

    processing_status VARCHAR(20) NOT NULL DEFAULT 'READY',
    processing_error TEXT,

    created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_media_variants_owner_type
        CHECK (
            owner_type IN (
                'PRODUCT',
                'HOMEPAGE_BROCHURE'
            )
        ),

    CONSTRAINT chk_media_variants_source_slot
        CHECK (
            source_slot IN (
                'PRODUCT_IMAGE_1',
                'PRODUCT_IMAGE_2',
                'PRODUCT_IMAGE_3',
                'PRODUCT_IMAGE_4',
                'PRODUCT_IMAGE_5',
                'BROCHURE_DESKTOP',
                'BROCHURE_MOBILE'
            )
        ),

    CONSTRAINT chk_media_variants_variant_type
        CHECK (
            variant_type IN (
                'ORIGINAL',
                'THUMBNAIL',
                'CARD',
                'MOBILE',
                'TABLET',
                'DETAIL',
                'DESKTOP',
                'LARGE'
            )
        ),

    CONSTRAINT chk_media_variants_processing_status
        CHECK (
            processing_status IN (
                'PENDING',
                'PROCESSING',
                'READY',
                'FAILED'
            )
        ),

    CONSTRAINT chk_media_variants_owner_slot_consistency
        CHECK (
            (
                owner_type = 'PRODUCT'
                AND source_slot IN (
                    'PRODUCT_IMAGE_1',
                    'PRODUCT_IMAGE_2',
                    'PRODUCT_IMAGE_3',
                    'PRODUCT_IMAGE_4',
                    'PRODUCT_IMAGE_5'
                )
            )
            OR
            (
                owner_type = 'HOMEPAGE_BROCHURE'
                AND source_slot IN (
                    'BROCHURE_DESKTOP',
                    'BROCHURE_MOBILE'
                )
            )
        ),

    CONSTRAINT chk_media_variants_owner_id_positive
        CHECK (owner_id > 0),

    CONSTRAINT chk_media_variants_width_positive
        CHECK (
            width IS NULL
            OR width > 0
        ),

    CONSTRAINT chk_media_variants_height_positive
        CHECK (
            height IS NULL
            OR height > 0
        ),

    CONSTRAINT chk_media_variants_file_size_positive
        CHECK (
            file_size_bytes IS NULL
            OR file_size_bytes >= 0
        )
);

-- Une seule variante d'un type donné pour une image donnée.
CREATE UNIQUE INDEX IF NOT EXISTS uq_media_variants_owner_slot_variant
    ON media_variants (
        owner_type,
        owner_id,
        source_slot,
        variant_type
    );

-- Recherche de toutes les variantes d'une image.
CREATE INDEX IF NOT EXISTS idx_media_variants_owner
    ON media_variants (
        owner_type,
        owner_id,
        source_slot
    );

-- Recherche des traitements en attente.
CREATE INDEX IF NOT EXISTS idx_media_variants_processing
    ON media_variants (
        processing_status,
        owner_type,
        owner_id
    )
    WHERE processing_status IN (
        'PENDING',
        'PROCESSING',
        'FAILED'
    );

-- Recherche par URL originale.
CREATE INDEX IF NOT EXISTS idx_media_variants_original_url
    ON media_variants (
        original_url
    );

-- Recherche par clé MinIO.
CREATE INDEX IF NOT EXISTS idx_media_variants_storage_object_key
    ON media_variants (
        storage_object_key
    )
    WHERE storage_object_key IS NOT NULL;


-- ============================================================
-- 2. ENREGISTREMENT DES IMAGES PRODUIT EXISTANTES
-- ============================================================
--
-- L'image existante est enregistrée comme ORIGINAL.
-- Elle est READY parce qu'elle existe déjà et reste utilisable.
-- Les autres variantes seront générées ensuite par le backend.
--

INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'PRODUCT',
    p.id,
    'PRODUCT_IMAGE_1',
    'ORIGINAL',
    BTRIM(p.url_image1),
    BTRIM(p.url_image1),
    'READY'
FROM products p
WHERE
    p.url_image1 IS NOT NULL
    AND BTRIM(p.url_image1) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'PRODUCT',
    p.id,
    'PRODUCT_IMAGE_2',
    'ORIGINAL',
    BTRIM(p.url_image2),
    BTRIM(p.url_image2),
    'READY'
FROM products p
WHERE
    p.url_image2 IS NOT NULL
    AND BTRIM(p.url_image2) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'PRODUCT',
    p.id,
    'PRODUCT_IMAGE_3',
    'ORIGINAL',
    BTRIM(p.url_image3),
    BTRIM(p.url_image3),
    'READY'
FROM products p
WHERE
    p.url_image3 IS NOT NULL
    AND BTRIM(p.url_image3) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'PRODUCT',
    p.id,
    'PRODUCT_IMAGE_4',
    'ORIGINAL',
    BTRIM(p.url_image4),
    BTRIM(p.url_image4),
    'READY'
FROM products p
WHERE
    p.url_image4 IS NOT NULL
    AND BTRIM(p.url_image4) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'PRODUCT',
    p.id,
    'PRODUCT_IMAGE_5',
    'ORIGINAL',
    BTRIM(p.url_image5),
    BTRIM(p.url_image5),
    'READY'
FROM products p
WHERE
    p.url_image5 IS NOT NULL
    AND BTRIM(p.url_image5) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


-- ============================================================
-- 3. ENREGISTREMENT DES BROCHURES EXISTANTES
-- ============================================================

INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'HOMEPAGE_BROCHURE',
    hb.id,
    'BROCHURE_DESKTOP',
    'ORIGINAL',
    BTRIM(hb.image_url),
    BTRIM(hb.image_url),
    'READY'
FROM homepage_brochures hb
WHERE
    hb.image_url IS NOT NULL
    AND BTRIM(hb.image_url) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    'HOMEPAGE_BROCHURE',
    hb.id,
    'BROCHURE_MOBILE',
    'ORIGINAL',
    BTRIM(hb.mobile_image_url),
    BTRIM(hb.mobile_image_url),
    'READY'
FROM homepage_brochures hb
WHERE
    hb.mobile_image_url IS NOT NULL
    AND BTRIM(hb.mobile_image_url) <> ''
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO UPDATE SET
    original_url = EXCLUDED.original_url,
    variant_url = EXCLUDED.variant_url,
    processing_status = 'READY',
    processing_error = NULL,
    updated_at = NOW();


-- ============================================================
-- 4. CRÉATION DES TÂCHES DE GÉNÉRATION À EFFECTUER
-- ============================================================
--
-- Ces lignes ne prétendent pas que les variantes existent déjà.
-- Elles permettent au futur script de migration de savoir ce qu'il
-- doit générer.
--
-- variant_url reprend temporairement l'URL originale.
-- Le frontend continuera donc à afficher une image fonctionnelle
-- tant que la variante optimisée n'a pas encore été créée.
-- Lorsque le traitement Sharp réussira :
--   - variant_url sera remplacée par l'URL WebP optimisée ;
--   - processing_status passera à READY ;
--   - width, height, file_size_bytes et mime_type seront renseignés.
--

-- Produits : miniature 320 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'THUMBNAIL',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'PRODUCT'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Produits : cartes 640 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'CARD',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'PRODUCT'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Produits : fiche produit 1200 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'DETAIL',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'PRODUCT'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Produits : grande image 1920 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'LARGE',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'PRODUCT'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Brochures desktop : 1280 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'TABLET',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'HOMEPAGE_BROCHURE'
    AND mv.source_slot = 'BROCHURE_DESKTOP'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Brochures desktop : 1920 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'DESKTOP',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'HOMEPAGE_BROCHURE'
    AND mv.source_slot = 'BROCHURE_DESKTOP'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Brochures desktop : 2560 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'LARGE',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'HOMEPAGE_BROCHURE'
    AND mv.source_slot = 'BROCHURE_DESKTOP'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Brochures mobiles : 768 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'MOBILE',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'HOMEPAGE_BROCHURE'
    AND mv.source_slot = 'BROCHURE_MOBILE'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


-- Brochures mobiles : version intermédiaire 1280 px.
INSERT INTO media_variants (
    owner_type,
    owner_id,
    source_slot,
    variant_type,
    original_url,
    variant_url,
    processing_status
)
SELECT
    mv.owner_type,
    mv.owner_id,
    mv.source_slot,
    'TABLET',
    mv.original_url,
    mv.original_url,
    'PENDING'
FROM media_variants mv
WHERE
    mv.owner_type = 'HOMEPAGE_BROCHURE'
    AND mv.source_slot = 'BROCHURE_MOBILE'
    AND mv.variant_type = 'ORIGINAL'
ON CONFLICT (
    owner_type,
    owner_id,
    source_slot,
    variant_type
)
DO NOTHING;


COMMIT;