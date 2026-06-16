import { randomUUID } from "node:crypto";
import pg from "pg";

const ownerUrl = process.env.PAOSITRA_TEST_OWNER_DATABASE_URL;
const appUrl = process.env.PAOSITRA_TEST_APP_DATABASE_URL;
const integrationDescribe = ownerUrl && appUrl ? describe : describe.skip;

integrationDescribe("PostgreSQL security integration", () => {
  let owner: pg.Client;
  let app: pg.Client;

  beforeAll(async () => {
    owner = new pg.Client({ connectionString: ownerUrl });
    app = new pg.Client({ connectionString: appUrl });
    await owner.connect();
    await app.connect();
  });

  afterAll(async () => {
    await app.end();
    await owner.end();
  });

  it("applies all versioned migrations", async () => {
    const result = await owner.query(
      "SELECT name FROM platform.schema_migrations ORDER BY name"
    );
    expect(result.rows.map((row) => row.name)).toEqual([
      "0001_initial.sql",
      "0002_document_provisional_security_model.sql",
      "0003_secure_database_roles_and_audit.sql",
      "0004_idempotency_lifecycle.sql"
    ]);
  });

  it("allows the application role to write technical application records", async () => {
    const id = randomUUID();
    await expect(
      app.query(
        `INSERT INTO platform.login_attempts
          (id, email, succeeded, failure_reason)
         VALUES ($1, $2, false, $3)`,
        [id, "technical-test@example.invalid", "integration_test"]
      )
    ).resolves.toBeDefined();
  });

  it("allows append-only audit insertion", async () => {
    await expect(
      app.query(
        `INSERT INTO platform.audit_events
          (id, action, object_type, metadata)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [randomUUID(), "technical.integration", "technical.test", "{}"]
      )
    ).resolves.toBeDefined();
  });

  it.each([
    ["UPDATE", "UPDATE platform.audit_events SET action = 'changed'"],
    ["DELETE", "DELETE FROM platform.audit_events"],
    ["TRUNCATE", "TRUNCATE platform.audit_events"],
    [
      "DISABLE TRIGGER",
      "ALTER TABLE platform.audit_events DISABLE TRIGGER audit_events_no_update"
    ],
    ["DROP TABLE", "DROP TABLE platform.audit_events"]
  ])("rejects %s on the audit table for the application role", async (_label: string, sql: string) => {
    await expect(app.query(sql)).rejects.toMatchObject({
      code: expect.stringMatching(/^(42501|P0001)$/)
    });
  });

  it("contains no automatically assigned user permission", async () => {
    const result = await owner.query(
      "SELECT count(*)::integer AS count FROM platform.user_permissions"
    );
    expect(result.rows[0].count).toBe(0);
  });
});
