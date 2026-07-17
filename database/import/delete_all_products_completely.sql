\set ON_ERROR_STOP on

/*
|--------------------------------------------------------------------------
| SUPPRESSION COMPLÈTE DE TOUS LES PRODUITS
|--------------------------------------------------------------------------
|
| Ce script :
|   - conserve les commandes historiques ;
|   - conserve les ventes historiques ;
|   - détache les lignes historiques des produits ;
|   - supprime tous les mouvements de stock ;
|   - supprime tous les stocks par point de vente ;
|   - supprime tous les favoris ;
|   - supprime tous les avis ;
|   - supprime tous les produits ;
|   - remet la séquence products.id à 1.
|
| Les images MinIO ne sont pas supprimées par PostgreSQL.
| Elles devront être nettoyées séparément dans MinIO.
|
*/

BEGIN;

/*
|--------------------------------------------------------------------------
| 1. Verrouiller les tables concernées
|--------------------------------------------------------------------------
*/

LOCK TABLE products
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE stock_movements
IN SHARE ROW EXCLUSIVE MODE;

LOCK TABLE point_of_sale_stocks
IN SHARE ROW EXCLUSIVE MODE;

LOCK TABLE wishlist_items
IN SHARE ROW EXCLUSIVE MODE;

LOCK TABLE reviews
IN SHARE ROW EXCLUSIVE MODE;

LOCK TABLE order_items
IN SHARE ROW EXCLUSIVE MODE;

LOCK TABLE point_of_sale_sale_items
IN SHARE ROW EXCLUSIVE MODE;

/*
|--------------------------------------------------------------------------
| 2. Sauvegarder les URLs MinIO avant suppression
|--------------------------------------------------------------------------
|
| Cette table temporaire permet d'afficher les objets à supprimer ensuite
| dans MinIO.
|
*/

CREATE TEMP TABLE deleted_product_images
ON COMMIT PRESERVE ROWS
AS
SELECT DISTINCT image_url
FROM (
    SELECT url_image1 AS image_url FROM products
    UNION ALL
    SELECT url_image2 AS image_url FROM products
    UNION ALL
    SELECT url_image3 AS image_url FROM products
    UNION ALL
    SELECT url_image4 AS image_url FROM products
    UNION ALL
    SELECT url_image5 AS image_url FROM products
) AS product_images
WHERE image_url IS NOT NULL
  AND btrim(image_url) <> '';

/*
|--------------------------------------------------------------------------
| 3. Détacher les lignes de commandes
|--------------------------------------------------------------------------
|
| Les commandes restent consultables.
| Le nom, la référence, l'image, le prix et la quantité sont conservés
| dans order_items.
|
*/

UPDATE order_items
SET product_id = NULL
WHERE product_id IS NOT NULL;

/*
|--------------------------------------------------------------------------
| 4. Détacher les lignes de ventes en point de vente
|--------------------------------------------------------------------------
*/

UPDATE point_of_sale_sale_items
SET product_id = NULL
WHERE product_id IS NOT NULL;

/*
|--------------------------------------------------------------------------
| 5. Supprimer tous les mouvements de stock
|--------------------------------------------------------------------------
*/

DELETE FROM stock_movements;

/*
|--------------------------------------------------------------------------
| 6. Supprimer les stocks de tous les points de vente
|--------------------------------------------------------------------------
*/

DELETE FROM point_of_sale_stocks;

/*
|--------------------------------------------------------------------------
| 7. Supprimer les favoris
|--------------------------------------------------------------------------
*/

DELETE FROM wishlist_items;

/*
|--------------------------------------------------------------------------
| 8. Supprimer les avis
|--------------------------------------------------------------------------
*/

DELETE FROM reviews;

/*
|--------------------------------------------------------------------------
| 9. Supprimer tous les produits
|--------------------------------------------------------------------------
*/

DELETE FROM products;

/*
|--------------------------------------------------------------------------
| 10. Remettre la séquence des produits à zéro
|--------------------------------------------------------------------------
*/

SELECT setval(
    pg_get_serial_sequence(
        'products',
        'id'
    ),
    1,
    false
);

/*
|--------------------------------------------------------------------------
| 11. Vérification bloquante
|--------------------------------------------------------------------------
*/

DO $$
DECLARE
    remaining_products INTEGER;
    remaining_stock_movements INTEGER;
    remaining_point_of_sale_stocks INTEGER;
    remaining_wishlist_items INTEGER;
    remaining_reviews INTEGER;
    remaining_order_links INTEGER;
    remaining_sale_links INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO remaining_products
    FROM products;

    SELECT COUNT(*)
    INTO remaining_stock_movements
    FROM stock_movements;

    SELECT COUNT(*)
    INTO remaining_point_of_sale_stocks
    FROM point_of_sale_stocks;

    SELECT COUNT(*)
    INTO remaining_wishlist_items
    FROM wishlist_items;

    SELECT COUNT(*)
    INTO remaining_reviews
    FROM reviews;

    SELECT COUNT(*)
    INTO remaining_order_links
    FROM order_items
    WHERE product_id IS NOT NULL;

    SELECT COUNT(*)
    INTO remaining_sale_links
    FROM point_of_sale_sale_items
    WHERE product_id IS NOT NULL;

    IF remaining_products <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % produit(s) restent présents.',
            remaining_products;
    END IF;

    IF remaining_stock_movements <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % mouvement(s) de stock restent présents.',
            remaining_stock_movements;
    END IF;

    IF remaining_point_of_sale_stocks <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % stock(s) de point de vente restent présents.',
            remaining_point_of_sale_stocks;
    END IF;

    IF remaining_wishlist_items <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % favori(s) restent présents.',
            remaining_wishlist_items;
    END IF;

    IF remaining_reviews <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % avis restent présents.',
            remaining_reviews;
    END IF;

    IF remaining_order_links <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % ligne(s) de commande restent liées à un produit.',
            remaining_order_links;
    END IF;

    IF remaining_sale_links <> 0 THEN
        RAISE EXCEPTION
            'Suppression interrompue : % ligne(s) de vente restent liées à un produit.',
            remaining_sale_links;
    END IF;
END
$$;

COMMIT;

/*
|--------------------------------------------------------------------------
| 12. Résultat final
|--------------------------------------------------------------------------
*/

SELECT
    COUNT(*) AS remaining_products
FROM products;

SELECT
    COUNT(*) AS remaining_stock_movements
FROM stock_movements;

SELECT
    COUNT(*) AS remaining_point_of_sale_stocks
FROM point_of_sale_stocks;

SELECT
    COUNT(*) AS detached_order_items
FROM order_items
WHERE product_id IS NULL;

SELECT
    COUNT(*) AS detached_point_of_sale_sale_items
FROM point_of_sale_sale_items
WHERE product_id IS NULL;

/*
|--------------------------------------------------------------------------
| 13. URLs d'images qui existaient avant la suppression
|--------------------------------------------------------------------------
|
| Ces URLs sont affichées afin de permettre un nettoyage MinIO séparé.
|
*/

SELECT image_url
FROM deleted_product_images
ORDER BY image_url;