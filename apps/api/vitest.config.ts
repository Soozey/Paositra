import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.spec.ts"],
    exclude: ["test/postgres.integration.spec.ts"],
    setupFiles: ["test/setup.ts"]
  }
});
