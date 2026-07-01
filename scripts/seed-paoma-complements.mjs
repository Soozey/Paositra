// Seed DÉMO — compléments provisoires PAOMA (postes, rôles, permissions, jours fériés).
// NON CONTRACTUEL. Idempotent. Rôle propriétaire requis (MIGRATION_DATABASE_URL).
import pg from "pg";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL requis");
const base = "data/reference/paoma/";
const client = new pg.Client({ connectionString: url });

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = lines.shift().split(",");
  return lines.map((l) => {
    const cols = l.split(",");
    const o = {};
    head.forEach((h, i) => (o[h] = cols[i]));
    return o;
  });
}

const postes = parseCsv(readFileSync(base + "paoma_postes_demo.csv", "utf8"));
const input = JSON.parse(readFileSync(base + "_seed_input.json", "utf8"));

await client.connect();
try {
  await client.query("BEGIN");
  const adminRow = await client.query(
    "SELECT id FROM platform.users WHERE email='demo.admin@paositra-demo.mg' UNION ALL SELECT id FROM platform.users ORDER BY 1 LIMIT 1"
  );
  if (!adminRow.rowCount) throw new Error("Aucun utilisateur — lancez d'abord scripts/seed-demo.mjs");
  const createdBy = adminRow.rows[0].id;

  // 1) POSTES → operations.agencies (codes TMP, demo)
  await client.query("DELETE FROM operations.agencies WHERE code LIKE 'TMP-%'");
  for (const p of postes) {
    await client.query(
      `INSERT INTO operations.agencies
        (id,code,temporary_code,name,type,region,historical_province,city,commune,
         status,created_by,source_type,source_name,source_note,validation_status)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$7,'open',$8,$9,'Soozey SARL — complément démo PAOMA (NON CONTRACTUEL)',$10,'to_validate')`,
      [randomUUID(), p.code_provisoire, p.nom_poste, p.type_poste, p.region,
       p.province_historique, p.ville_commune, createdBy, p.source_type, p.source_note]
    );
  }

  // 2) PERMISSIONS (catalogue dot-notation, proposition)
  for (const [code] of input.permissions) {
    await client.query(
      "INSERT INTO platform.permissions(code,description) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING",
      [code, "Permission proposée (catalogue PAOMA) — NON CONTRACTUEL — À VALIDER PAOSITRA"]
    );
  }

  // 3) RÔLES (19) — tous proposition_a_valider ; lot commun→common
  const codes = input.roles.map((r) => r[0]);
  await client.query("DELETE FROM platform.rbac_role_permissions WHERE role_code = ANY($1)", [codes]);
  await client.query("DELETE FROM platform.rbac_role_templates WHERE code = ANY($1)", [codes]);
  for (const [code, label, lot, scope, desc] of input.roles) {
    await client.query(
      `INSERT INTO platform.rbac_role_templates(code,label,lot,scope_type,description,status)
       VALUES ($1,$2,$3,$4,$5,'proposition_a_valider')`,
      [code, label, lot, scope, desc + " — À VALIDER PAOMA"]
    );
  }

  // 4) MAPPING rôle → permission (minimal, prudent)
  let pairs = 0;
  for (const [role, perms] of Object.entries(input.mapping)) {
    for (const perm of perms) {
      await client.query(
        "INSERT INTO platform.rbac_role_permissions(role_code,permission_code) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [role, perm]
      );
      pairs++;
    }
  }

  // 5) JOURS FÉRIÉS nationaux (proposés)
  for (const [d, label, type] of input.holidays) {
    await client.query(
      `INSERT INTO platform.public_holidays(holiday_date,label,type,status,source_note)
       VALUES ($1,$2,$3,'proposed','Jours fériés nationaux Madagascar — À VALIDER/COMPLÉTER PAOMA')
       ON CONFLICT (holiday_date,label) DO NOTHING`,
      [d, label, type]
    );
  }

  await client.query("COMMIT");
  console.log(`SEED PAOMA OK: ${postes.length} postes, ${input.permissions.length} permissions, ${input.roles.length} rôles, ${pairs} liaisons, ${input.holidays.length} jours fériés.`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("SEED PAOMA ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
