DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'paositra_app') THEN
    RAISE EXCEPTION
      'Required role paositra_app is missing; create it through controlled infrastructure initialization';
  END IF;
END;
$$;

REVOKE ALL ON SCHEMA platform, treasury, operations FROM PUBLIC;
REVOKE ALL ON SCHEMA platform, treasury, operations FROM paositra_app;
GRANT USAGE ON SCHEMA platform, treasury, operations TO paositra_app;

REVOKE ALL ON ALL TABLES IN SCHEMA platform, treasury, operations FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA platform, treasury, operations FROM paositra_app;

GRANT SELECT, INSERT, UPDATE ON
  platform.users,
  platform.sessions,
  platform.login_attempts,
  platform.attachments,
  treasury.institutions,
  treasury.placements,
  treasury.placement_history,
  operations.agencies
TO paositra_app;

GRANT SELECT ON
  platform.permissions,
  platform.user_permissions
TO paositra_app;

GRANT INSERT ON platform.user_permissions TO paositra_app;
GRANT SELECT, INSERT ON platform.audit_events, platform.export_events TO paositra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.idempotency_keys TO paositra_app;

REVOKE UPDATE, DELETE, TRUNCATE ON platform.audit_events FROM paositra_app;
REVOKE EXECUTE ON FUNCTION platform.prevent_audit_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION platform.prevent_audit_mutation() FROM paositra_app;

DROP TRIGGER IF EXISTS audit_events_no_truncate ON platform.audit_events;
CREATE TRIGGER audit_events_no_truncate
BEFORE TRUNCATE ON platform.audit_events
FOR EACH STATEMENT EXECUTE FUNCTION platform.prevent_audit_mutation();

ALTER DEFAULT PRIVILEGES IN SCHEMA platform, treasury, operations
  REVOKE ALL ON TABLES FROM PUBLIC;

COMMENT ON TRIGGER audit_events_no_truncate ON platform.audit_events IS
  'Protection complémentaire contre TRUNCATE; le rôle applicatif ne possède par ailleurs aucun privilège TRUNCATE ni droit de propriété.';
