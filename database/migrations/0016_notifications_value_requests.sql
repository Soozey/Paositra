-- 0016 — Notifications + opérations inter-agences (demande de valeurs G59/G60). Additive.
CREATE TABLE IF NOT EXISTS platform.notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES platform.users(id),
  type varchar(60) NOT NULL,
  message varchar(400) NOT NULL,
  object_type varchar(120),
  object_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON platform.notifications(user_id);

CREATE TABLE IF NOT EXISTS operations.value_requests (
  id uuid PRIMARY KEY,
  reference varchar(40) NOT NULL UNIQUE,
  from_agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  to_agency_id uuid NOT NULL REFERENCES operations.agencies(id),
  value_type varchar(10) NOT NULL CHECK (value_type IN ('G59','G60')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  status varchar(15) NOT NULL DEFAULT 'demande' CHECK (status IN ('demande','notifiee','traitee','rejetee')),
  comment text,
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

GRANT SELECT, INSERT, UPDATE ON platform.notifications TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON operations.value_requests TO paositra_app;
