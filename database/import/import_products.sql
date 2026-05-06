\set ON_ERROR_STOP on

BEGIN;

UPDATE order_items
SET product_id = NULL
WHERE product_id IS NOT NULL;

DELETE FROM wishlist_items;
DELETE FROM reviews;

DELETE FROM products;

ALTER SEQUENCE products_id_seq RESTART WITH 1;

\copy products (name, slug, reference, marque, rubrique, categorie, famille, description, features, specs, url_image1, url_image2, url_image3, url_image4, url_image5, price, sale_price, discount_percent, colors, sizes, stock, weight, badge, is_active, is_featured, is_new, is_bestseller, rating, reviews_count) FROM 'C:/Users/zzaka/OneDrive/Bureau/Projet Dev/Luminaire/database/import/products_import_ready.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

UPDATE products
SET updated_at = NOW();

COMMIT;