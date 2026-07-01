-- 0013 — Budget & exécution ELO-P. Additive.
CREATE TABLE IF NOT EXISTS treasury.budget_exercises (
  id uuid PRIMARY KEY,
  year integer NOT NULL,
  label varchar(160) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','cloture')),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS treasury.budget_lines (
  id uuid PRIMARY KEY,
  exercise_id uuid NOT NULL REFERENCES treasury.budget_exercises(id),
  direction varchar(160) NOT NULL,
  program varchar(160) NOT NULL,
  account_code varchar(40) NOT NULL,
  label varchar(240) NOT NULL,
  allocated_amount numeric(20,2) NOT NULL CHECK (allocated_amount >= 0),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS budget_lines_ex_idx ON treasury.budget_lines(exercise_id);
CREATE TABLE IF NOT EXISTS treasury.engagements (
  id uuid PRIMARY KEY,
  reference varchar(40) NOT NULL UNIQUE,
  exercise_id uuid NOT NULL REFERENCES treasury.budget_exercises(id),
  line_id uuid NOT NULL REFERENCES treasury.budget_lines(id),
  object text NOT NULL,
  market_type varchar(60) NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  status varchar(20) NOT NULL DEFAULT 'brouillon'
    CHECK (status IN ('brouillon','soumis','en_verification','valide','rejete','paye','archive')),
  created_by uuid NOT NULL REFERENCES platform.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS engagements_line_idx ON treasury.engagements(line_id);
CREATE TABLE IF NOT EXISTS treasury.engagement_events (
  id uuid PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES treasury.engagements(id),
  action varchar(40) NOT NULL,
  comment text,
  actor_user_id uuid REFERENCES platform.users(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON treasury.budget_exercises TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.budget_lines TO paositra_app;
GRANT SELECT, INSERT, UPDATE ON treasury.engagements TO paositra_app;
GRANT SELECT, INSERT ON treasury.engagement_events TO paositra_app;
INSERT INTO platform.permissions(code, description) VALUES
  ('treasury:budget:read', 'Consulter budget et engagements'),
  ('treasury:budget:manage', 'Créer lignes/exercices et gérer les dossiers d''engagement'),
  ('treasury:budget:validate', 'Valider ou rejeter les dossiers d''engagement')
ON CONFLICT (code) DO NOTHING;
