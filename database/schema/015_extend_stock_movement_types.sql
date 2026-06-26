BEGIN;

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS chk_stock_movement_type;

ALTER TABLE stock_movements
  ADD CONSTRAINT chk_stock_movement_type
  CHECK (
    movement_type IN (
      'global_adjustment',
      'global_to_pos',
      'pos_adjustment',
      'pos_sale',
      'web_order',
      'web_order_cancelled'
    )
  );

COMMIT;