-- 0011 — Accorde la lecture des tables catalogue RBAC au rôle applicatif.
-- Corrige un défaut latent : l'endpoint /platform/roles échouait (permission denied).
GRANT SELECT ON platform.rbac_role_templates TO paositra_app;
GRANT SELECT ON platform.rbac_role_permissions TO paositra_app;
GRANT SELECT ON platform.public_holidays TO paositra_app;
