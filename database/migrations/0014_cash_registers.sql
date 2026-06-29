-- 0014 — Caisses Lot 2 : sessions de caisse, opérations guichet, billetage, validation journée. Additive.
CREATE TABLE IF NOT EXISTS operations.cash_sessions (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  register_label varchar(80) NOT NULL,
  cashier_user_id uuid NOT NULL REFERENCES platform.users(id),
  business_date date NOT NULL,
  opening_amount numeric(20,2) NOT NULL DEFAULT 0,
  opening_billetage jsonb NOT NULL DEFAULT '{}'::jsonb,
  closing_billetage jsonb,
  declared_amount numeric(20,2),
  counted_amount numeric(20,2),
  ecart numeric(20,2),
  status varchar(15) NOT NULL DEFAULT 'ouverte' CHECK (status IN ('ouverte','fermee','validee','refusee')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES platform.users(id),
  validation_comment text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS cash_sessions_agency_idx ON operations.cash_sessions(agency_id);

CREATE TABLE IF NOT EXISTS operations.cash_operations (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES operations.cash_sessions(id),
  code varchar(60) NOT NULL UNIQUE,
  op_type varchar(120) NOT NULL,
  direction varchar(15) NOT NULL CHECK (direction IN ('encaissement','decaissement')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  payment_mode varchar(15) NOT NULL CHECK (payment_mode IN ('especes','cheque','credit')),
  client_id_type varchar(20),
  client_id_number varchar(60),
  reference varchar(80),
  status varchar(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','annulee')),
  cancel_reason text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cash_operations_sess_idx ON operations.cash_operations(session_id);

GRANT SELECT, INSERT, UPDATE ON operations.cash_sessions TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON operations.cash_operations TO paositra_app;

INSERT INTO platform.permissions(code, description) VALUES
  ('operations:cash:open', 'Ouvrir une caisse'),
  ('operations:cash:operate', 'Enregistrer/annuler des opérations de caisse'),
  ('operations:cash:close', 'Clôturer une caisse'),
  ('operations:day:validate', 'Valider la journée de caisse (Chef agence)')
ON CONFLICT (code) DO NOTHING;
