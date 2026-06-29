// Seed de DÉMONSTRATION PAOSITRA / PAOMA — données non contractuelles [DEMO]
// Idempotent. À exécuter avec un rôle propriétaire (MIGRATION_DATABASE_URL).
// Usage: MIGRATION_DATABASE_URL=postgres://... node scripts/seed-demo.mjs
import pg from "pg";
import bcrypt from "bcryptjs";

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL ou DATABASE_URL requis");
const client = new pg.Client({ connectionString: url });

const PW = "Demo@1234";
const ADMIN = "00000000-0000-4000-a000-000000000001";

const PERMS = {
  platform: ["platform:users:manage","platform:config:read","platform:config:manage","platform:audit:read","platform:roles:read","platform:roles:manage","platform:dashboard:read","platform:notifications:read","platform:agencies:validate"],
  treasury: ["treasury:institutions:read","treasury:institutions:write","treasury:institutions:validate","treasury:institutions:export","treasury:placements:read","treasury:placements:write","treasury:placements:approve","treasury:placements:cancel","treasury:placements:close","treasury:placements:export","treasury:accounts:read","treasury:accounts:manage","treasury:flows:read","treasury:flows:manage","treasury:reports:read","treasury:reports:export","treasury:dashboard:read"],
  operations: ["operations:agencies:read","operations:agencies:write","operations:agencies:validate","operations:agencies:export","operations:agencies:import","operations:agencies:close","operations:counters:read","operations:counters:manage","operations:financial:read","operations:financial:manage","operations:postal:read","operations:postal:manage","operations:parcels:read","operations:parcels:manage","operations:transfers:read","operations:transfers:manage","operations:reports:read","operations:reports:export","operations:dashboard:read"]
};
const ALL = [...PERMS.platform, ...PERMS.treasury, ...PERMS.operations];

const ROLE_PERMS = {
  ADMIN_SYSTEME: ALL,
  DIRECTEUR_FINANCIER: ["treasury:institutions:read","treasury:institutions:validate","treasury:placements:read","treasury:placements:approve","treasury:placements:export","treasury:accounts:read","treasury:flows:read","treasury:reports:read","treasury:reports:export","treasury:dashboard:read","platform:dashboard:read","platform:audit:read"],
  TRESORIER_CHEF: ["treasury:institutions:read","treasury:institutions:write","treasury:institutions:validate","treasury:institutions:export","treasury:placements:read","treasury:placements:write","treasury:placements:approve","treasury:placements:cancel","treasury:placements:close","treasury:placements:export","treasury:accounts:read","treasury:accounts:manage","treasury:flows:read","treasury:flows:manage","treasury:reports:read","treasury:reports:export","treasury:dashboard:read"],
  COMPTABLE: ["treasury:institutions:read","treasury:placements:read","treasury:accounts:read","treasury:accounts:manage","treasury:flows:read","treasury:flows:manage","treasury:reports:read","treasury:dashboard:read"],
  AUDITEUR_INTERNE: ["platform:audit:read","platform:dashboard:read","treasury:institutions:read","treasury:placements:read","treasury:placements:export","treasury:accounts:read","treasury:flows:read","treasury:reports:read","treasury:reports:export","treasury:dashboard:read","operations:agencies:read","operations:counters:read","operations:financial:read","operations:reports:read","operations:reports:export","operations:dashboard:read"],
  DIRECTEUR_OPERATIONS: ["operations:agencies:read","operations:counters:read","operations:financial:read","operations:postal:read","operations:parcels:read","operations:transfers:read","operations:reports:read","operations:reports:export","operations:dashboard:read","platform:dashboard:read","platform:audit:read"],
  CHEF_AGENCE: ["operations:agencies:read","operations:agencies:write","operations:agencies:validate","operations:agencies:close","operations:counters:read","operations:counters:manage","operations:financial:read","operations:financial:manage","operations:postal:read","operations:postal:manage","operations:parcels:read","operations:parcels:manage","operations:transfers:read","operations:transfers:manage","operations:reports:read","operations:reports:export","operations:dashboard:read"],
  CAISSIER: ["operations:agencies:read","operations:counters:read","operations:counters:manage","operations:financial:read","operations:financial:manage","operations:postal:read","operations:postal:manage","operations:parcels:read","operations:parcels:manage","operations:transfers:read"],
  VERIFICATEUR: ["operations:agencies:read","operations:counters:read","operations:financial:read","operations:reports:read","operations:reports:export","operations:dashboard:read"],
  COMPTABLE_SIEGE: ["operations:agencies:read","operations:financial:read","operations:reports:read","operations:reports:export","operations:dashboard:read","treasury:accounts:read","treasury:reports:read"]
};

