import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { In, Repository } from "typeorm";
import type { AuthenticatedUser } from "../common/request-context";
import {
  Permission,
  User,
  UserPermission
} from "../database/entities";
import { AuditService } from "./audit.service";
import { CreateUserDto } from "./users.dto";
import { validatePasswordPolicy } from "../auth/password-policy";

@Injectable()
export class UsersService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
    private readonly audit: AuditService
  ) {}

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
    context: { ipAddress: string | null; userAgent: string | null }
  ) {
    validatePasswordPolicy(
      dto.password,
      this.config.getOrThrow<number>("PASSWORD_MIN_LENGTH")
    );
    const email = dto.email.trim().toLowerCase();
    const existing = await this.users
      .createQueryBuilder("user")
      .where("lower(user.email) = :email", { email })
      .getOne();
    if (existing) {
      throw new ConflictException("Un utilisateur utilise déjà cette adresse.");
    }

    const knownPermissions = await this.permissions.findBy({
      code: In(dto.permissionCodes)
    });
    if (knownPermissions.length !== dto.permissionCodes.length) {
      throw new BadRequestException(
        "Une ou plusieurs habilitations demandées sont inconnues."
      );
    }

    const user = this.users.create({
      id: randomUUID(),
      email,
      displayName: dto.displayName.trim(),
      passwordHash: await bcrypt.hash(dto.password, 12),
      isActive: true,
      blockedUntil: null,
      mustChangePassword: dto.mustChangePassword
    });

    await this.users.manager.transaction(async (manager) => {
      await manager.save(user);
      if (dto.permissionCodes.length) {
        await manager.insert(
          UserPermission,
          dto.permissionCodes.map((permissionCode) => ({
            id: randomUUID(),
            userId: user.id,
            permissionCode,
            scopeType: "global",
            scopeId: null,
            grantedBy: actor.id
          }))
        );
      }
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "platform.user.created",
        objectType: "platform.user",
        objectId: user.id,
        afterState: {
          email: user.email,
          displayName: user.displayName,
          permissionCodes: dto.permissionCodes
        },
        ...context
      });
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mustChangePassword: user.mustChangePassword,
      permissionCodes: dto.permissionCodes
    };
  }

}
