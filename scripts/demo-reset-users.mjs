import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (process.env.DEMO_MODE !== "true") {
  throw new Error("Refus: lancez avec DEMO_MODE=true pour confirmer le mode demonstration local.");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Refus: demo:reset-users ne s'execute jamais avec NODE_ENV=production.");
}
if (!url) {
  throw new Error("MIGRATION_DATABASE_URL ou DATABASE_URL requis.");
}

const client = new pg.Client({ connectionString: url });

const ROLE_TEMPLATES = [
  ["DEMO_ADMIN_TECH", "Administrateur technique demo", "common", "global", "Proposition a valider - administration technique locale de demonstration"],
  ["DEMO_ADMIN_FONCTIONNEL", "Administrateur fonctionnel demo", "common", "global", "Proposition a valider - vue globale de demonstration"],
  ["DEMO_AUDITEUR", "Auditeur demo", "common", "global", "Proposition a valider - lecture audit et controle"],
  ["DEMO_CONSULTATION", "Consultation demo", "common", "global", "Proposition a valider - lecture seule direction"],
  ["DEMO_AGENT_TRESORERIE", "Agent tresorerie demo", "lot1", "organ", "Proposition a valider - saisie Lot 1 limitee"],
  ["DEMO_RESP_TRESORERIE", "Responsable tresorerie demo", "lot1", "direction", "Proposition a valider - pilotage Lot 1"],
  ["DEMO_COMPTABLE_TRESORERIE", "Comptable tresorerie demo", "lot1", "organ", "Proposition a valider - comptabilite Lot 1"],
  ["DEMO_VERIFICATEUR_TRESORERIE", "Verificateur tresorerie demo", "lot1", "organ", "Proposition a valider - controle Lot 1"],
  ["DEMO_DECIDEUR_TRESORERIE", "Decideur tresorerie demo", "lot1", "direction", "Proposition a valider - validation Lot 1"],
  ["DEMO_AGENT_GUICHET", "Agent guichet demo", "lot2", "counter", "Proposition a valider - guichet Lot 2"],
  ["DEMO_CAISSIER", "Caissier demo", "lot2", "counter", "Proposition a valider - caisse Lot 2"],
  ["DEMO_CHEF_AGENCE", "Chef agence demo", "lot2", "agency", "Proposition a valider - supervision agence Lot 2"],
  ["DEMO_VERIFICATEUR_OPERATIONS", "Verificateur operations demo", "lot2", "agency", "Proposition a valider - verification Lot 2"],
  ["DEMO_COMPTABLE_SIEGE", "Comptable siege demo", "lot2", "direction", "Proposition a valider - comptabilite siege Lot 2"],
  ["DEMO_SUPERVISEUR_OPERATIONS", "Superviseur operations demo", "lot2", "direction", "Proposition a valider - supervision Lot 2"]
];

const PERMISSIONS = {
  platformRead: ["platform:dashboard:read", "platform:roles:read"],
  platformAdmin: [
    "platform:users:manage",
    "platform:config:read",
    "platform:config:manage",
    "platform:audit:read",
    "platform:roles:read",
    "platform:roles:manage",
    "platform:dashboard:read",
    "platform:notifications:read",
    "platform:agencies:validate"
  ],
  audit: ["platform:audit:read", "platform:dashboard:read", "platform:roles:read"],
  treasuryRead: [
    "treasury:dashboard:read",
    "treasury:institutions:read",
    "treasury:placements:read",
    "treasury:placements:export",
    "treasury:accounts:read",
    "treasury:flows:read",
    "treasury:reports:read",
    "treasury:reports:export",
    "treasury:receivables:read",
    "treasury:receivables:export",
    "treasury:budget:read"
  ],
  treasuryManage: [
    "treasury:institutions:write",
    "treasury:institutions:validate",
    "treasury:institutions:export",
    "treasury:placements:write",
    "treasury:placements:approve",
    "treasury:placements:cancel",
    "treasury:placements:close",
    "treasury:accounts:manage",
    "treasury:flows:manage",
    "treasury:receivables:write",
    "treasury:budget:manage",
    "treasury:budget:validate"
  ],
  operationsRead: [
    "operations:dashboard:read",
    "operations:agencies:read",
    "operations:counters:read",
    "operations:financial:read",
    "operations:postal:read",
    "operations:parcels:read",
    "operations:transfers:read",
    "operations:reports:read",
    "operations:reports:export",
    "operations:verification:read",
    "platform:notifications:read"
  ],
  operationsManage: [
    "operations:agencies:write",
    "operations:agencies:validate",
    "operations:agencies:export",
    "operations:agencies:import",
    "operations:agencies:close",
    "operations:counters:manage",
    "operations:financial:manage",
    "operations:postal:manage",
    "operations:parcels:manage",
    "operations:transfers:manage",
    "operations:cash:open",
    "operations:cash:operate",
    "operations:cash:close",
    "operations:day:validate",
    "operations:verification:validate",
    "operations:fund:manage"
  ]
};

