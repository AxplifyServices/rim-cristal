BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(40) NOT NULL DEFAULT 'customer';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS point_of_sale_id INTEGER NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;

ALTER TABLE users
ADD CONSTRAINT chk_users_role
CHECK (role IN ('customer', 'admin', 'point_of_sale')) NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_users_point_of_sale'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT fk_users_point_of_sale
    FOREIGN KEY (point_of_sale_id)
    REFERENCES point_of_sales(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role
ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_point_of_sale
ON users(point_of_sale_id);

COMMIT;