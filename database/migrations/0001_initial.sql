CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS treasury;
CREATE SCHEMA IF NOT EXISTS operations;

CREATE TABLE platform.users (
  id uuid PRIMARY KEY,
  email varchar(320) NOT NULL,
  display_name varchar(200) NOT NULL,
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  blocked_until timestamptz,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email) <> ''),
  CONSTRAINT users_display_name_not_blank CHECK (btrim(display_name) <> '')
);
CREATE UNIQUE INDEX users_email_unique ON platform.users (lower(email));

CREATE TABLE platform.permissions (
  code varchar(160) PRIMARY KEY,
  description text NOT NULL
);

CREATE TABLE platform.user_permissions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES platform.users(id),
  permission_code varchar(160) NOT NULL REFERENCES platform.permissions(code),
  scope_type varchar(30) NOT NULL DEFAULT 'global',
  scope_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES platform.users(id),
  CONSTRAINT permission_scope_valid CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR (scope_type IN ('organ', 'direction', 'agency', 'counter') AND scope_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX user_permissions_global_unique
  ON platform.user_permissions(user_id, permission_code)
  WHERE scope_type = 'global';
CREATE UNIQUE INDEX user_permissions_scoped_unique
  ON platform.user_permissions(user_id, permission_code, scope_type, scope_id)
  WHERE scope_type <> 'global';
CREATE INDEX user_permissions_lookup
  ON platform.user_permissions(user_id, permission_code, scope_type, scope_id);

CREATE TABLE platform.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  second_factor_verified boolean NOT NULL DEFAULT false
);
CREATE INDEX sessions_active_user ON platform.sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE platform.login_attempts (
  id uuid PRIMARY KEY,
  email varchar(320) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  succeeded boolean NOT NULL,
  ip_address inet,
  user_agent text,
  failure_reason varchar(80)
);
CREATE INDEX login_attempts_report ON platform.login_attempts(occurred_at DESC, succeeded);

CREATE TABLE platform.audit_events (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES platform.users(id),
  session_id uuid REFERENCES platform.sessions(id),
  action varchar(160) NOT NULL,
  object_type varchar(160) NOT NULL,
  object_id uuid,
  ip_address inet,
  user_agent text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_events_object ON platform.audit_events(object_type, object_id, occurred_at DESC);
CREATE INDEX audit_events_actor ON platform.audit_events(actor_user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION platform.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable';
END;
$$;

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE OR DELETE ON platform.audit_events
FOR EACH ROW EXECUTE FUNCTION platform.prevent_audit_mutation();

CREATE TABLE platform.idempotency_keys (
  actor_user_id uuid NOT NULL REFERENCES platform.users(id),
  route varchar(300) NOT NULL,
  idempotency_key varchar(200) NOT NULL,
  request_hash char(64) NOT NULL,
  state varchar(20) NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(actor_user_id, route, idempotency_key),
  CONSTRAINT idempotency_state_valid CHECK (state IN ('processing', 'completed'))
);
CREATE INDEX idempotency_expiry ON platform.idempotency_keys(expires_at);

CREATE TABLE platform.export_events (
  id uuid PRIMARY KEY,
  actor_user_id uuid NOT NULL REFERENCES platform.users(id),
  module varchar(80) NOT NULL,
  format varchar(20) NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  exported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.attachments (
  id uuid PRIMARY KEY,
  object_type varchar(160) NOT NULL,
  object_id uuid NOT NULL,
  original_name varchar(500) NOT NULL,
  storage_key varchar(500) NOT NULL UNIQUE,
  media_type varchar(160) NOT NULL,
  size_bytes bigint NOT NULL,
  sha256 char(64) NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES platform.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT attachment_size_positive CHECK (size_bytes > 0)
);
CREATE INDEX attachments_object ON platform.attachments(object_type, object_id)
  WHERE archived_at IS NULL;

CREATE TABLE treasury.institutions (
  id uuid PRIMARY KEY,
  name varchar(240) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT institution_name_not_blank CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX institutions_active_name
  ON treasury.institutions(lower(name)) WHERE archived_at IS NULL;

CREATE TABLE treasury.placements (
  id uuid PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES treasury.institutions(id),
  principal_amount numeric(20,2) NOT NULL,
  currency varchar(3) NOT NULL,
  annual_interest_rate numeric(9,6) NOT NULL,
  duration_days integer NOT NULL,
  deposit_mode varchar(120) NOT NULL,
  interest_calculation_mode varchar(160) NOT NULL,
  start_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'open',
  cancellation_reason text,
  cancelled_at timestamptz,
  closed_at timestamptz,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT placement_amount_positive CHECK (principal_amount > 0),
  CONSTRAINT placement_rate_nonnegative CHECK (annual_interest_rate >= 0),
  CONSTRAINT placement_duration_positive CHECK (duration_days > 0),
  CONSTRAINT placement_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT placement_status_valid CHECK (status IN ('open', 'cancelled', 'closed'))
);
CREATE INDEX placements_due_date
  ON treasury.placements((start_date + duration_days), status);
CREATE INDEX placements_institution ON treasury.placements(institution_id, status);

CREATE TABLE treasury.placement_history (
  id uuid PRIMARY KEY,
  placement_id uuid NOT NULL REFERENCES treasury.placements(id),
  action varchar(40) NOT NULL,
  reason text,
  actor_user_id uuid NOT NULL REFERENCES platform.users(id),
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX placement_history_lookup
  ON treasury.placement_history(placement_id, occurred_at DESC);

CREATE TABLE operations.agencies (
  id uuid PRIMARY KEY,
  code varchar(80) NOT NULL,
  name varchar(240) NOT NULL,
  zone varchar(160),
  parent_organ varchar(240),
  cash_max_amount numeric(20,2),
  postal_value_max_amount numeric(20,2),
  foreign_currency_max_amount numeric(20,2),
  manager_management_start_date date,
  status varchar(20) NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closure_reason text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  CONSTRAINT agency_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT agency_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT agency_status_valid CHECK (status IN ('open', 'closed')),
  CONSTRAINT agency_cash_max_nonnegative CHECK (cash_max_amount IS NULL OR cash_max_amount >= 0),
  CONSTRAINT agency_vp_max_nonnegative CHECK (postal_value_max_amount IS NULL OR postal_value_max_amount >= 0),
  CONSTRAINT agency_me_max_nonnegative CHECK (foreign_currency_max_amount IS NULL OR foreign_currency_max_amount >= 0)
);
CREATE UNIQUE INDEX agencies_code_unique ON operations.agencies(lower(code));
CREATE INDEX agencies_status_zone ON operations.agencies(status, zone);

INSERT INTO platform.permissions(code, description) VALUES
  ('platform:users:manage', 'Créer les utilisateurs et attribuer les habilitations'),
  ('platform:audit:read', 'Consulter la piste d''audit'),
  ('treasury:institutions:read', 'Consulter les institutions financières'),
  ('treasury:institutions:write', 'Créer et modifier les institutions financières'),
  ('treasury:placements:read', 'Consulter les placements'),
  ('treasury:placements:write', 'Créer et modifier les placements'),
  ('treasury:placements:cancel', 'Annuler un placement avec motif'),
  ('treasury:placements:close', 'Clôturer un placement'),
  ('operations:agencies:read', 'Consulter les agences'),
  ('operations:agencies:write', 'Créer et modifier les agences'),
  ('operations:agencies:close', 'Fermer une agence avec motif')
ON CONFLICT (code) DO NOTHING;
