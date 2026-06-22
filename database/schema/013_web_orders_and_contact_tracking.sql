BEGIN;

-- ============================================================
-- COMMANDES WEB
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP(6);

UPDATE orders
SET payment_method = 'cash_on_delivery'
WHERE payment_method IS NULL;

ALTER TABLE orders
  ALTER COLUMN payment_method SET DEFAULT 'cash_on_delivery';

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_delivered_paid
  ON orders(status, payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  status VARCHAR(40),
  payment_status VARCHAR(40),
  note TEXT,
  created_by_user_id INTEGER,
  created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_order_status_history_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_order_status_history_user
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON order_status_history(order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
  ON order_status_history(created_at);


-- ============================================================
-- CONTACTS
-- ============================================================

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(6) NOT NULL DEFAULT NOW();

ALTER TABLE contact_messages
  ALTER COLUMN subject DROP NOT NULL;

ALTER TABLE contact_messages
  ALTER COLUMN subject SET DEFAULT 'Demande depuis le site';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_contact_messages_assigned_user'
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT fk_contact_messages_assigned_user
      FOREIGN KEY (assigned_to_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages(status);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_contact_messages_next_action
  ON contact_messages(next_action_at);

CREATE TABLE IF NOT EXISTS contact_message_history (
  id SERIAL PRIMARY KEY,
  contact_message_id INTEGER NOT NULL,
  status VARCHAR(40),
  note TEXT,
  created_by_user_id INTEGER,
  created_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_contact_message_history_contact
    FOREIGN KEY (contact_message_id)
    REFERENCES contact_messages(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_contact_message_history_user
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_message_history_contact
  ON contact_message_history(contact_message_id);

COMMIT;