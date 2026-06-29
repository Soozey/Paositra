CREATE SCHEMA IF NOT EXISTS accounting;

CREATE TABLE accounting.accounting_references (
  id uuid PRIMARY KEY,
  code varchar(80) NOT NULL UNIQUE,
  label varchar(240) NOT NULL,
  source text NOT NULL,
  version varchar(80),
  status varchar(20) NOT NULL DEFAULT 'proposed',
  validated_by uuid REFERENCES platform.users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_references_status_check
    CHECK (status IN ('proposed', 'validated', 'deprecated')),
  CONSTRAINT accounting_references_validation_check
    CHECK (
      (status = 'validated' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
      OR (status <> 'validated' AND validated_at IS NULL)
    )
);

CREATE TABLE accounting.chart_of_accounts (
  id uuid PRIMARY KEY,
  reference_id uuid NOT NULL REFERENCES accounting.accounting_references(id),
  account_code varchar(80) NOT NULL,
  account_label varchar(300) NOT NULL,
  account_class varchar(20),
  parent_account_code varchar(80),
  is_postable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  status varchar(20) NOT NULL DEFAULT 'proposed',
  source_document text,
  validation_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chart_of_accounts_status_check
    CHECK (status IN ('proposed', 'validated', 'inactive')),
  CONSTRAINT chart_of_accounts_unique_code_per_reference
    UNIQUE (reference_id, account_code)
);

CREATE INDEX chart_of_accounts_reference_lookup
  ON accounting.chart_of_accounts(reference_id, account_code);

CREATE TABLE accounting.accounting_journals (
  id uuid PRIMARY KEY,
  code varchar(80) NOT NULL UNIQUE,
  label varchar(240) NOT NULL,
  lot varchar(20) NOT NULL,
  module varchar(120) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'proposed',
  source text NOT NULL DEFAULT 'KCI_PROPOSAL',
  validation_note text,
  validated_by uuid REFERENCES platform.users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_journals_lot_check
    CHECK (lot IN ('common', 'lot1', 'lot2')),
  CONSTRAINT accounting_journals_status_check
    CHECK (status IN ('proposed', 'validated', 'disabled')),
  CONSTRAINT accounting_journals_validation_check
    CHECK (
      (status = 'validated' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
      OR (status <> 'validated' AND validated_at IS NULL)
    )
);

CREATE TABLE accounting.accounting_rule_templates (
  id uuid PRIMARY KEY,
  operation_type varchar(120) NOT NULL,
  lot varchar(20) NOT NULL,
  module varchar(120) NOT NULL,
  debit_account_template text NOT NULL,
  credit_account_template text NOT NULL,
  amount_source varchar(160) NOT NULL,
  required_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  rule_status varchar(20) NOT NULL DEFAULT 'proposed',
  source varchar(40) NOT NULL,
  validation_required boolean NOT NULL DEFAULT true,
  validation_note text,
  validated_by uuid REFERENCES platform.users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_rule_templates_lot_check
    CHECK (lot IN ('common', 'lot1', 'lot2')),
  CONSTRAINT accounting_rule_templates_status_check
    CHECK (rule_status IN ('proposed', 'validated', 'disabled')),
  CONSTRAINT accounting_rule_templates_source_check
    CHECK (source IN ('DAO', 'PCOP_2006', 'PAOMA_INTERNAL', 'KCI_PROPOSAL')),
  CONSTRAINT accounting_rule_templates_validation_check
    CHECK (
      (rule_status = 'validated' AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
      OR (rule_status <> 'validated' AND validated_at IS NULL)
    )
);

CREATE INDEX accounting_rule_templates_lookup
  ON accounting.accounting_rule_templates(lot, module, operation_type, rule_status);

CREATE TABLE accounting.accounting_periods (
  id uuid PRIMARY KEY,
  year integer NOT NULL,
  period integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open',
  locked_by uuid REFERENCES platform.users(id),
  locked_at timestamptz,
  closed_by uuid REFERENCES platform.users(id),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_periods_period_check CHECK (period BETWEEN 1 AND 12),
  CONSTRAINT accounting_periods_date_check CHECK (start_date <= end_date),
  CONSTRAINT accounting_periods_status_check CHECK (status IN ('open', 'locked', 'closed')),
  CONSTRAINT accounting_periods_unique_period UNIQUE (year, period)
);

CREATE TABLE accounting.accounting_entries (
  id uuid PRIMARY KEY,
  transaction_id varchar(160) NOT NULL UNIQUE,
  journal_id uuid NOT NULL REFERENCES accounting.accounting_journals(id),
  rule_template_id uuid REFERENCES accounting.accounting_rule_templates(id),
  period_id uuid REFERENCES accounting.accounting_periods(id),
  entry_date date NOT NULL,
  accounting_date date NOT NULL,
  description text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES platform.users(id),
  submitted_by uuid REFERENCES platform.users(id),
  verified_by uuid REFERENCES platform.users(id),
  posted_by uuid REFERENCES platform.users(id),
  reversed_by uuid REFERENCES platform.users(id),
  reversal_of_entry_id uuid REFERENCES accounting.accounting_entries(id),
  source_module varchar(120) NOT NULL,
  source_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  verified_at timestamptz,
  posted_at timestamptz,
  reversed_at timestamptz,
  CONSTRAINT accounting_entries_status_check
    CHECK (status IN ('draft', 'submitted', 'verified', 'posted', 'reversed', 'rejected')),
  CONSTRAINT accounting_entries_posted_actor_check
    CHECK (status <> 'posted' OR (verified_by IS NOT NULL AND posted_by IS NOT NULL AND posted_at IS NOT NULL))
);

CREATE INDEX accounting_entries_journal_lookup
  ON accounting.accounting_entries(journal_id, accounting_date);

CREATE INDEX accounting_entries_source_lookup
  ON accounting.accounting_entries(source_module, source_record_id);

CREATE TABLE accounting.accounting_entry_lines (
  entry_id uuid NOT NULL REFERENCES accounting.accounting_entries(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  account_id uuid NOT NULL REFERENCES accounting.chart_of_accounts(id),
  debit_amount numeric(20, 2) NOT NULL DEFAULT 0,
  credit_amount numeric(20, 2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL,
  entity_scope varchar(80) NOT NULL DEFAULT 'global',
  agency_id uuid REFERENCES operations.agencies(id),
  counter_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, line_no),
  CONSTRAINT accounting_entry_lines_positive_amounts
    CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CONSTRAINT accounting_entry_lines_one_side_check
    CHECK (
      (debit_amount > 0 AND credit_amount = 0)
      OR (credit_amount > 0 AND debit_amount = 0)
    )
);

CREATE FUNCTION accounting.reject_posted_entry_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'posted accounting entries cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'posted accounting entries cannot be modified';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER accounting_entries_no_posted_change
BEFORE UPDATE OR DELETE ON accounting.accounting_entries
FOR EACH ROW
EXECUTE FUNCTION accounting.reject_posted_entry_changes();

CREATE FUNCTION accounting.validate_entry_before_posting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  debit_total numeric(20, 2);
  credit_total numeric(20, 2);
  invalid_accounts integer;
  rule_state varchar(20);
  period_state varchar(20);
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  SELECT rule_status INTO rule_state
  FROM accounting.accounting_rule_templates
  WHERE id = NEW.rule_template_id;

  IF rule_state IS DISTINCT FROM 'validated' THEN
    RAISE EXCEPTION 'validated accounting rule template is required before posting';
  END IF;

  SELECT status INTO period_state
  FROM accounting.accounting_periods
  WHERE id = NEW.period_id;

  IF period_state IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'accounting period must be open before posting';
  END IF;

  SELECT
    COALESCE(sum(debit_amount), 0),
    COALESCE(sum(credit_amount), 0),
    count(*) FILTER (WHERE coa.is_active = false OR coa.status <> 'validated' OR coa.is_postable = false)
  INTO debit_total, credit_total, invalid_accounts
  FROM accounting.accounting_entry_lines line
  JOIN accounting.chart_of_accounts coa ON coa.id = line.account_id
  WHERE line.entry_id = NEW.id;

  IF debit_total <= 0 OR credit_total <= 0 OR debit_total <> credit_total THEN
    RAISE EXCEPTION 'accounting entry must balance debit and credit before posting';
  END IF;

  IF invalid_accounts > 0 THEN
    RAISE EXCEPTION 'posting requires active validated postable accounts';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER accounting_entries_validate_posting
BEFORE INSERT OR UPDATE OF status ON accounting.accounting_entries
FOR EACH ROW
EXECUTE FUNCTION accounting.validate_entry_before_posting();

CREATE FUNCTION accounting.reject_posted_entry_line_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status varchar(20);
  checked_entry_id uuid;
BEGIN
  checked_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);

  SELECT status INTO parent_status
  FROM accounting.accounting_entries
  WHERE id = checked_entry_id;

  IF parent_status = 'posted' THEN
    RAISE EXCEPTION 'posted accounting entry lines cannot be modified';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER accounting_entry_lines_no_posted_change
BEFORE INSERT OR UPDATE OR DELETE ON accounting.accounting_entry_lines
FOR EACH ROW
EXECUTE FUNCTION accounting.reject_posted_entry_line_changes();

REVOKE ALL ON SCHEMA accounting FROM PUBLIC;
GRANT USAGE ON SCHEMA accounting TO paositra_app;

GRANT SELECT, INSERT, UPDATE ON
  accounting.accounting_references,
  accounting.chart_of_accounts,
  accounting.accounting_journals,
  accounting.accounting_rule_templates,
  accounting.accounting_entries,
  accounting.accounting_entry_lines,
  accounting.accounting_periods
TO paositra_app;

GRANT DELETE ON
  accounting.accounting_entry_lines
TO paositra_app;

COMMENT ON SCHEMA accounting IS
  'Cadrage comptable configurable. Le PCOP 2006 est une hypothese a valider par PAOMA, aucun compte ni schema d ecriture definitif n est fige.';

COMMENT ON TABLE accounting.accounting_rule_templates IS
  'Modeles de regles comptables. Une regle proposed ne peut pas poster d ecriture reelle.';

COMMENT ON TABLE accounting.accounting_entries IS
  'Ecritures comptables. Une ecriture posted est immuable et doit etre corrigee par contrepassation ou regularisation.';
