import {
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { MoreThan, Repository } from "typeorm";
import type { AuthenticatedUser } from "../common/request-context";
import {
  LoginAttempt,
  Session,
  User,
  UserPermission
} from "../database/entities";
import { AuditService } from "../platform/audit.service";
import { ChangePasswordDto, LoginDto } from "./auth.dto";
import { validatePasswordPolicy } from "./password-policy";

interface ClientContext {
  ipAddress: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttempts: Repository<LoginAttempt>,
    @InjectRepository(UserPermission)
    private readonly permissions: Repository<UserPermission>,
    private readonly audit: AuditService
  ) {}

  async login(dto: LoginDto, context: ClientContext) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("lower(user.email) = :email", { email })
      .getOne();
    const now = new Date();

    const valid =
      Boolean(user?.passwordHash) &&
      Boolean(user?.isActive) &&
      (!user?.blockedUntil || user.blockedUntil <= now) &&
      (await bcrypt.compare(dto.password, user!.passwordHash!));

    await this.loginAttempts.save(
      this.loginAttempts.create({
        id: randomUUID(),
        email,
        succeeded: valid,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        failureReason: valid ? null : "invalid_credentials"
      })
    );

    if (!valid || !user) {
      await this.applyLockoutIfRequired(email, user);
      throw new UnauthorizedException(
        "L'adresse e-mail ou le mot de passe est incorrect."
      );
    }

    const ttlSeconds = this.config.getOrThrow<number>("JWT_TTL_SECONDS");
    const session = this.sessions.create({
      id: randomUUID(),
      userId: user.id,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
      revokedAt: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      secondFactorVerified: false
    });
    await this.sessions.manager.transaction(async (manager) => {
      await manager.save(session);
      await this.audit.record(manager, {
        actorUserId: user.id,
        sessionId: session.id,
        action: "auth.login.succeeded",
        objectType: "platform.session",
        objectId: session.id,
        ...context
      });
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id, email: user.email },
      { expiresIn: ttlSeconds }
    );
    const permissions = await this.permissions.findBy({ userId: user.id });
    return {
      accessToken,
      expiresAt: session.expiresAt,
      user: this.toUserView(user, session.id, permissions)
    };
  }

  async logout(user: AuthenticatedUser, context: ClientContext) {
    await this.sessions.manager.transaction(async (manager) => {
      await manager.update(Session, user.sessionId, { revokedAt: new Date() });
      await this.audit.record(manager, {
        actorUserId: user.id,
        sessionId: user.sessionId,
        action: "auth.logout",
        objectType: "platform.session",
        objectId: user.sessionId,
        ...context
      });
    });
  }

  async changePassword(
    dto: ChangePasswordDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    const user = await this.users
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: actor.id })
      .getOne();
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException("Le mot de passe actuel est incorrect.");
    }
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new UnauthorizedException(
        "Le nouveau mot de passe doit être différent du mot de passe actuel."
      );
    }
    validatePasswordPolicy(
      dto.newPassword,
      this.config.getOrThrow<number>("PASSWORD_MIN_LENGTH")
    );

    await this.users.manager.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          mustChangePassword: false,
          blockedUntil: null
        })
        .where("id = :id", { id: actor.id })
        .execute();
      await manager
        .createQueryBuilder()
        .update(Session)
        .set({ revokedAt: new Date() })
        .where("user_id = :userId", { userId: actor.id })
        .andWhere("id <> :sessionId", { sessionId: actor.sessionId })
        .andWhere("revoked_at IS NULL")
        .execute();
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "auth.password.changed",
        objectType: "platform.user",
        objectId: actor.id,
        ...context
      });
    });
    const permissions = await this.permissions.findBy({ userId: actor.id });
    user.mustChangePassword = false;
    return {
      message: "Votre mot de passe a été modifié.",
      user: this.toUserView(user, actor.sessionId, permissions)
    };
  }

  async me(user: AuthenticatedUser) {
    return user;
  }

  private async applyLockoutIfRequired(email: string, user: User | null) {
    if (!user) {
      return;
    }
    const maxAttempts = this.config.getOrThrow<number>("LOGIN_MAX_ATTEMPTS");
    const lockSeconds = this.config.getOrThrow<number>("LOGIN_LOCK_SECONDS");
    const since = new Date(Date.now() - lockSeconds * 1000);
    const failures = await this.loginAttempts.count({
      where: { email, succeeded: false, occurredAt: MoreThan(since) }
    });
    if (failures >= maxAttempts) {
      await this.users.update(user.id, {
        blockedUntil: new Date(Date.now() + lockSeconds * 1000)
      });
    }
  }

  private toUserView(
    user: User,
    sessionId: string,
    permissions: UserPermission[]
  ) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionId,
      mustChangePassword: user.mustChangePassword,
      permissions: permissions.map((permission) => ({
        code: permission.permissionCode,
        scopeType: permission.scopeType,
        scopeId: permission.scopeId
      }))
    };
  }
}
