import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { catchError, from, Observable, of, switchMap, tap, throwError } from "rxjs";
import { DataSource } from "typeorm";
import type { AuthenticatedRequest } from "../common/request-context";
import { IdempotencyKey } from "../database/entities";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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

    return from(
      repository.findOneBy({
        actorUserId: request.user.id,
        route,
        idempotencyKey: key
      })
    ).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new ConflictException(
              "Cette clé d'idempotence a déjà été utilisée avec une autre demande."
            );
          }
          if (existing.state === "completed") {
            response.status(existing.responseStatus ?? 200);
            return of(existing.responseBody);
          }
          throw new ConflictException("Cette demande est déjà en cours.");
        }

        const record = repository.create({
          actorUserId: request.user.id,
          route,
          idempotencyKey: key,
          requestHash,
          state: "processing",
          responseStatus: null,
          responseBody: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        return from(repository.save(record)).pipe(
          switchMap(() =>
            next.handle().pipe(
              tap((body) => {
                void repository.update(
                  {
                    actorUserId: request.user.id,
                    route,
                    idempotencyKey: key
                  },
                  {
                    state: "completed",
                    responseStatus: response.statusCode,
                    responseBody: body
                  }
                );
              }),
              catchError((error) =>
                from(
                  repository.delete({
                    actorUserId: request.user.id,
                    route,
                    idempotencyKey: key
                  })
                ).pipe(switchMap(() => throwError(() => error)))
              )
            )
          )
        );
      })
    );
  }
}
