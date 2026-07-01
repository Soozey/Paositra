import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
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
    const expected = readdirSync(resolve(process.cwd(), "../../database/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    expect(result.rows.map((row) => row.name)).toEqual(expected);
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

  it("does not seed business data through migrations", async () => {
    const result = await owner.query(`
      SELECT
        (SELECT count(*)::integer FROM treasury.institutions) AS institutions,
        (SELECT count(*)::integer FROM treasury.placements) AS placements,
        (SELECT count(*)::integer FROM operations.agencies) AS agencies,
        (SELECT count(*)::integer FROM accounting.accounting_references) AS accounting_references,
        (SELECT count(*)::integer FROM accounting.chart_of_accounts) AS chart_accounts,
        (SELECT count(*)::integer FROM accounting.accounting_journals) AS accounting_journals
    `);

    expect(result.rows[0]).toEqual({
      institutions: 0,
      placements: 0,
      agencies: 0,
      accounting_references: 0,
      chart_accounts: 0,
      accounting_journals: 0
    });
  });

  it("allocates transaction reference sequences atomically without reuse", async () => {
    const scope = `L1-PLC-OUV-${randomUUID()}`;
    const first = await app.query(
      "SELECT platform.next_transaction_sequence($1) AS sequence",
      [scope]
    );
    const second = await app.query(
      "SELECT platform.next_transaction_sequence($1) AS sequence",
      [scope]
    );

    expect(Number(first.rows[0].sequence)).toBe(1);
    expect(Number(second.rows[0].sequence)).toBe(2);
  });

  it("rejects posting an accounting entry from a proposed rule", async () => {
    const actorId = randomUUID();
    const referenceId = randomUUID();
    const accountDebitId = randomUUID();
    const accountCreditId = randomUUID();
    const journalId = randomUUID();
    const ruleId = randomUUID();
    const periodId = randomUUID();
    const entryId = randomUUID();

    await owner.query(
      `INSERT INTO platform.users(id, email, display_name, is_active)
       VALUES ($1, $2, $3, true)`,
      [actorId, `accounting-${actorId}@example.invalid`, "Accounting test user"]
    );

    await app.query(
      `INSERT INTO accounting.accounting_references
        (id, code, label, source, version, status, validated_by, validated_at)
       VALUES ($1, $2, 'PCOP test reference', 'PCOP 2006 test fixture', '2006', 'validated', $3, now())`,
      [referenceId, `PCOP_TEST_${referenceId}`, actorId]
    );
    await app.query(
      `INSERT INTO accounting.chart_of_accounts
        (id, reference_id, account_code, account_label, account_class, is_postable, status)
       VALUES
        ($1, $3, '511TEST', 'Compte debit test', '5', true, 'validated'),
        ($2, $3, '701TEST', 'Compte credit test', '7', true, 'validated')`,
      [accountDebitId, accountCreditId, referenceId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_journals(id, code, label, lot, module, status)
       VALUES ($1, $2, 'Journal test propose', 'lot1', 'placements', 'proposed')`,
      [journalId, `JRN_${journalId}`]
    );
    await app.query(
      `INSERT INTO accounting.accounting_rule_templates
        (id, operation_type, lot, module, debit_account_template, credit_account_template, amount_source, rule_status, source)
       VALUES ($1, 'placement.opening', 'lot1', 'placements', '511TEST', '701TEST', 'principal_amount', 'proposed', 'PCOP_2006')`,
      [ruleId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_periods(id, year, period, start_date, end_date, status)
       VALUES ($1, 2026, 1, '2026-01-01', '2026-01-31', 'open')`,
      [periodId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_entries
        (id, transaction_id, journal_id, rule_template_id, period_id, entry_date, accounting_date,
         description, status, created_by, verified_by, posted_by, posted_at, source_module)
       VALUES ($1, $2, $3, $4, $5, '2026-01-15', '2026-01-15',
        'Entry from proposed rule', 'draft', $6, $6, $6, now(), 'treasury.placements')`,
      [entryId, `L1-PLC-TEST-${entryId}`, journalId, ruleId, periodId, actorId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_entry_lines
        (entry_id, line_no, account_id, debit_amount, credit_amount, currency)
       VALUES
        ($1, 1, $2, 100.00, 0, 'MGA'),
        ($1, 2, $3, 0, 100.00, 'MGA')`,
      [entryId, accountDebitId, accountCreditId]
    );

    await expect(
      app.query("UPDATE accounting.accounting_entries SET status = 'posted' WHERE id = $1", [
        entryId
      ])
    ).rejects.toMatchObject({ code: "P0001" });
  });

  it("rejects modification and deletion of posted accounting entries", async () => {
    const actorId = randomUUID();
    const referenceId = randomUUID();
    const accountDebitId = randomUUID();
    const accountCreditId = randomUUID();
    const journalId = randomUUID();
    const ruleId = randomUUID();
    const periodId = randomUUID();
    const entryId = randomUUID();

    await owner.query(
      `INSERT INTO platform.users(id, email, display_name, is_active)
       VALUES ($1, $2, $3, true)`,
      [actorId, `posted-accounting-${actorId}@example.invalid`, "Posted accounting test user"]
    );

    await app.query(
      `INSERT INTO accounting.accounting_references
        (id, code, label, source, version, status, validated_by, validated_at)
       VALUES ($1, $2, 'Validated PCOP test reference', 'PCOP 2006 test fixture', '2006', 'validated', $3, now())`,
      [referenceId, `PCOP_POSTED_${referenceId}`, actorId]
    );
    await app.query(
      `INSERT INTO accounting.chart_of_accounts
        (id, reference_id, account_code, account_label, account_class, is_postable, status)
       VALUES
        ($1, $3, '531TEST', 'Caisse debit test', '5', true, 'validated'),
        ($2, $3, '463TEST', 'Tiers credit test', '4', true, 'validated')`,
      [accountDebitId, accountCreditId, referenceId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_journals
        (id, code, label, lot, module, status, validated_by, validated_at)
       VALUES ($1, $2, 'Journal test valide', 'lot2', 'caisse', 'validated', $3, now())`,
      [journalId, `JRN_POSTED_${journalId}`, actorId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_rule_templates
        (id, operation_type, lot, module, debit_account_template, credit_account_template,
         amount_source, rule_status, source, validated_by, validated_at)
       VALUES ($1, 'cash.receipt', 'lot2', 'caisse', '531TEST', '463TEST',
        'receipt_amount', 'validated', 'PAOMA_INTERNAL', $2, now())`,
      [ruleId, actorId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_periods(id, year, period, start_date, end_date, status)
       VALUES ($1, 2026, 2, '2026-02-01', '2026-02-28', 'open')`,
      [periodId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_entries
        (id, transaction_id, journal_id, rule_template_id, period_id, entry_date, accounting_date,
         description, status, created_by, verified_by, posted_by, posted_at, source_module)
       VALUES ($1, $2, $3, $4, $5, '2026-02-15', '2026-02-15',
        'Posted entry test', 'draft', $6, $6, $6, now(), 'operations.cash')`,
      [entryId, `L2-CAI-TEST-${entryId}`, journalId, ruleId, periodId, actorId]
    );
    await app.query(
      `INSERT INTO accounting.accounting_entry_lines
        (entry_id, line_no, account_id, debit_amount, credit_amount, currency)
       VALUES
        ($1, 1, $2, 250.00, 0, 'MGA'),
        ($1, 2, $3, 0, 250.00, 'MGA')`,
      [entryId, accountDebitId, accountCreditId]
    );
    await app.query("UPDATE accounting.accounting_entries SET status = 'posted' WHERE id = $1", [
      entryId
    ]);

    await expect(
      app.query("UPDATE accounting.accounting_entries SET description = 'changed' WHERE id = $1", [
        entryId
      ])
    ).rejects.toMatchObject({ code: "P0001" });
    await expect(
      app.query("DELETE FROM accounting.accounting_entries WHERE id = $1", [entryId])
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(42501|P0001)$/) });
    await expect(
      app.query(
        "UPDATE accounting.accounting_entry_lines SET debit_amount = 251.00 WHERE entry_id = $1 AND line_no = 1",
        [entryId]
      )
    ).rejects.toMatchObject({ code: "P0001" });
  });
});
