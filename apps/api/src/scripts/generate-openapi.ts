import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createOpenApiDocument } from "../openapi";

async function generate() {
  const outputDirectory = path.resolve("docs", "openapi");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "openapi.json"),
    `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`,
    "utf8"
  );
}

generate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  process.stderr.write(
    `Impossible de générer OpenAPI. Détail : ${message}\n`
  );
  process.exitCode = 1;
});
