import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { AuthenticatedRequest } from "../common/request-context";
import { Session, User, UserPermission } from "../database/entities";

export const PUBLIC_ROUTE = "public_route";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(UserPermission)
    private readonly permissions: Repository<UserPermission>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("Votre session est absente ou a expiré.");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Votre session est absente ou a expiré.");
    }

    const [user, session, permissions] = await Promise.all([
      this.users.findOneBy({ id: payload.sub }),
      this.sessions.findOneBy({ id: payload.sid, userId: payload.sub }),
      this.permissions.findBy({ userId: payload.sub })
    ]);
    const now = Date.now();
    const idleTimeoutMs =
      this.config.getOrThrow<number>("SESSION_IDLE_TIMEOUT_SECONDS") * 1000;

    if (
      !user?.isActive ||
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.lastSeenAt.getTime() + idleTimeoutMs <= now ||
      (user.blockedUntil && user.blockedUntil.getTime() > now)
    ) {
      throw new UnauthorizedException("Votre session est absente ou a expiré.");
    }

    if (now - session.lastSeenAt.getTime() > 60_000) {
      await this.sessions.update(session.id, { lastSeenAt: new Date() });
    }

    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionId: session.id,
      mustChangePassword: user.mustChangePassword,
      permissions: permissions.map((permission) => ({
        code: permission.permissionCode,
        scopeType: permission.scopeType,
        scopeId: permission.scopeId
      }))
    };
    return true;
  }
}