function unique(values) {
  return [...new Set(values)];
}

const LEGACY_TECHNICAL_EMAILS = [
  "presentation.local+20260625204913@paositra.invalid",
  "presentation.lot1+20260625214134@paositra.invalid",
  "presentation.lot2+20260625214134@paositra.invalid",
  "viewer.local@paositra.invalid"
];

const CASHIER_PERMISSIONS = [
  "operations:counters:read",
  "operations:counters:manage",
  "operations:cash:open",
  "operations:cash:operate",
  "operations:cash:close"
];
const CASHIER_SCOPED_PERMISSIONS = new Set(CASHIER_PERMISSIONS);

const USER_SPECS = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    email: "demo.admin@paositra-demo.mg",
    displayName: "[DEMO] Admin Systeme",
    role: "ADMIN_SYSTEME",
    usage: "Administration technique demo",
    permissions: unique([
      ...PERMISSIONS.platformAdmin,
      "operations:agencies:read",
      "operations:agencies:write",
      "operations:agencies:import",
      "operations:agencies:export",
      "operations:counters:read",
      "operations:counters:manage",
      "platform:notifications:read"
    ])
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    email: "demo.daf@paositra-demo.mg",
    displayName: "[DEMO] Directeur Financier",
    role: "DIRECTEUR_FINANCIER",
    usage: "Direction financiere lecture, validation et exports Lot 1",
    permissions: unique([
      "platform:dashboard:read",
      "platform:audit:read",
      ...PERMISSIONS.treasuryRead,
      "treasury:institutions:validate",
      "treasury:placements:approve",
      "treasury:budget:validate"
    ])
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    email: "demo.tresorier@paositra-demo.mg",
    displayName: "[DEMO] Tresorier Chef",
    role: "TRESORIER_CHEF",
    usage: "Pilotage operationnel Tresorerie",
    permissions: unique([...PERMISSIONS.treasuryRead, ...PERMISSIONS.treasuryManage])
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    email: "demo.comptable@paositra-demo.mg",
    displayName: "[DEMO] Comptable",
    role: "COMPTABLE",
    usage: "Comptabilite tresorerie et creances",
    permissions: unique([
      "treasury:dashboard:read",
      "treasury:institutions:read",
      "treasury:placements:read",
      "treasury:accounts:read",
      "treasury:accounts:manage",
      "treasury:flows:read",
      "treasury:flows:manage",
      "treasury:reports:read",
      "treasury:receivables:read",
      "treasury:receivables:write",
      "treasury:budget:read"
    ])
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    email: "demo.auditeur@paositra-demo.mg",
    displayName: "[DEMO] Auditeur Interne",
    role: "AUDITEUR_INTERNE",
    usage: "Audit lecture seule et exports",
    permissions: unique([...PERMISSIONS.audit, ...PERMISSIONS.treasuryRead, ...PERMISSIONS.operationsRead])
  },
  {
    id: "00000000-0000-4000-a000-000000000006",
    email: "demo.dop@paositra-demo.mg",
    displayName: "[DEMO] Directeur Operations",
    role: "DIRECTEUR_OPERATIONS",
    usage: "Direction operations lecture, supervision et audit",
    permissions: unique(["platform:audit:read", "platform:dashboard:read", ...PERMISSIONS.operationsRead])
  },
  {
    id: "00000000-0000-4000-a000-000000000007",
    email: "demo.chef.tana@paositra-demo.mg",
    displayName: "[DEMO] Chef d'Agence Tana-Centre",
    role: "CHEF_AGENCE",
    usage: "Supervision agence Lot 2",
    permissions: unique([
      ...PERMISSIONS.operationsRead,
      "operations:agencies:write",
      "operations:agencies:validate",
      "operations:agencies:close",
      "operations:counters:manage",
      "operations:financial:manage",
      "operations:postal:manage",
      "operations:parcels:manage",
      "operations:transfers:manage",
      "operations:day:validate",
      "operations:fund:manage"
    ])
  },
  {
    id: "00000000-0000-4000-a000-000000000008",
    email: "demo.caissier1@paositra-demo.mg",
    displayName: "[DEMO] Caissier 1 Tana-Centre",
    role: "CAISSIER",
    usage: "Operations de caisse uniquement - agence 67Ha",
    agencyCode: "TMP-PF-ANA-TNR-008",
    permissions: CASHIER_PERMISSIONS
  },
  {
    id: "00000000-0000-4000-a000-00000000000b",
    email: "demo.caissier.ambanidia@paositra-demo.mg",
    displayName: "[DEMO] Caissier Ambanidia",
    role: "CAISSIER",
    usage: "Operations de caisse uniquement - agence Ambanidia",
    agencyCode: "TMP-PF-ANA-TNR-001",
    permissions: CASHIER_PERMISSIONS
  },
  {
    id: "00000000-0000-4000-a000-00000000000c",
    email: "demo.caissier.analakely@paositra-demo.mg",
    displayName: "[DEMO] Caissier Analakely",
    role: "CAISSIER",
    usage: "Operations de caisse uniquement - agence Analakely",
    agencyCode: "TMP-PF-ANA-TNR-002",
    permissions: CASHIER_PERMISSIONS
  },
  {
    id: "00000000-0000-4000-a000-00000000000d",
    email: "demo.caissier.andoharanofotsy@paositra-demo.mg",
    displayName: "[DEMO] Caissier Andoharanofotsy",
    role: "CAISSIER",
    usage: "Operations de caisse uniquement - agence Andoharanofotsy",
    agencyCode: "TMP-PF-ANA-TNR-003",
    permissions: CASHIER_PERMISSIONS
  },
  {
    id: "00000000-0000-4000-a000-00000000000e",
    email: "demo.caissier.andravoahangy@paositra-demo.mg",
    displayName: "[DEMO] Caissier Andravoahangy",
    role: "CAISSIER",
    usage: "Operations de caisse uniquement - agence Andravoahangy",
    agencyCode: "TMP-PF-ANA-TNR-004",
    permissions: CASHIER_PERMISSIONS
  },
  {
    id: "00000000-0000-4000-a000-000000000009",
    email: "demo.verificateur@paositra-demo.mg",
    displayName: "[DEMO] Verificateur",
    role: "VERIFICATEUR",
    usage: "Verification Lot 2",
    permissions: unique([
      "operations:agencies:read",
      "operations:counters:read",
      "operations:financial:read",
      "operations:reports:read",
      "operations:reports:export",
      "operations:dashboard:read",
      "operations:verification:read",
      "operations:verification:validate",
      "platform:notifications:read"
    ])
  },
  {
    id: "00000000-0000-4000-a000-00000000000a",
    email: "demo.comptasieg@paositra-demo.mg",
    displayName: "[DEMO] Comptable Siege",
    role: "COMPTABLE_SIEGE",
    usage: "Comptabilite siege Lot 2",
    permissions: unique([
      "operations:agencies:read",
      "operations:financial:read",
      "operations:reports:read",
      "operations:reports:export",
      "operations:dashboard:read",
      "operations:verification:read",
      "operations:fund:manage",
      "platform:notifications:read",
      "treasury:accounts:read",
      "treasury:reports:read"
    ])
  },
  {
    id: "00000000-0000-4000-b000-000000000101",
    email: "demo.admin@paositra.local",
    displayName: "[DEMO] Administration fonctionnelle",
    role: "DEMO_ADMIN_FONCTIONNEL",
    usage: "Vue globale demo",
    permissions: unique([
      ...PERMISSIONS.platformAdmin,
      ...PERMISSIONS.treasuryRead,
      ...PERMISSIONS.treasuryManage,
      ...PERMISSIONS.operationsRead,
      ...PERMISSIONS.operationsManage
    ])
  },
  {
    id: "00000000-0000-4000-b000-000000000102",
    email: "demo.tresorerie@paositra.local",
    displayName: "[DEMO] Responsable tresorerie",
    role: "DEMO_RESP_TRESORERIE",
    usage: "Parcours Lot 1 Tresorerie",
    permissions: unique([...PERMISSIONS.platformRead, ...PERMISSIONS.treasuryRead, ...PERMISSIONS.treasuryManage])
  },
  {
    id: "00000000-0000-4000-b000-000000000103",
    email: "demo.operations@paositra.local",
    displayName: "[DEMO] Chef agence operations",
    role: "DEMO_CHEF_AGENCE",
    usage: "Parcours Lot 2 Operations",
    permissions: unique([...PERMISSIONS.platformRead, ...PERMISSIONS.operationsRead, ...PERMISSIONS.operationsManage])
  },
  {
    id: "00000000-0000-4000-b000-000000000104",
    email: "demo.dg@paositra.local",
    displayName: "[DEMO] Consultation direction",
    role: "DEMO_CONSULTATION",
    usage: "Lecture direction sans action sensible",
    permissions: unique([...PERMISSIONS.platformRead, ...PERMISSIONS.treasuryRead, ...PERMISSIONS.operationsRead])
  },
  {
    id: "00000000-0000-4000-b000-000000000105",
    email: "demo.audit@paositra.local",
    displayName: "[DEMO] Audit",
    role: "DEMO_AUDITEUR",
    usage: "Audit et controles lecture seule",
    permissions: unique([...PERMISSIONS.audit, ...PERMISSIONS.treasuryRead, ...PERMISSIONS.operationsRead])
  }
];

