-- 0017 — Note de justification caissier à la clôture. Additive.
ALTER TABLE operations.cash_sessions ADD COLUMN IF NOT EXISTS cashier_note text;
