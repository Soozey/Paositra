import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";

const suffix = randomBytes(6).toString("hex");
const container = `paositra-postgres-test-${suffix}`;
const adminPassword = randomBytes(24).toString("hex");
const ownerPassword = randomBytes(24).toString("hex");
const appPassword = randomBytes(24).toString("hex");
const database = "paositra_test";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: { ...process.env, ...options.env }
  });
  if (result.status !== 0) {
    throw new Error(
      options.capture
        ? `${command} failed: ${result.stderr || result.stdout}`
        : `${command} failed with exit code ${result.status}`
    );
  }
  return options.capture ? result.stdout.trim() : "";
}

function docker(args, options) {
  return run("docker", args, options);
}

async function waitForPostgres(connectionString) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch {
      await client.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error("The ephemeral PostgreSQL test container did not become ready.");
}

try {
  docker([
    "run",
    "--detach",
    "--name",
    container,
    "--publish",
    "127.0.0.1::5432",
    "--env",
    `POSTGRES_PASSWORD=${adminPassword}`,
    "--env",
    `POSTGRES_DB=${database}`,
    "postgres:16.9-alpine"
  ]);

  const portOutput = docker(["port", container, "5432/tcp"], { capture: true });
  const port = portOutput.match(/:(\d+)\s*$/)?.[1];
  if (!port) {
    throw new Error(`Unable to determine the ephemeral PostgreSQL port: ${portOutput}`);
  }

  const adminUrl = `postgresql://postgres:${adminPassword}@127.0.0.1:${port}/${database}`;
  const ownerUrl = `postgresql://paositra_owner:${ownerPassword}@127.0.0.1:${port}/${database}`;
  const appUrl = `postgresql://paositra_app:${appPassword}@127.0.0.1:${port}/${database}`;
  await waitForPostgres(adminUrl);
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`
      CREATE ROLE paositra_owner
        LOGIN PASSWORD '${ownerPassword}'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
      CREATE ROLE paositra_app
        LOGIN PASSWORD '${appPassword}'
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
      ALTER DATABASE ${database} OWNER TO paositra_owner;
      REVOKE CONNECT ON DATABASE ${database} FROM PUBLIC;
      GRANT CONNECT ON DATABASE ${database} TO paositra_owner, paositra_app;
    `);
  } finally {
    await admin.end();
  }

  run("node", ["scripts/migrate.mjs"], {
    env: { MIGRATION_DATABASE_URL: ownerUrl }
  });
  run(
    process.execPath,
    [
      "../../node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.integration.config.ts"
    ],
    {
      cwd: "apps/api",
      env: {
        PAOSITRA_TEST_OWNER_DATABASE_URL: ownerUrl,
        PAOSITRA_TEST_APP_DATABASE_URL: appUrl
      }
    }
  );
} catch (error) {
  const logs = spawnSync("docker", ["logs", container], {
    encoding: "utf8",
    stdio: "pipe"
  });
  if (logs.stdout) {
    console.error(logs.stdout);
  }
  if (logs.stderr) {
    console.error(logs.stderr);
  }
  throw error;
} finally {
  spawnSync("docker", ["rm", "--force", container], { stdio: "inherit" });
}
