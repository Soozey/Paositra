import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../common/request-context";

const PERMISSION_KEY = "required_permission";

export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user.mustChangePassword) {
      throw new ForbiddenException(
        "Vous devez changer votre mot de passe avant d'effectuer cette action."
      );
    }
    const allowed = request.user.permissions.some(
      (permission) =>
        permission.code === required && permission.scopeType === "global"
    );
    if (!allowed) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation nécessaire pour cette action."
      );
    }
    return true;
  }
}
