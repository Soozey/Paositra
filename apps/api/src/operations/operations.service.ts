import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Brackets, DataSource, Repository } from "typeorm";
import { paginated } from "../common/pagination.dto";
import type { AuthenticatedUser } from "../common/request-context";
import { Agency } from "../database/entities";
import { AuditService } from "../platform/audit.service";
import {
  AgencyQueryDto,
  CloseAgencyDto,
  CreateAgencyDto
} from "./operations.dto";

type ClientContext = { ipAddress: string | null; userAgent: string | null };

@Injectable()
export class OperationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Agency) private readonly agencies: Repository<Agency>,
    private readonly audit: AuditService
  ) {}

  async listAgencies(queryDto: AgencyQueryDto) {
    const query = this.agencies
      .createQueryBuilder("agency")
      .orderBy("agency.name", "ASC")
      .skip((queryDto.page - 1) * queryDto.pageSize)
      .take(queryDto.pageSize);
    if (queryDto.status) {
      query.andWhere("agency.status = :status", { status: queryDto.status });
    }
    if (queryDto.search?.trim()) {
      query.andWhere(
        new Brackets((builder) => {
          builder
            .where("agency.name ILIKE :search", {
              search: `%${queryDto.search!.trim()}%`
            })
            .orWhere("agency.code ILIKE :search", {
              search: `%${queryDto.search!.trim()}%`
            });
        })
      );
    }
    const [items, total] = await query.getManyAndCount();
    return paginated(items, total, queryDto.page, queryDto.pageSize);
  }

  async createAgency(
    dto: CreateAgencyDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    const agency = this.agencies.create({
      id: randomUUID(),
      code: dto.code.trim(),
      name: dto.name.trim(),
      zone: dto.zone?.trim() || null,
      parentOrgan: dto.parentOrgan?.trim() || null,
      cashMaxAmount: dto.cashMaxAmount ?? null,
      postalValueMaxAmount: dto.postalValueMaxAmount ?? null,
      foreignCurrencyMaxAmount: dto.foreignCurrencyMaxAmount ?? null,
      managerManagementStartDate: dto.managerManagementStartDate ?? null,
      status: "open",
      closedAt: null,
      closureReason: null,
      createdBy: actor.id
    });
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(agency);
        await this.audit.record(manager, {
          actorUserId: actor.id,
          sessionId: actor.sessionId,
          action: "operations.agency.created",
          objectType: "operations.agency",
          objectId: agency.id,
          afterState: this.agencyState(agency),
          ...context
        });
      });
      return agency;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictException("Ce code agence existe déjà.");
      }
      throw error;
    }
  }

  async closeAgency(
    id: string,
    dto: CloseAgencyDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    return this.dataSource.transaction(async (manager) => {
      const agency = await manager
        .getRepository(Agency)
        .createQueryBuilder("agency")
        .setLock("pessimistic_write")
        .where("agency.id = :id", { id })
        .getOne();
      if (!agency) {
        throw new NotFoundException("Agence introuvable.");
      }
      if (agency.version !== dto.version) {
        throw new ConflictException(
          "Cette agence a été modifiée par un autre utilisateur."
        );
      }
      if (agency.status !== "open") {
        throw new ConflictException("Cette agence est déjà fermée.");
      }
      const before = this.agencyState(agency);
      agency.status = "closed";
      agency.closedAt = new Date();
      agency.closureReason = dto.reason.trim();
      await manager.save(agency);
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "operations.agency.closed",
        objectType: "operations.agency",
        objectId: agency.id,
        beforeState: before,
        afterState: this.agencyState(agency),
        metadata: { reason: dto.reason.trim() },
        ...context
      });
      return agency;
    });
  }

  private agencyState(agency: Agency) {
    return {
      id: agency.id,
      code: agency.code,
      name: agency.name,
      zone: agency.zone,
      parentOrgan: agency.parentOrgan,
      cashMaxAmount: agency.cashMaxAmount,
      postalValueMaxAmount: agency.postalValueMaxAmount,
      foreignCurrencyMaxAmount: agency.foreignCurrencyMaxAmount,
      managerManagementStartDate: agency.managerManagementStartDate,
      status: agency.status,
      closedAt: agency.closedAt,
      closureReason: agency.closureReason,
      version: agency.version
    };
  }
}
