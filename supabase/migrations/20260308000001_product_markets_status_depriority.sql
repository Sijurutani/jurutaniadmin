-- Add a generated column to deprioritize rejected/deleted rows in default ordering.
-- Value: 0 = normal (pending / approved / archived / other)
--        1 = deprioritized (rejected / deleted) → always sorted last
ALTER TABLE product_markets
  ADD COLUMN IF NOT EXISTS status_depriority smallint
    GENERATED ALWAYS AS (
      CASE WHEN status IN ('rejected', 'deleted') THEN 1 ELSE 0 END
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_product_markets_status_depriority
  ON product_markets (status_depriority);
