import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
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
  CreateAgencyDto,
  ValidateAgencyDto
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
    if (queryDto.sourceType) {
      query.andWhere("agency.sourceType = :sourceType", { sourceType: queryDto.sourceType });
    }
    if (queryDto.validationStatus) {
      query.andWhere("agency.validationStatus = :validationStatus", { validationStatus: queryDto.validationStatus });
    }
    if (queryDto.region) {
      query.andWhere("agency.region ILIKE :region", { region: `%${queryDto.region}%` });
    }
    if (queryDto.type) {
      query.andWhere("agency.type = :type", { type: queryDto.type });
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
            })
            .orWhere("agency.codique ILIKE :search", {
              search: `%${queryDto.search!.trim()}%`
            });
        })
      );
    }
    const [items, total] = await query.getManyAndCount();
    return paginated(items, total, queryDto.page, queryDto.pageSize);
  }

  async exportAgencies(): Promise<string> {
    const agencies = await this.agencies.find({ order: { name: "ASC" } });
    const header = [
      "id", "code", "name", "type", "region", "district", "commune", "city",
      "codique", "public_code", "status", "source_type", "validation_status",
      "source_name", "source_note", "latitude", "longitude"
    ].join(",");
    const rows = agencies.map((a) =>
      [
        a.id, a.code, `"${(a.name ?? "").replace(/"/g, '""')}"`,
        a.type ?? "", a.region ?? "", a.district ?? "", a.commune ?? "", a.city ?? "",
        a.codique ?? "", a.publicCode ?? "", a.status,
        a.sourceType, a.validationStatus,
        `"${(a.sourceName ?? "").replace(/"/g, '""')}"`,
        `"${(a.sourceNote ?? "").replace(/"/g, '""')}"`,
        a.latitude ?? "", a.longitude ?? ""
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }

  async importAgencies(
    file: MulterFile,
    actor: AuthenticatedUser,
    context: ClientContext
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException("Fichier CSV requis.");
    }
    const lines = file.buffer.toString("utf-8").split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      throw new BadRequestException("Le fichier CSV doit contenir un en-tête et au moins une ligne.");
    }
    const [headerLine, ...dataLines] = lines;
    const headers = headerLine!.split(",").map((h) => h.trim());
    const get = (row: string[], key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (row[idx] ?? "").replace(/^"|"$/g, "").trim() : "";
    };
    const created: Agency[] = [];
    for (const line of dataLines) {
      const row = line.split(",");
      const code = get(row, "code");
      const name = get(row, "name");
      if (!code || !name) continue;
      const agency = this.agencies.create({
        id: randomUUID(),
        code,
        name,
        type: get(row, "type") || null,
        region: get(row, "region") || null,
        district: get(row, "district") || null,
        commune: get(row, "commune") || null,
        city: get(row, "city") || null,
        codique: get(row, "codique") || null,
        publicCode: get(row, "public_code") || null,
        sourceType: get(row, "source_type") || "demo_only",
        sourceName: get(row, "source_name") || null,
        sourceNote: get(row, "source_note") || null,
        validationStatus: "to_validate",
        status: "open",
        createdBy: actor.id
      });
      await this.dataSource.transaction(async (manager) => {
        await manager.save(agency);
        await this.audit.record(manager, {
          actorUserId: actor.id,
          sessionId: actor.sessionId,
          action: "operations.agency.imported",
          objectType: "operations.agency",
          objectId: agency.id,
          afterState: { id: agency.id, code: agency.code, name: agency.name, sourceType: agency.sourceType },
          metadata: { importSource: "csv" },
          ...context
        });
      });
      created.push(agency);
    }
    return { imported: created.length, agencies: created.map((a) => ({ id: a.id, code: a.code, name: a.name })) };
  }

  async validateAgency(
    id: string,
    dto: ValidateAgencyDto,
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
      if (!agency) throw new NotFoundException("Agence introuvable.");
      if (agency.version !== dto.version) {
        throw new ConflictException("Cette agence a été modifiée par un autre utilisateur.");
      }
      const before = this.agencyState(agency);
      agency.validationStatus = "validated";
      agency.validatedBy = actor.id;
      agency.validatedAt = new Date();
      await manager.save(agency);
      await this.audit.record(manager, {
        actorUserId: actor.id,
        sessionId: actor.sessionId,
        action: "operations.agency.validated",
        objectType: "operations.agency",
        objectId: agency.id,
        beforeState: before,
        afterState: this.agencyState(agency),
        ...context
      });
      return agency;
    });
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
      sourceType: agency.sourceType,
      validationStatus: agency.validationStatus,
      closedAt: agency.closedAt,
      closureReason: agency.closureReason,
      version: agency.version
    };
  }
}
