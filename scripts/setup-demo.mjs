// Installation démo complète (idempotent) : données de base + référentiel PAOMA + comptes.
// Exécuter avec MIGRATION_DATABASE_URL (rôle propriétaire), DEMO_MODE=true, NODE_ENV!=production.
import { execSync } from "node:child_process";
process.env.DEMO_MODE = "true";
if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") process.env.NODE_ENV = "development";
const steps = [
  ["Donnees de base (admin, institutions, placements, agences)", "scripts/seed-demo.mjs"],
  ["Referentiel PAOMA (93 postes, roles, permissions, jours feries)", "scripts/seed-paoma-complements.mjs"],
  ["Comptes de demonstration + permissions + mots de passe", "scripts/demo-reset-users.mjs"]
];
for (const [label, file] of steps) {
  console.log(`\n=== ${label} ===`);
  execSync(`node ${file}`, { stdio: "inherit", env: process.env });
}
console.log("\nINSTALLATION DEMO TERMINEE. Connectez-vous avec les comptes listes ci-dessus.");
