import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  PermissionGuard,
  type PermissionRequirement
} from "../src/platform/rbac";

interface TestPermission {
  code: string;
  scopeType: string;
  scopeId: string | null;
}

function contextWith(
  permissions: TestPermission[],
  params: Record<string, string> = {}
) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        params,
        user: {
          mustChangePassword: false,
          permissions
        }
      })
    })
  } as unknown as ExecutionContext;
}

function guardFor(requirement: PermissionRequirement) {
  const reflector = {
    getAllAndOverride: () => requirement
  } as unknown as Reflector;
  return new PermissionGuard(reflector);
}

describe("PermissionGuard", () => {
  it("allows an exact global permission", () => {
    const guard = guardFor({ code: "treasury:placements:read" });
    expect(
      guard.canActivate(
        contextWith([
          {
            code: "treasury:placements:read",
            scopeType: "global",
            scopeId: null
          }
        ])
      )
    ).toBe(true);
  });

  it("rejects a scoped permission on a route requiring global access", () => {
    const guard = guardFor({ code: "operations:agencies:read" });
    expect(() =>
      guard.canActivate(
        contextWith([
          {
            code: "operations:agencies:read",
            scopeType: "agency",
            scopeId: "6d91b544-d77b-49cf-9e84-6e37bbaf2b42"
          }
        ])
      )
    ).toThrow(ForbiddenException);
  });

  it("allows an exact agency scope", () => {
    const agencyId = "6d91b544-d77b-49cf-9e84-6e37bbaf2b42";
    const guard = guardFor({
      code: "operations:agencies:close",
      scope: { type: "agency", routeParam: "id" }
    });
    expect(
      guard.canActivate(
        contextWith(
          [
            {
              code: "operations:agencies:close",
              scopeType: "agency",
              scopeId: agencyId
            }
          ],
          { id: agencyId }
        )
      )
    ).toBe(true);
  });

  it("rejects an agency scope that is not owned", () => {
    const guard = guardFor({
      code: "operations:agencies:close",
      scope: { type: "agency", routeParam: "id" }
    });
    expect(() =>
      guard.canActivate(
        contextWith(
          [
            {
              code: "operations:agencies:close",
              scopeType: "agency",
              scopeId: "6d91b544-d77b-49cf-9e84-6e37bbaf2b42"
            }
          ],
          { id: "85a2736d-79a5-464c-8595-453233ac7335" }
        )
      )
    ).toThrow(ForbiddenException);
  });

  it("rejects a direction scope that is not owned", () => {
    const guard = guardFor({
      code: "operations:agencies:read",
      scope: { type: "direction", routeParam: "directionId" }
    });
    expect(() =>
      guard.canActivate(
        contextWith([], {
          directionId: "f6906618-3f79-40d1-a445-3da5cf0555e0"
        })
      )
    ).toThrow(ForbiddenException);
  });

  it("rejects unknown or ambiguous stored scopes by default", () => {
    const guard = guardFor({ code: "platform:audit:read" });
    expect(() =>
      guard.canActivate(
        contextWith([
          {
            code: "platform:audit:read",
            scopeType: "unknown",
            scopeId: null
          }
        ])
      )
    ).toThrow(ForbiddenException);
  });
});
