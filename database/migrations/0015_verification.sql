-- 0015 — Vérification : grille soldes/écarts, accusé de crédit, mise à disposition de fonds. Additive.
CREATE TABLE IF NOT EXISTS operations.verifications (
  id uuid PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  period_date date NOT NULL,
  expected_balance numeric(20,2) NOT NULL,
  counted_balance numeric(20,2) NOT NULL,
  ecart numeric(20,2) NOT NULL,
  status varchar(15) NOT NULL CHECK (status IN ('conforme','deficit','excedent')),
  justification text,
  verifier_user_id uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verifications_agency_idx ON operations.verifications(agency_id);

CREATE TABLE IF NOT EXISTS operations.credit_acknowledgements (
  id uuid PRIMARY KEY,
  number varchar(40) NOT NULL UNIQUE,
  agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  beneficiary varchar(240) NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  verification_id uuid REFERENCES operations.verifications(id),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations.fund_provisions (
  id uuid PRIMARY KEY,
  reference varchar(40) NOT NULL UNIQUE,
  from_agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  to_agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  status varchar(20) NOT NULL DEFAULT 'demande'
    CHECK (status IN ('demande','solde_verifie','autorise','confirme','rejete')),
  requested_by uuid NOT NULL REFERENCES platform.users(id),
  authorized_by uuid REFERENCES platform.users(id),
  confirmed_by uuid REFERENCES platform.users(id),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

GRANT SELECT, INSERT, UPDATE ON operations.verifications TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON operations.credit_acknowledgements TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON operations.fund_provisions TO paositra_app;

INSERT INTO platform.permissions(code, description) VALUES
  ('operations:verification:read', 'Consulter les vérifications et écarts'),
  ('operations:verification:validate', 'Enregistrer une vérification et générer un accusé'),
  ('operations:fund:manage', 'Gérer les mises à disposition de fonds (double validation)')
ON CONFLICT (code) DO NOTHING;