const USERS = [
  { id: ADMIN, email:"demo.admin@paositra-demo.mg", name:"[DEMO] Admin Système", role:"ADMIN_SYSTEME" },
  { id:"00000000-0000-4000-a000-000000000002", email:"demo.daf@paositra-demo.mg", name:"[DEMO] Directeur Financier", role:"DIRECTEUR_FINANCIER" },
  { id:"00000000-0000-4000-a000-000000000003", email:"demo.tresorier@paositra-demo.mg", name:"[DEMO] Trésorier Chef", role:"TRESORIER_CHEF" },
  { id:"00000000-0000-4000-a000-000000000004", email:"demo.comptable@paositra-demo.mg", name:"[DEMO] Comptable", role:"COMPTABLE" },
  { id:"00000000-0000-4000-a000-000000000005", email:"demo.auditeur@paositra-demo.mg", name:"[DEMO] Auditeur Interne", role:"AUDITEUR_INTERNE" },
  { id:"00000000-0000-4000-a000-000000000006", email:"demo.dop@paositra-demo.mg", name:"[DEMO] Directeur Opérations", role:"DIRECTEUR_OPERATIONS" },
  { id:"00000000-0000-4000-a000-000000000007", email:"demo.chef.tana@paositra-demo.mg", name:"[DEMO] Chef d'Agence Tana-Centre", role:"CHEF_AGENCE" },
  { id:"00000000-0000-4000-a000-000000000008", email:"demo.caissier1@paositra-demo.mg", name:"[DEMO] Caissier 1 Tana-Centre", role:"CAISSIER" },
  { id:"00000000-0000-4000-a000-000000000009", email:"demo.verificateur@paositra-demo.mg", name:"[DEMO] Vérificateur", role:"VERIFICATEUR" },
  { id:"00000000-0000-4000-a000-00000000000a", email:"demo.comptasieg@paositra-demo.mg", name:"[DEMO] Comptable Siège", role:"COMPTABLE_SIEGE" }
];

const INSTITUTIONS = [
  { id:"10000000-0000-4000-b000-000000000001", name:"BNI Madagascar [DEMO]" },
  { id:"10000000-0000-4000-b000-000000000002", name:"BFV-SG [DEMO]" },
  { id:"10000000-0000-4000-b000-000000000003", name:"BOA Madagascar [DEMO]" }
];
const PLACEMENTS = [
  { id:"20000000-0000-4000-c000-000000000001", inst:INSTITUTIONS[0].id, principal:"500000000", cur:"MGA", rate:"6.50", days:90, mode:"simple_360", start:"2026-04-05" },
  { id:"20000000-0000-4000-c000-000000000002", inst:INSTITUTIONS[2].id, principal:"300000000", cur:"MGA", rate:"7.00", days:180, mode:"simple_360", start:"2026-06-01" }
];
const AGENCIES = [
  { id:"30000000-0000-4000-d000-000000000001", code:"AG-TNR-CTR", name:"Tana-Centre [DEMO]", region:"Analamanga", city:"Antananarivo", district:"Antananarivo Renivohitra", type:"Recette Principale", cash:"80000000" },
  { id:"30000000-0000-4000-d000-000000000002", code:"AG-TNR-IST", name:"Tana-Isotry [DEMO]", region:"Analamanga", city:"Antananarivo", district:"Antananarivo Renivohitra", type:"Agence", cash:"30000000" },
  { id:"30000000-0000-4000-d000-000000000003", code:"AG-ATB-001", name:"Antsirabe [DEMO]", region:"Vakinankaratra", city:"Antsirabe", district:"Antsirabe I", type:"Agence", cash:"25000000" },
  { id:"30000000-0000-4000-d000-000000000004", code:"AG-FIA-001", name:"Fianarantsoa [DEMO]", region:"Haute Matsiatra", city:"Fianarantsoa", district:"Fianarantsoa I", type:"Agence", cash:"20000000" },
  { id:"30000000-0000-4000-d000-000000000005", code:"AG-TOA-001", name:"Toamasina [DEMO]", region:"Atsinanana", city:"Toamasina", district:"Toamasina I", type:"Recette Principale", cash:"40000000" }
];

