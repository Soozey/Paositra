-- 0018 - Portefeuilles, imports bancaires, versions budgetaires et pieces jointes.
-- Migration additive : les donnees existantes restent rattachees directement a leur exercice.

CREATE TABLE IF NOT EXISTS treasury.digital_wallets (
  id uuid PRIMARY KEY,
  provider varchar(120) NOT NULL,
  label varchar(200) NOT NULL,
  wallet_number varchar(80) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'MGA' CHECK (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(20,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS digital_wallets_number_unique
  ON treasury.digital_wallets(lower(provider), lower(wallet_number)) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS treasury.digital_wallet_entries (
  id uuid PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES treasury.digital_wallets(id),
  operation_date date NOT NULL,
  direction varchar(20) NOT NULL CHECK (direction IN ('encaissement','decaissement')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  external_reference varchar(120),
  label varchar(240) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'a_valider' CHECK (status IN ('a_valider','valide','rejete')),
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS wallet_entries_lookup
  ON treasury.digital_wallet_entries(wallet_id, operation_date DESC, status);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_entries_external_unique
  ON treasury.digital_wallet_entries(wallet_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS treasury.bank_import_batches (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES treasury.current_accounts(id),
  original_name varchar(500) NOT NULL,
  sha256 char(64) NOT NULL,
  imported_rows integer NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
  rejected_rows integer NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  status varchar(20) NOT NULL DEFAULT 'processed' CHECK (status IN ('processed','cancelled')),
  imported_by uuid NOT NULL REFERENCES platform.users(id),
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_import_account_hash_unique
  ON treasury.bank_import_batches(account_id, sha256) WHERE status = 'processed';

ALTER TABLE treasury.account_entries
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES treasury.bank_import_batches(id),
  ADD COLUMN IF NOT EXISTS external_reference varchar(120);
CREATE INDEX IF NOT EXISTS account_entries_import_batch_idx
  ON treasury.account_entries(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS account_entries_external_unique
  ON treasury.account_entries(account_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS treasury.budget_versions (
  id uuid PRIMARY KEY,
  exercise_id uuid NOT NULL REFERENCES treasury.budget_exercises(id),
  version_number integer NOT NULL CHECK (version_number > 0),
  label varchar(160) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','active','archivee')),
  justification text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid REFERENCES platform.users(id),
  activated_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  UNIQUE(exercise_id, version_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS budget_versions_one_active
  ON treasury.budget_versions(exercise_id) WHERE status = 'active';

ALTER TABLE treasury.budget_lines
  ADD COLUMN IF NOT EXISTS budget_version_id uuid REFERENCES treasury.budget_versions(id);
CREATE INDEX IF NOT EXISTS budget_lines_version_idx
  ON treasury.budget_lines(budget_version_id) WHERE budget_version_id IS NOT NULL;

INSERT INTO platform.permissions(code, description) VALUES
  ('treasury:wallets:read', 'Consulter les portefeuilles electroniques'),
  ('treasury:wallets:manage', 'Gerer les portefeuilles et leurs mouvements'),
  ('treasury:imports:read', 'Consulter les imports de releves bancaires'),
  ('treasury:imports:manage', 'Importer des releves bancaires controles'),
  ('treasury:attachments:read', 'Consulter les pieces jointes metier de tresorerie'),
  ('treasury:attachments:manage', 'Ajouter et archiver les pieces jointes metier de tresorerie')
ON CONFLICT (code) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON treasury.digital_wallets TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.digital_wallet_entries TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.bank_import_batches TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.budget_versions TO paositra_app;
