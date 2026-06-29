-- 0012 — Comptes courants (journal, rapprochement CCP simplifié, chèques). Additive.
CREATE TABLE IF NOT EXISTS treasury.current_accounts (
  id uuid PRIMARY KEY,
  label varchar(200) NOT NULL,
  bank varchar(160) NOT NULL,
  account_number varchar(60) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'MGA' CHECK (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(20,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS treasury.account_entries (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES treasury.current_accounts(id),
  entry_date date NOT NULL,
  direction varchar(15) NOT NULL CHECK (direction IN ('encaissement','decaissement')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  piece_reference varchar(80),
  label varchar(240) NOT NULL,
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_entries_acc_idx ON treasury.account_entries(account_id);

CREATE TABLE IF NOT EXISTS treasury.cheques (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES treasury.current_accounts(id),
  cheque_number varchar(40) NOT NULL,
  beneficiary varchar(240) NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  status varchar(20) NOT NULL DEFAULT 'emis'
    CHECK (status IN ('emis','en_circulation','encaisse','annule','expire')),
  issue_date date NOT NULL,
  cancel_reason text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS cheques_acc_idx ON treasury.cheques(account_id);

GRANT SELECT, INSERT, UPDATE ON treasury.current_accounts TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.account_entries TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.cheques TO paositra_app;
