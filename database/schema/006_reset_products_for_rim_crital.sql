\set ON_ERROR_STOP on

BEGIN;

UPDATE order_items
SET product_id = NULL
WHERE product_id IS NOT NULL;

DELETE FROM wishlist_items;
DELETE FROM reviews;
DELETE FROM products;

ALTER SEQUENCE products_id_seq RESTART WITH 1;

COMMIT;