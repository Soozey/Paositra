-- 0008 — Cycle de vie des placements : renouvellement et rapatriement.
-- Additive : élargit les statuts autorisés et ajoute des colonnes de traçabilité.

ALTER TABLE treasury.placements
  ADD COLUMN IF NOT EXISTS renewed_from_id uuid REFERENCES treasury.placements(id),
  ADD COLUMN IF NOT EXISTS repatriated_at timestamptz,
  ADD COLUMN IF NOT EXISTS repatriation_amount numeric(20,2);

ALTER TABLE treasury.placements
  DROP CONSTRAINT IF EXISTS placement_status_valid;
ALTER TABLE treasury.placements
  ADD CONSTRAINT placement_status_valid
  CHECK (status IN ('open', 'cancelled', 'closed', 'renewed', 'repatriated'));

-- Les colonnes ajoutées héritent des privilèges de table déjà accordés à paositra_app.
