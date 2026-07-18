BEGIN;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS requires_stock_confirmation BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS is_backorder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_requires_stock_confirmation
ON orders (
    requires_stock_confirmation,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_order_items_is_backorder
ON order_items (
    is_backorder
);

COMMENT ON COLUMN orders.requires_stock_confirmation IS
'Indique qu''au moins une ligne de la commande nécessite une confirmation ou un réapprovisionnement.';

COMMENT ON COLUMN order_items.is_backorder IS
'Indique que la quantité commandée n''était pas disponible au moment de la commande.';

COMMIT;