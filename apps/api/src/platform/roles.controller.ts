import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "./rbac";
import { RolesService } from "./roles.service";

@ApiTags("Rôles & Habilitations")
@ApiBearerAuth()
@Controller("api/v1/platform/roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermission("platform:roles:read")
  listRoles() {
    return this.roles.listRoles();
  }

  @Get("permissions")
  @RequirePermission("platform:roles:read")
  listPermissions() {
    return this.roles.listPermissions();
  }

  @Get(":code")
  @RequirePermission("platform:roles:read")
  async getRoleByCode(@Param("code") code: string) {
    const role = await this.roles.getRoleByCode(code);
    if (!role) throw new NotFoundException("Rôle introuvable.");
    return role;
  }
}
