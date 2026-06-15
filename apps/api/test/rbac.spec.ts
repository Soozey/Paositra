import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionGuard } from "../src/platform/rbac";

function contextWith(permissionCodes: string[]) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          permissions: permissionCodes.map((code) => ({
            code,
            scopeType: "global",
            scopeId: null
          }))
        }
      })
    })
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  it("allows a matching global permission", () => {
    const reflector = {
      getAllAndOverride: () => "treasury:placements:read"
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(guard.canActivate(contextWith(["treasury:placements:read"]))).toBe(
      true
    );
  });

  it("rejects a missing permission", () => {
    const reflector = {
      getAllAndOverride: () => "operations:agencies:close"
    } as unknown as Reflector;
    const guard = new PermissionGuard(reflector);
    expect(() =>
      guard.canActivate(contextWith(["operations:agencies:read"]))
    ).toThrow(ForbiddenException);
  });
});
