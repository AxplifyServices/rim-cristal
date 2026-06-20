\set ON_ERROR_STOP on

/*
    SUPPRESSION DÉFINITIVE D'UN PRODUIT

    Produit ciblé :
      reference = RC-P000001

    Cette opération supprime :
      - les mouvements de stock ;
      - les stocks des points de vente ;
      - les favoris ;
      - les avis ;
      - les lignes de commandes ;
      - les lignes de ventes en point de vente ;
      - les commandes devenues vides ;
      - les ventes devenues vides ;
      - le produit.

    Pour les commandes ou ventes contenant d'autres produits,
    leurs totaux sont recalculés.
*/

BEGIN;

/*
|--------------------------------------------------------------------------
| 1. Identifier précisément le produit
|--------------------------------------------------------------------------
*/

CREATE TEMP TABLE target_product
ON COMMIT DROP
AS
SELECT
    id,
    name,
    reference,
    slug,
    url_image1,
    url_image2,
    url_image3,
    url_image4,
    url_image5
FROM products
WHERE reference = 'RC-P000001';

/*
|--------------------------------------------------------------------------
| 2. Vérifier qu'un seul produit correspond
|--------------------------------------------------------------------------
*/

DO $$
DECLARE
    target_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO target_count
    FROM target_product;

    IF target_count = 0 THEN
        RAISE EXCEPTION
            'Suppression annulée : aucun produit trouvé avec la référence RC-P000001.';
    END IF;

    IF target_count > 1 THEN
        RAISE EXCEPTION
            'Suppression annulée : plusieurs produits correspondent à RC-P000001.';
    END IF;
END
$$;

/*
|--------------------------------------------------------------------------
| 3. Afficher le produit qui va être supprimé
|--------------------------------------------------------------------------
*/

SELECT
    id,
    name,
    reference,
    slug
FROM target_product;

/*
|--------------------------------------------------------------------------
| 4. Mémoriser les commandes contenant le produit
|--------------------------------------------------------------------------
*/

CREATE TEMP TABLE affected_orders
ON COMMIT DROP
AS
SELECT DISTINCT
    order_items.order_id
FROM order_items
JOIN target_product
  ON target_product.id = order_items.product_id;

/*
|--------------------------------------------------------------------------
| 5. Mémoriser les ventes point de vente contenant le produit
|--------------------------------------------------------------------------
*/

CREATE TEMP TABLE affected_sales
ON COMMIT DROP
AS
SELECT DISTINCT
    point_of_sale_sale_items.sale_id
FROM point_of_sale_sale_items
JOIN target_product
  ON target_product.id = point_of_sale_sale_items.product_id;

/*
|--------------------------------------------------------------------------
| 6. Supprimer les mouvements de stock du produit
|--------------------------------------------------------------------------
|
| Cette table bloque actuellement la suppression du produit.
|
*/

DELETE FROM stock_movements
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 7. Supprimer les stocks du produit dans tous les points de vente
|--------------------------------------------------------------------------
*/

DELETE FROM point_of_sale_stocks
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 8. Supprimer le produit des listes de souhaits
|--------------------------------------------------------------------------
*/

DELETE FROM wishlist_items
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 9. Supprimer tous les avis du produit
|--------------------------------------------------------------------------
*/

DELETE FROM reviews
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 10. Supprimer les lignes de commandes liées au produit
|--------------------------------------------------------------------------
*/

DELETE FROM order_items
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 11. Supprimer les commandes devenues entièrement vides
|--------------------------------------------------------------------------
|
| Une commande qui ne contenait que ce produit n'a plus de raison
| d'exister si le produit doit être effacé comme s'il n'avait jamais existé.
|
*/

DELETE FROM orders
USING affected_orders
WHERE orders.id = affected_orders.order_id
  AND NOT EXISTS (
      SELECT 1
      FROM order_items
      WHERE order_items.order_id = orders.id
  );

/*
|--------------------------------------------------------------------------
| 12. Recalculer les commandes qui contiennent encore d'autres produits
|--------------------------------------------------------------------------
*/

UPDATE orders
SET
    subtotal = totals.new_subtotal,

    total = GREATEST(
        0,
        totals.new_subtotal
        + orders.shipping_cost
        - orders.discount_amount
    ),

    updated_at = NOW()

FROM (
    SELECT
        order_items.order_id,
        COALESCE(
            SUM(order_items.line_total),
            0
        )::NUMERIC(12, 2) AS new_subtotal

    FROM order_items

    WHERE order_items.order_id IN (
        SELECT order_id
        FROM affected_orders
    )

    GROUP BY order_items.order_id
) AS totals

WHERE orders.id = totals.order_id;

/*
|--------------------------------------------------------------------------
| 13. Supprimer les lignes de ventes point de vente liées au produit
|--------------------------------------------------------------------------
*/

DELETE FROM point_of_sale_sale_items
WHERE product_id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 14. Nettoyer les mouvements associés aux ventes devenues vides
|--------------------------------------------------------------------------
|
| Cette étape évite qu'une vente vide soit encore référencée
| par stock_movements.sale_id.
|
*/

DELETE FROM stock_movements
USING affected_sales
WHERE stock_movements.sale_id = affected_sales.sale_id
  AND NOT EXISTS (
      SELECT 1
      FROM point_of_sale_sale_items
      WHERE point_of_sale_sale_items.sale_id =
            affected_sales.sale_id
  );

/*
|--------------------------------------------------------------------------
| 15. Supprimer les ventes point de vente devenues vides
|--------------------------------------------------------------------------
*/

DELETE FROM point_of_sale_sales
USING affected_sales
WHERE point_of_sale_sales.id = affected_sales.sale_id
  AND NOT EXISTS (
      SELECT 1
      FROM point_of_sale_sale_items
      WHERE point_of_sale_sale_items.sale_id =
            point_of_sale_sales.id
  );

/*
|--------------------------------------------------------------------------
| 16. Recalculer les ventes contenant encore d'autres produits
|--------------------------------------------------------------------------
*/

UPDATE point_of_sale_sales
SET
    subtotal = totals.new_subtotal,

    total = GREATEST(
        0,
        totals.new_subtotal
        - point_of_sale_sales.discount_amount
    )

FROM (
    SELECT
        point_of_sale_sale_items.sale_id,

        COALESCE(
            SUM(
                point_of_sale_sale_items.line_total
            ),
            0
        )::NUMERIC(12, 2) AS new_subtotal

    FROM point_of_sale_sale_items

    WHERE point_of_sale_sale_items.sale_id IN (
        SELECT sale_id
        FROM affected_sales
    )

    GROUP BY point_of_sale_sale_items.sale_id
) AS totals

WHERE point_of_sale_sales.id = totals.sale_id;

/*
|--------------------------------------------------------------------------
| 17. Supprimer définitivement le produit
|--------------------------------------------------------------------------
*/

DELETE FROM products
WHERE id IN (
    SELECT id
    FROM target_product
);

/*
|--------------------------------------------------------------------------
| 18. Vérification finale
|--------------------------------------------------------------------------
*/

DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO remaining_count
    FROM products
    WHERE reference = 'RC-P000001';

    IF remaining_count <> 0 THEN
        RAISE EXCEPTION
            'La suppression a échoué : le produit RC-P000001 existe encore.';
    END IF;
END
$$;

COMMIT;

/*
|--------------------------------------------------------------------------
| 19. Résultat final
|--------------------------------------------------------------------------
*/

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM products
            WHERE reference = 'RC-P000001'
        )
        THEN 'ERREUR : produit encore présent'
        ELSE 'OK : produit définitivement supprimé'
    END AS deletion_result;