import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { defer, lastValueFrom, Observable } from "rxjs";
import { DataSource, LessThanOrEqual, Repository } from "typeorm";
import type { AuthenticatedRequest } from "../common/request-context";
import { IdempotencyKey } from "../database/entities";

const ACTIVE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILED_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return defer(() => this.execute(context, next));
  }

  private async execute(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse();
    const key = request.get("idempotency-key");
    if (!key || key.length > 200) {
      throw new BadRequestException(
        "Une clé Idempotency-Key valide est obligatoire pour cette action."
      );
    }

    const route = `${request.method} ${request.route.path}`;
    const requestHash = createHash("sha256")
      .update(JSON.stringify(request.body ?? {}))
      .digest("hex");
    const repository = this.dataSource.getRepository(IdempotencyKey);
    const selector = {
      actorUserId: request.user.id,
      route,
      idempotencyKey: key
    };
    const replay = await this.acquire(
      repository,
      selector,
      requestHash,
      new Date()
    );
    if (replay) {
      response.status(replay.status);
      return replay.body;
    }

    try {
      const body = await lastValueFrom(next.handle());
      await repository.update(selector, {
        state: "completed",
        responseStatus: response.statusCode,
        responseBody: body,
        failedAt: null,
        updatedAt: new Date()
      });
      return body;
    } catch (error) {
      const now = new Date();
      try {
        await repository.update(selector, {
          state: "failed",
          responseStatus: null,
          responseBody: () => "NULL",
          failedAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + FAILED_TTL_MS)
        });
      } catch {
        await repository.delete(selector).catch(() => undefined);
      }
      throw error;
    }
  }

  private async acquire(
    repository: Repository<IdempotencyKey>,
    selector: Pick<
      IdempotencyKey,
      "actorUserId" | "route" | "idempotencyKey"
    >,
    requestHash: string,
    now: Date
  ): Promise<{ status: number; body: unknown } | null> {
    const existing = await repository.findOneBy(selector);
    const expiresAt = new Date(now.getTime() + ACTIVE_TTL_MS);

    if (!existing) {
      try {
        await repository.insert({
          ...selector,
          requestHash,
          state: "processing",
          responseStatus: null,
          responseBody: () => "NULL",
          createdAt: now,
          updatedAt: now,
          failedAt: null,
          expiresAt
        });
        return null;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException("Cette demande est déjà en cours.");
        }
        throw error;
      }
    }

    if (existing.expiresAt.getTime() <= now.getTime()) {
      const result = await repository.update(
        {
          ...selector,
          state: existing.state,
          expiresAt: LessThanOrEqual(now)
        },
        {
          requestHash,
          state: "processing",
          responseStatus: null,
          responseBody: () => "NULL",
          failedAt: null,
          updatedAt: now,
          expiresAt
        }
      );
      if (result.affected !== 1) {
        throw new ConflictException("Cette demande est déjà en cours.");
      }
      return null;
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        "Cette clé d'idempotence a déjà été utilisée avec une autre demande."
      );
    }
    if (existing.state === "completed") {
      return {
        status: existing.responseStatus ?? 200,
        body: existing.responseBody
      };
    }
    if (existing.state === "failed") {
      const result = await repository.update(
        { ...selector, state: "failed" },
        {
          state: "processing",
          responseStatus: null,
          responseBody: () => "NULL",
          failedAt: null,
          updatedAt: now,
          expiresAt
        }
      );
      if (result.affected !== 1) {
        throw new ConflictException("Cette demande est déjà en cours.");
      }
      return null;
    }

    throw new ConflictException("Cette demande est déjà en cours.");
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
