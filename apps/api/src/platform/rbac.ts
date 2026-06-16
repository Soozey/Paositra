import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type {
  AuthenticatedRequest,
  AuthenticatedUser
} from "../common/request-context";

const PERMISSION_KEY = "required_permission";
const SCOPE_TYPES = ["global", "organ", "direction", "agency", "counter"] as const;

export type PermissionScopeType = (typeof SCOPE_TYPES)[number];

export interface PermissionScopeRequirement {
  type: Exclude<PermissionScopeType, "global">;
  routeParam: string;
}

export interface PermissionRequirement {
  code: string;
  scope?: PermissionScopeRequirement;
}

export const RequirePermission = (
  code: string,
  scope?: PermissionScopeRequirement
) => SetMetadata(PERMISSION_KEY, { code, scope } satisfies PermissionRequirement);

export function hasRequiredPermission(
  permissions: AuthenticatedUser["permissions"],
  requirement: PermissionRequirement,
  routeParams: Record<string, string | string[] | undefined>
): boolean {
  const validPermissions = permissions.filter(
    (permission) =>
      permission.code === requirement.code &&
      SCOPE_TYPES.includes(permission.scopeType as PermissionScopeType) &&
      ((permission.scopeType === "global" && permission.scopeId === null) ||
        (permission.scopeType !== "global" && permission.scopeId !== null))
  );

  if (!requirement.scope) {
    return validPermissions.some(
      (permission) =>
        permission.scopeType === "global" && permission.scopeId === null
    );
  }

  const scopeId = routeParams[requirement.scope.routeParam];
  if (typeof scopeId !== "string" || !scopeId) {
    return false;
  }

  return validPermissions.some(
    (permission) =>
      (permission.scopeType === "global" && permission.scopeId === null) ||
      (permission.scopeType === requirement.scope?.type &&
        permission.scopeId === scopeId)
  );
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass()
      ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation nécessaire pour cette action."
      );
    }
    if (request.user.mustChangePassword) {
      throw new ForbiddenException(
        "Vous devez changer votre mot de passe avant d'effectuer cette action."
      );
    }

    if (!hasRequiredPermission(request.user.permissions, required, request.params)) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation nécessaire pour cette action."
      );
    }
    return true;
  }
}
