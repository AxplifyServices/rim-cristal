BEGIN;

-- Chaque commande web reçoit un jeton public imprévisible.
-- Ce jeton permet de déposer un avis sans exposer l'identifiant interne.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS review_token VARCHAR(96);

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_review_token
ON orders (review_token)
WHERE review_token IS NOT NULL;


-- L'ancienne table reviews était centrée sur les produits.
-- On conserve la compatibilité avec les anciennes données,
-- mais product_id n'est plus obligatoire pour les avis de commande.
ALTER TABLE reviews
ALTER COLUMN product_id DROP NOT NULL;


-- Relation directe avec la commande concernée.
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS order_id INTEGER;

ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;

ALTER TABLE reviews
ADD CONSTRAINT reviews_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES orders(id)
ON DELETE CASCADE
ON UPDATE NO ACTION;


-- Une seule contribution client par commande.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_order_id
ON reviews (order_id)
WHERE order_id IS NOT NULL;


-- Modération explicite.
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30)
NOT NULL DEFAULT 'pending';

ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_moderation_status_check;

ALTER TABLE reviews
ADD CONSTRAINT reviews_moderation_status_check
CHECK (
    moderation_status IN (
        'pending',
        'approved',
        'rejected'
    )
);


-- L'administrateur choisit séparément les avis affichés sur la home.
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS display_on_home BOOLEAN
NOT NULL DEFAULT FALSE;


-- Date de dernière modification/modération.
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6)
NOT NULL DEFAULT NOW();


-- Les nouveaux avis ne sont jamais approuvés automatiquement.
ALTER TABLE reviews
ALTER COLUMN is_approved SET DEFAULT FALSE;

UPDATE reviews
SET
    moderation_status = CASE
        WHEN is_approved = TRUE THEN 'approved'
        ELSE 'pending'
    END
WHERE moderation_status IS NULL
   OR moderation_status NOT IN (
       'pending',
       'approved',
       'rejected'
   );


-- Cohérence : seuls les avis approuvés peuvent être affichés.
ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_home_requires_approval_check;

ALTER TABLE reviews
ADD CONSTRAINT reviews_home_requires_approval_check
CHECK (
    display_on_home = FALSE
    OR moderation_status = 'approved'
);


-- Validation de la note.
ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE reviews
ADD CONSTRAINT reviews_rating_check
CHECK (
    rating BETWEEN 1 AND 5
);


CREATE INDEX IF NOT EXISTS idx_reviews_moderation_created
ON reviews (
    moderation_status,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_reviews_home_created
ON reviews (
    display_on_home,
    created_at DESC
)
WHERE display_on_home = TRUE;

CREATE INDEX IF NOT EXISTS idx_reviews_order_id
ON reviews (order_id)
WHERE order_id IS NOT NULL;


COMMENT ON COLUMN orders.review_token IS
'Jeton aléatoire utilisé pour autoriser un avis après une commande web.';

COMMENT ON COLUMN reviews.display_on_home IS
'Détermine si l’avis approuvé apparaît dans le carrousel de la page d’accueil.';

COMMENT ON COLUMN reviews.moderation_status IS
'Statut de modération : pending, approved ou rejected.';

COMMIT;