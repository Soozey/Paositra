import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = [
  join(process.cwd(), "scripts", "demo-reset-users.mjs"),
  join(process.cwd(), "..", "..", "scripts", "demo-reset-users.mjs")
].find((path) => existsSync(path));

if (!scriptPath) {
  throw new Error("Script demo-reset-users.mjs introuvable.");
}

const resetScript = readFileSync(scriptPath, "utf8");

function userBlock(role: string) {
  const match = resetScript.match(
    new RegExp(`role: "${role}",[\\s\\S]*?permissions: unique\\(\\[([\\s\\S]*?)\\]\\)`)
  );
  if (!match) {
    throw new Error(`Bloc utilisateur introuvable pour ${role}`);
  }
  return match[1]!;
}

describe("demo reset users", () => {
  it("keeps ADMIN_SYSTEME outside business operations", () => {
    const adminPermissions = userBlock("ADMIN_SYSTEME");

    expect(adminPermissions).not.toContain("operations:cash:open");
    expect(adminPermissions).not.toContain("operations:cash:operate");
    expect(adminPermissions).not.toContain("operations:cash:close");
    expect(adminPermissions).not.toContain("operations:day:validate");
    expect(adminPermissions).not.toContain("operations:verification:validate");
    expect(adminPermissions).not.toContain("treasury:placements:write");
    expect(adminPermissions).not.toContain("treasury:placements:approve");
    expect(adminPermissions).toContain("...PERMISSIONS.platformAdmin");
    expect(resetScript).toContain('"platform:users:manage"');
    expect(adminPermissions).toContain("operations:agencies:read");
    expect(adminPermissions).toContain("operations:counters:manage");
  });

  it("keeps every requested demo account password fixed", () => {
    const expected = [
      "demo.admin@paositra-demo.mg",
      "demo.daf@paositra-demo.mg",
      "demo.tresorier@paositra-demo.mg",
      "demo.comptable@paositra-demo.mg",
      "demo.auditeur@paositra-demo.mg",
      "demo.dop@paositra-demo.mg",
      "demo.chef.tana@paositra-demo.mg",
      "demo.caissier1@paositra-demo.mg",
      "demo.caissier.ambanidia@paositra-demo.mg",
      "demo.caissier.analakely@paositra-demo.mg",
      "demo.caissier.andoharanofotsy@paositra-demo.mg",
      "demo.caissier.andravoahangy@paositra-demo.mg",
      "demo.verificateur@paositra-demo.mg",
      "demo.comptasieg@paositra-demo.mg",
      "demo.admin@paositra.local",
      "demo.tresorerie@paositra.local",
      "demo.operations@paositra.local",
      "demo.dg@paositra.local",
      "demo.audit@paositra.local"
    ];

    for (const email of expected) {
      expect(resetScript).toContain(`"${email}": "Demo-PAO-2026-`);
    }
  });
});
