import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { EntityManager } from "typeorm";
import { AuditEvent } from "../database/entities";

export interface AuditInput {
  actorUserId: string | null;
  sessionId: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  async record(manager: EntityManager, input: AuditInput) {
    const event = manager.create(AuditEvent, {
      id: randomUUID(),
      actorUserId: input.actorUserId,
      sessionId: input.sessionId,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      metadata: input.metadata ?? {}
    });
    await manager.save(event);
  }
}
