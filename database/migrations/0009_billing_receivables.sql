-- 0009 — Facturation & recouvrement (créances). Additive.
CREATE TABLE IF NOT EXISTS treasury.receivables (
  id uuid PRIMARY KEY,
  reference varchar(40) NOT NULL UNIQUE,
  debtor_name varchar(240) NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) NOT NULL DEFAULT 'MGA' CHECK (currency ~ '^[A-Z]{3}$'),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'en_cours'
    CHECK (status IN ('en_cours','relancee','virement_recu','cloturee','contentieux')),
  description text,
  settled_amount numeric(20,2),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS receivables_status_idx ON treasury.receivables(status);

CREATE TABLE IF NOT EXISTS treasury.receivable_events (
  id uuid PRIMARY KEY,
  receivable_id uuid NOT NULL REFERENCES treasury.receivables(id),
  action varchar(40) NOT NULL,
  comment text,
  actor_user_id uuid REFERENCES platform.users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS receivable_events_rid_idx ON treasury.receivable_events(receivable_id);

-- Privilèges au rôle applicatif (REQUIS, sinon le runtime échoue)
GRANT SELECT, INSERT, UPDATE ON treasury.receivables TO paositra_app;
GRANT SELECT, INSERT ON treasury.receivable_events TO paositra_app;

-- Permissions du module
INSERT INTO platform.permissions(code, description) VALUES
  ('treasury:receivables:read', 'Consulter les créances et virements'),
  ('treasury:receivables:write', 'Créer/relancer/encaisser/clôturer les créances'),
  ('treasury:receivables:export', 'Exporter les états de créances et virements')
ON CONFLICT (code) DO NOTHING;
