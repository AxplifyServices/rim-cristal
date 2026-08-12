BEGIN;

UPDATE products
SET price_multiplier = 2.2
WHERE
  price_multiplier IS NULL
  OR price_multiplier <> 2.2;

COMMIT;