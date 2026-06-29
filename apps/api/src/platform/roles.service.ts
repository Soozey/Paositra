import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission, RbacRoleTemplate } from "../database/entities";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RbacRoleTemplate)
    private readonly roles: Repository<RbacRoleTemplate>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>
  ) {}

  async listRoles() {
    const roles = await this.roles.find({ order: { lot: "ASC", label: "ASC" } });
    return {
      items: roles,
      total: roles.length,
      notice: "Proposition KCI — tous les rôles sont à valider par PAOMA avant usage en production."
    };
  }

  async getRoleByCode(code: string) {
    const role = await this.roles.findOne({ where: { code } });
    return role ?? null;
  }

  async listPermissions() {
    const perms = await this.permissions.find({ order: { code: "ASC" } });
    return {
      items: perms,
      total: perms.length
    };
  }
}
