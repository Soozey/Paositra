import { readFile } from "node:fs/promises";

const document = JSON.parse(
  await readFile("docs/openapi/openapi.json", "utf8")
);
const paths = document.paths ?? {};
const sensitivePrefixes = [
  "/api/v1/platform",
  "/api/v1/treasury",
  "/api/v1/operations"
];

for (const [path, operations] of Object.entries(paths)) {
  if (!sensitivePrefixes.some((prefix) => path.startsWith(prefix))) {
    continue;
  }
  for (const [method, operation] of Object.entries(operations)) {
    if (!["get", "post", "patch", "put", "delete"].includes(method)) {
      continue;
    }
    if (!Array.isArray(operation.security) || operation.security.length === 0) {
      throw new Error(`${method.toUpperCase()} ${path} is missing bearer security`);
    }
  }
}

if (!paths["/api/v1/auth/login"]?.post) {
  throw new Error("The public login route is missing from the OpenAPI artifact");
}

console.log("OpenAPI artifact is valid and sensitive routes declare bearer security.");
