CREATE TABLE platform.transaction_sequences (
  scope varchar(120) PRIMARY KEY,
  current_value bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_sequences_scope_not_blank CHECK (length(trim(scope)) > 0),
  CONSTRAINT transaction_sequences_current_value_positive CHECK (current_value >= 0)
);

CREATE FUNCTION platform.next_transaction_sequence(required_scope varchar)
RETURNS bigint
LANGUAGE sql
AS $$
  INSERT INTO platform.transaction_sequences(scope, current_value, updated_at)
  VALUES (required_scope, 1, now())
  ON CONFLICT (scope)
  DO UPDATE SET
    current_value = platform.transaction_sequences.current_value + 1,
    updated_at = now()
  RETURNING current_value;
$$;

REVOKE ALL ON platform.transaction_sequences FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON platform.transaction_sequences TO paositra_app;
GRANT EXECUTE ON FUNCTION platform.next_transaction_sequence(varchar) TO paositra_app;

COMMENT ON TABLE platform.transaction_sequences IS
  'Sequences atomiques pour identifiants techniques de transaction. Le format final reste a valider par PAOMA.';