const FIXED_PASSWORDS = {
  "demo.admin@paositra-demo.mg": "Demo-PAO-2026-ESBZ!",
  "demo.daf@paositra-demo.mg": "Demo-PAO-2026-2GD4!",
  "demo.tresorier@paositra-demo.mg": "Demo-PAO-2026-2L32!",
  "demo.comptable@paositra-demo.mg": "Demo-PAO-2026-Y9J6!",
  "demo.auditeur@paositra-demo.mg": "Demo-PAO-2026-LE5L!",
  "demo.dop@paositra-demo.mg": "Demo-PAO-2026-UL8V!",
  "demo.chef.tana@paositra-demo.mg": "Demo-PAO-2026-FG8F!",
  "demo.caissier1@paositra-demo.mg": "Demo-PAO-2026-2S8J!",
  "demo.caissier.ambanidia@paositra-demo.mg": "Demo-PAO-2026-CVFS!",
  "demo.caissier.analakely@paositra-demo.mg": "Demo-PAO-2026-BZP8!",
  "demo.caissier.andoharanofotsy@paositra-demo.mg": "Demo-PAO-2026-VTPS!",
  "demo.caissier.andravoahangy@paositra-demo.mg": "Demo-PAO-2026-M273!",
  "demo.verificateur@paositra-demo.mg": "Demo-PAO-2026-H7AE!",
  "demo.comptasieg@paositra-demo.mg": "Demo-PAO-2026-NSQ2!",
  "demo.admin@paositra.local": "Demo-PAO-2026-WMS7!",
  "demo.tresorerie@paositra.local": "Demo-PAO-2026-Z9TK!",
  "demo.operations@paositra.local": "Demo-PAO-2026-JYCU!",
  "demo.dg@paositra.local": "Demo-PAO-2026-GMU5!",
  "demo.audit@paositra.local": "Demo-PAO-2026-P8P9!"
};

