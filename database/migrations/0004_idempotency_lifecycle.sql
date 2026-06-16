ALTER TABLE platform.idempotency_keys
  DROP CONSTRAINT idempotency_state_valid;

ALTER TABLE platform.idempotency_keys
  ADD CONSTRAINT idempotency_state_valid
  CHECK (state IN ('processing', 'completed', 'failed', 'expired'));

ALTER TABLE platform.idempotency_keys
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN failed_at timestamptz;

CREATE INDEX idempotency_processing_expiry
  ON platform.idempotency_keys(expires_at)
  WHERE state IN ('processing', 'failed');

COMMENT ON COLUMN platform.idempotency_keys.state IS
  'État technique du traitement idempotent; sans signification métier contractuelle.';
