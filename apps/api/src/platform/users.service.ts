import {
  ConflictException,
  Injectable
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import type { AuthenticatedUser } from "../common/request-context";
import { User } from "../database/entities";
import { AuditService } from "./audit.service";
import { CreateUserDto } from "./users.dto";
import { validatePasswordPolicy } from "../auth/password-policy";

@Injectable()
export class UsersService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
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
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "platform.user.created",
        objectType: "platform.user",
        objectId: user.id,
        afterState: {
          email: user.email,
          displayName: user.displayName
        },
        ...context
      });
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mustChangePassword: user.mustChangePassword,
      permissionCodes: []
    };
  }

}