await client.connect();
try {
  await client.query("BEGIN");
  const uids = USERS.map(u=>u.id), pids = PLACEMENTS.map(p=>p.id), iids = INSTITUTIONS.map(i=>i.id), aids = AGENCIES.map(a=>a.id);
  // Nettoyage idempotent (ordre FK)
  await client.query("DELETE FROM treasury.placement_history WHERE placement_id = ANY($1)", [pids]);
  await client.query("DELETE FROM treasury.placements WHERE id = ANY($1)", [pids]);
  await client.query("DELETE FROM treasury.institutions WHERE id = ANY($1)", [iids]);
  await client.query("DELETE FROM operations.agencies WHERE id = ANY($1)", [aids]);
  await client.query("DELETE FROM platform.user_permissions WHERE user_id = ANY($1)", [uids]);
  await client.query("DELETE FROM platform.sessions WHERE user_id = ANY($1)", [uids]);
  await client.query("DELETE FROM platform.users WHERE id = ANY($1)", [uids]);

  const hash = await bcrypt.hash(PW, 10);
  for (const u of USERS) {
    await client.query(
      "INSERT INTO platform.users(id,email,display_name,password_hash,is_active,must_change_password) VALUES($1,$2,$3,$4,true,false)",
      [u.id, u.email, u.name, hash]
    );
    for (const code of ROLE_PERMS[u.role]) {
      await client.query(
        "INSERT INTO platform.user_permissions(id,user_id,permission_code,scope_type,scope_id,granted_by) VALUES(gen_random_uuid(),$1,$2,'global',NULL,$3)",
        [u.id, code, ADMIN]
      );
    }
  }
  for (const i of INSTITUTIONS)
    await client.query("INSERT INTO treasury.institutions(id,name,is_active) VALUES($1,$2,true)", [i.id, i.name]);
  for (const p of PLACEMENTS)
    await client.query(
      "INSERT INTO treasury.placements(id,institution_id,principal_amount,currency,annual_interest_rate,duration_days,deposit_mode,interest_calculation_mode,start_date,status,created_by) VALUES($1,$2,$3,$4,$5,$6,'Dépôt à terme',$7,$8,'open',$9)",
      [p.id, p.inst, p.principal, p.cur, p.rate, p.days, p.mode, p.start, ADMIN]
    );
  for (const a of AGENCIES)
    await client.query(
      "INSERT INTO operations.agencies(id,code,name,region,city,district,type,cash_max_amount,status,created_by,source_type,source_name,source_note,validation_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,'demo_only','Soozey SARL — démonstration','Donnée de démonstration, non contractuelle','to_validate')",
      [a.id, a.code, a.name, a.region, a.city, a.district, a.type, a.cash, ADMIN]
    );
  await client.query("COMMIT");
  console.log(`SEED OK: ${USERS.length} comptes démo, ${INSTITUTIONS.length} institutions, ${PLACEMENTS.length} placements, ${AGENCIES.length} agences.`);
} catch (e) {
  await client.query("ROLLBACK");
  console.error("SEED ERROR", e.message);
  process.exit(1);
} finally {
  await client.end();
}