function password() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `Demo-PAO-2026-${[...randomBytes(4)].map((byte) => alphabet[byte % alphabet.length]).join("")}!`;
}

await client.connect();
try {
  await client.query("BEGIN");

  for (const [code, label, lot, scopeType, description] of ROLE_TEMPLATES) {
    await client.query(
      `INSERT INTO platform.rbac_role_templates(code,label,lot,scope_type,description,status)
       VALUES ($1,$2,$3,$4,$5,'proposition_a_valider')
       ON CONFLICT (code) DO UPDATE SET
         label=EXCLUDED.label,
         lot=EXCLUDED.lot,
         scope_type=EXCLUDED.scope_type,
         description=EXCLUDED.description,
         status='proposition_a_valider'`,
      [code, label, lot, scopeType, description]
    );
  }

  for (const code of unique(USER_SPECS.flatMap((user) => user.permissions))) {
    await client.query(
      `INSERT INTO platform.permissions(code,description)
       VALUES ($1,'Permission technique demo - NON CONTRACTUEL - A VALIDER PAOSITRA')
       ON CONFLICT (code) DO NOTHING`,
      [code]
    );
  }

  const agencyByCode = new Map();
  for (const user of USER_SPECS.filter((item) => item.agencyCode)) {
    const agency = await client.query(
      "SELECT id, name, code FROM operations.agencies WHERE code = $1 OR codique = $1 OR temporary_code = $1 LIMIT 1",
      [user.agencyCode]
    );
    if (!agency.rowCount) {
      throw new Error(`Agence introuvable pour ${user.email}: ${user.agencyCode}`);
    }
    agencyByCode.set(user.agencyCode, agency.rows[0]);
  }

  const output = [];
  for (const user of USER_SPECS) {
    const tempPassword = FIXED_PASSWORDS[user.email] ?? password();
    await client.query(
      `INSERT INTO platform.users(id,email,display_name,password_hash,is_active,must_change_password)
       VALUES($1,$2,$3,$4,true,false)
       ON CONFLICT (id) DO UPDATE SET
         email=EXCLUDED.email,
         display_name=EXCLUDED.display_name,
         password_hash=EXCLUDED.password_hash,
         is_active=true,
         blocked_until=NULL,
         must_change_password=false,
         updated_at=now()`,
      [user.id, user.email, user.displayName, await bcrypt.hash(tempPassword, 12)]
    );
    await client.query("DELETE FROM platform.user_permissions WHERE user_id = $1", [user.id]);
    const agency = user.agencyCode ? agencyByCode.get(user.agencyCode) : null;
    for (const code of user.permissions) {
      await client.query(
        `INSERT INTO platform.user_permissions(id,user_id,permission_code,scope_type,scope_id,granted_by)
         VALUES($1,$2,$3,'global',NULL,$4)
         ON CONFLICT DO NOTHING`,
        [randomUUID(), user.id, code, USER_SPECS[0].id]
      );
      if (agency && CASHIER_SCOPED_PERMISSIONS.has(code)) {
        await client.query(
          `INSERT INTO platform.user_permissions(id,user_id,permission_code,scope_type,scope_id,granted_by)
           VALUES($1,$2,$3,'agency',$4,$5)
           ON CONFLICT DO NOTHING`,
          [randomUUID(), user.id, code, agency.id, USER_SPECS[0].id]
        );
      }
    }
    output.push({ ...user, password: tempPassword, agencyName: agency?.name ?? null });
  }

  await client.query(
    "UPDATE platform.sessions SET revoked_at = now() WHERE user_id = ANY($1) AND revoked_at IS NULL",
    [USER_SPECS.map((user) => user.id)]
  );
  await client.query(
    "UPDATE platform.users SET is_active=false, blocked_until=now(), updated_at=now() WHERE email = ANY($1)",
    [LEGACY_TECHNICAL_EMAILS]
  );
  await client.query(
    `DELETE FROM platform.user_permissions
     WHERE user_id IN (SELECT id FROM platform.users WHERE email = ANY($1))`,
    [LEGACY_TECHNICAL_EMAILS]
  );
  await client.query(
    `UPDATE platform.sessions
     SET revoked_at = now()
     WHERE revoked_at IS NULL
       AND user_id IN (SELECT id FROM platform.users WHERE email = ANY($1))`,
    [LEGACY_TECHNICAL_EMAILS]
  );
  await client.query(
    `INSERT INTO platform.audit_events(id,actor_user_id,action,object_type,object_id,metadata)
     VALUES($1,$2,'demo.users.reset','platform.users',NULL,$3)`,
    [
      randomUUID(),
      USER_SPECS[0].id,
      JSON.stringify({
        emails: USER_SPECS.map((user) => user.email),
        agencyScopedCashiers: USER_SPECS.filter((user) => user.agencyCode).map((user) => ({
          email: user.email,
          agencyCode: user.agencyCode
        })),
        disabledTechnicalEmails: LEGACY_TECHNICAL_EMAILS,
        mode: "DEMO - NON CONTRACTUEL",
        passwordsPersistedInRepository: false
      })
    ]
  );

  await client.query("COMMIT");

  console.log("Comptes demo locaux regeneres. Mots de passe affiches une seule fois:");
  output.forEach((user, index) => {
    console.log(`Compte ${index + 1} | ${user.email} | ${user.password} | ${user.role} | ${user.usage}${user.agencyName ? ` | ${user.agencyName}` : ""}`);
  });
} catch (error) {
  await client.query("ROLLBACK");
  console.error("DEMO RESET ERROR:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
