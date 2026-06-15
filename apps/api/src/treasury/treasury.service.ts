import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Brackets, DataSource, Repository } from "typeorm";
import type { AuthenticatedUser } from "../common/request-context";
import { paginated } from "../common/pagination.dto";
import {
  Institution,
  Placement,
  PlacementHistory
} from "../database/entities";
import { AuditService } from "../platform/audit.service";
import {
  CreateInstitutionDto,
  CreatePlacementDto,
  PlacementActionDto,
  PlacementQueryDto,
  UpdateInstitutionDto,
  UpdatePlacementDto
} from "./treasury.dto";

type ClientContext = { ipAddress: string | null; userAgent: string | null };

@Injectable()
export class TreasuryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Institution)
    private readonly institutions: Repository<Institution>,
    @InjectRepository(Placement)
    private readonly placements: Repository<Placement>,
    private readonly audit: AuditService
  ) {}

  async listInstitutions(page: number, pageSize: number, search?: string) {
    const query = this.institutions
      .createQueryBuilder("institution")
      .where("institution.archivedAt IS NULL")
      .orderBy("institution.name", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (search?.trim()) {
      query.andWhere("institution.name ILIKE :search", {
        search: `%${search.trim()}%`
      });
    }
    const [items, total] = await query.getManyAndCount();
    return paginated(items, total, page, pageSize);
  }

  async createInstitution(
    dto: CreateInstitutionDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    const institution = this.institutions.create({
      id: randomUUID(),
      name: dto.name.trim(),
      isActive: true,
      archivedAt: null
    });
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(institution);
        await this.audit.record(manager, {
          actorUserId: actor.id,
          sessionId: actor.sessionId,
          action: "treasury.institution.created",
          objectType: "treasury.institution",
          objectId: institution.id,
          afterState: this.institutionState(institution),
          ...context
        });
      });
      return institution;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Cette institution existe déjà.");
      }
      throw error;
    }
  }

  async updateInstitution(
    id: string,
    dto: UpdateInstitutionDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    return this.dataSource.transaction(async (manager) => {
      const institution = await manager
        .getRepository(Institution)
        .createQueryBuilder("institution")
        .setLock("pessimistic_write")
        .where("institution.id = :id", { id })
        .andWhere("institution.archivedAt IS NULL")
        .getOne();
      if (!institution) {
        throw new NotFoundException("Institution introuvable.");
      }
      if (institution.version !== dto.version) {
        throw new ConflictException(
          "Cette institution a été modifiée par un autre utilisateur."
        );
      }
      const before = this.institutionState(institution);
      institution.name = dto.name.trim();
      institution.isActive = dto.isActive;
      await manager.save(institution);
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "treasury.institution.updated",
        objectType: "treasury.institution",
        objectId: institution.id,
        beforeState: before,
        afterState: this.institutionState(institution),
        ...context
      });
      return institution;
    });
  }

  async listPlacements(queryDto: PlacementQueryDto) {
    const query = this.placements
      .createQueryBuilder("placement")
      .leftJoinAndSelect("placement.institution", "institution")
      .orderBy("placement.createdAt", "DESC")
      .skip((queryDto.page - 1) * queryDto.pageSize)
      .take(queryDto.pageSize);
    if (queryDto.institutionId) {
      query.andWhere("placement.institutionId = :institutionId", {
        institutionId: queryDto.institutionId
      });
    }
    if (queryDto.status) {
      query.andWhere("placement.status = :status", { status: queryDto.status });
    }
    if (queryDto.search?.trim()) {
      query.andWhere(
        new Brackets((builder) => {
          builder.where("institution.name ILIKE :search", {
            search: `%${queryDto.search!.trim()}%`
          });
        })
      );
    }
    const [items, total] = await query.getManyAndCount();
    return paginated(items, total, queryDto.page, queryDto.pageSize);
  }

  async createPlacement(
    dto: CreatePlacementDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    const institution = await this.institutions.findOneBy({
      id: dto.institutionId,
      isActive: true
    });
    if (!institution || institution.archivedAt) {
      throw new NotFoundException("Institution active introuvable.");
    }
    const placement = this.placements.create({
      id: randomUUID(),
      ...dto,
      currency: dto.currency.toUpperCase(),
      status: "open",
      cancellationReason: null,
      cancelledAt: null,
      closedAt: null,
      createdBy: actor.id
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.save(placement);
      await manager.save(manager.create(PlacementHistory, {
        id: randomUUID(),
        placementId: placement.id,
        action: "created",
        reason: null,
        actorUserId: actor.id,
        beforeState: null,
        afterState: this.placementState(placement)
      }));
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "treasury.placement.created",
        objectType: "treasury.placement",
        objectId: placement.id,
        afterState: this.placementState(placement),
        ...context
      });
    });
    return placement;
  }

  async updatePlacement(
    id: string,
    dto: UpdatePlacementDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    return this.changePlacement(id, dto.version, actor, context, async (placement, manager) => {
      if (placement.status !== "open") {
        throw new ConflictException(
          "Seul un placement ouvert peut être modifié."
        );
      }
      const institution = await manager.findOneBy(Institution, {
        id: dto.institutionId,
        isActive: true
      });
      if (!institution || institution.archivedAt) {
        throw new NotFoundException("Institution active introuvable.");
      }
      Object.assign(placement, {
        institutionId: dto.institutionId,
        principalAmount: dto.principalAmount,
        currency: dto.currency.toUpperCase(),
        annualInterestRate: dto.annualInterestRate,
        durationDays: dto.durationDays,
        depositMode: dto.depositMode,
        interestCalculationMode: dto.interestCalculationMode,
        startDate: dto.startDate
      });
      return { action: "updated", reason: null };
    });
  }

  async cancelPlacement(
    id: string,
    dto: PlacementActionDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    return this.changePlacement(id, dto.version, actor, context, async (placement) => {
      if (placement.status !== "open") {
        throw new ConflictException(
          "Seul un placement ouvert peut être annulé."
        );
      }
      placement.status = "cancelled";
      placement.cancellationReason = dto.reason.trim();
      placement.cancelledAt = new Date();
      return { action: "cancelled", reason: dto.reason.trim() };
    });
  }

  async closePlacement(
    id: string,
    dto: PlacementActionDto,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    return this.changePlacement(id, dto.version, actor, context, async (placement) => {
      if (placement.status !== "open") {
        throw new ConflictException(
          "Seul un placement ouvert peut être clôturé."
        );
      }
      placement.status = "closed";
      placement.closedAt = new Date();
      return { action: "closed", reason: dto.reason.trim() };
    });
  }

  private async changePlacement(
    id: string,
    version: number,
    actor: AuthenticatedUser,
    context: ClientContext,
    mutate: (
      placement: Placement,
      manager: import("typeorm").EntityManager
    ) => Promise<{ action: string; reason: string | null }>
  ) {
    return this.dataSource.transaction(async (manager) => {
      const placement = await manager
        .getRepository(Placement)
        .createQueryBuilder("placement")
        .setLock("pessimistic_write")
        .where("placement.id = :id", { id })
        .getOne();
      if (!placement) {
        throw new NotFoundException("Placement introuvable.");
      }
      if (placement.version !== version) {
        throw new ConflictException(
          "Ce placement a été modifié par un autre utilisateur."
        );
      }
      const before = this.placementState(placement);
      const result = await mutate(placement, manager);
      await manager.save(placement);
      const after = this.placementState(placement);
      await manager.save(manager.create(PlacementHistory, {
        id: randomUUID(),
        placementId: placement.id,
        action: result.action,
        reason: result.reason,
        actorUserId: actor.id,
        beforeState: before,
        afterState: after
      }));
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: `treasury.placement.${result.action}`,
        objectType: "treasury.placement",
        objectId: placement.id,
        beforeState: before,
        afterState: after,
        metadata: result.reason ? { reason: result.reason } : {},
        ...context
      });
      return placement;
    });
  }

  private institutionState(institution: Institution) {
    return {
      id: institution.id,
      name: institution.name,
      isActive: institution.isActive,
      version: institution.version
    };
  }

  private placementState(placement: Placement) {
    return {
      id: placement.id,
      institutionId: placement.institutionId,
      principalAmount: placement.principalAmount,
      currency: placement.currency,
      annualInterestRate: placement.annualInterestRate,
      durationDays: placement.durationDays,
      depositMode: placement.depositMode,
      interestCalculationMode: placement.interestCalculationMode,
      startDate: placement.startDate,
      status: placement.status,
      cancellationReason: placement.cancellationReason,
      cancelledAt: placement.cancelledAt,
      closedAt: placement.closedAt,
      version: placement.version
    };
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
}
