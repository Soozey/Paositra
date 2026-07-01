import { createOpenApiDocument } from "../src/openapi";

describe("extended treasury OpenAPI", () => {
  it("documents every route used by the extended Lot 1 screens", () => {
    const paths = createOpenApiDocument().paths as Record<string, unknown>;
    for (const route of [
      "/api/v1/treasury/wallets",
      "/api/v1/treasury/wallets/{id}/entries",
      "/api/v1/treasury/wallets/entries/{id}/status",
      "/api/v1/treasury/bank-imports",
      "/api/v1/treasury/bank-imports/{accountId}",
      "/api/v1/treasury/budget/versions",
      "/api/v1/treasury/budget/versions/{id}/activate",
      "/api/v1/treasury/attachments/objects/{objectType}/{objectId}",
      "/api/v1/treasury/attachments/file/{id}",
      "/api/v1/treasury/attachments/file/{id}/archive"
    ]) {
      expect(paths[route], route).toBeDefined();
    }
  });
});
