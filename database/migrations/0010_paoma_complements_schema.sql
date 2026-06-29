-- 0010 — Schéma pour compléments provisoires PAOMA (AUCUNE donnée métier ici).
-- Les données (postes, rôles, permissions, jours fériés) sont chargées par SEED démo.

-- a) Province historique sur les agences/postes
ALTER TABLE operations.agencies
  ADD COLUMN IF NOT EXISTS historical_province varchar(80);

-- b) Élargir le périmètre RBAC pour inclure 'region'
ALTER TABLE platform.rbac_role_templates
  DROP CONSTRAINT IF EXISTS rbac_role_scope_valid;
ALTER TABLE platform.rbac_role_templates
  ADD CONSTRAINT rbac_role_scope_valid
  CHECK (scope_type IN ('global','organ','direction','agency','counter','region'));

-- c) Jours fériés (référentiel configurable)
CREATE TABLE IF NOT EXISTS platform.public_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  label varchar(160) NOT NULL,
  type varchar(30) NOT NULL DEFAULT 'national' CHECK (type IN ('national','paoma_specific')),
  status varchar(20) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','validated')),
  source_note text,
  UNIQUE (holiday_date, label)
);
GRANT SELECT, INSERT, UPDATE ON platform.public_holidays TO paositra_app;
