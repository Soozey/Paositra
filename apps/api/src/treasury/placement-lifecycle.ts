import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import { IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { Placement, PlacementHistory } from "../database/entities";
import { AuditService } from "../platform/audit.service";
import { buildXlsx, buildPdf } from "../common/exporters";
import { computeSimpleInterest, daysBetween, isMaturingSoon, type InterestBasis } from "./placement-math";

export class RenewPlacementDto {
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) durationDays?: number;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsNumberString() annualInterestRate?: string;
}
export class RepatriatePlacementDto {
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

function basisOf(mode: string): InterestBasis {
  return String(mode).includes("365") ? "365" : "360";
}

@ApiTags("Trésorerie")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class PlacementLifecycleController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Placement) private readonly placements: Repository<Placement>,
    private readonly audit: AuditService
  ) {}

  @Post("placements/:id/renew")
  @RequirePermission("treasury:placements:write")
  async renew(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RenewPlacementDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actor = req.user!;
    const ctx = requestMetadata(req);
    return this.dataSource.transaction(async (manager) => {
      const placement = await manager.getRepository(Placement).createQueryBuilder("p")
        .setLock("pessimistic_write").where("p.id = :id", { id }).getOne();
      if (!placement) throw new NotFoundException("Placement introuvable.");
      if (placement.version !== dto.version)
        throw new ConflictException("Ce placement a été modifié par un autre utilisateur.");
      if (placement.status !== "open")
        throw new ConflictException("Seul un placement ouvert peut être renouvelé.");
      const before = { ...placement };
      placement.status = "renewed";
      await manager.save(placement);
      const today = new Date().toISOString().slice(0, 10);
      const renewal = manager.create(Placement, {
        id: randomUUID(),
        institutionId: placement.institutionId,
        principalAmount: placement.principalAmount,
        currency: placement.currency,
        annualInterestRate: dto.annualInterestRate ?? placement.annualInterestRate,
        durationDays: dto.durationDays ?? placement.durationDays,
        depositMode: placement.depositMode,
        interestCalculationMode: placement.interestCalculationMode,
        startDate: dto.startDate ?? today,
        status: "open",
        cancellationReason: null,
        cancelledAt: null,
        closedAt: null,
        createdBy: actor.id
      });
      await manager.save(renewal);
      await manager.query("UPDATE treasury.placements SET renewed_from_id = $1 WHERE id = $2", [id, renewal.id]);
      await manager.save(manager.create(PlacementHistory, {
        id: randomUUID(), placementId: id, action: "renewed", reason: dto.reason,
        actorUserId: actor.id, beforeState: before, afterState: { status: "renewed", renewedToId: renewal.id }
      }));
      await manager.save(manager.create(PlacementHistory, {
        id: randomUUID(), placementId: renewal.id, action: "created", reason: dto.reason,
        actorUserId: actor.id, beforeState: null, afterState: { renewedFromId: id }
      }));
      await this.audit.record(manager, {
        actorUserId: actor.id, sessionId: actor.sessionId, action: "treasury.placement.renewed",
        objectType: "treasury.placement", objectId: id,
        beforeState: { status: "open" }, afterState: { status: "renewed", renewedToId: renewal.id },
        metadata: { reason: dto.reason }, ...ctx
      });
      return { previousId: id, renewal };
    });
  }

  @Post("placements/:id/repatriate")
  @RequirePermission("treasury:placements:write")
  async repatriate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RepatriatePlacementDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actor = req.user!;
    const ctx = requestMetadata(req);
    return this.dataSource.transaction(async (manager) => {
      const placement = await manager.getRepository(Placement).createQueryBuilder("p")
        .setLock("pessimistic_write").where("p.id = :id", { id }).getOne();
      if (!placement) throw new NotFoundException("Placement introuvable.");
      if (placement.version !== dto.version)
        throw new ConflictException("Ce placement a été modifié par un autre utilisateur.");
      if (placement.status !== "open")
        throw new ConflictException("Seul un placement ouvert peut être rapatrié.");
      const c = computeSimpleInterest({
        principal: Number(placement.principalAmount),
        annualRatePercent: Number(placement.annualInterestRate),
        durationDays: placement.durationDays,
        basis: basisOf(placement.interestCalculationMode),
        startDate: String(placement.startDate),
        currency: placement.currency
      });
      await manager.query(
        "UPDATE treasury.placements SET status='repatriated', repatriated_at=now(), repatriation_amount=$1, version=version+1, updated_at=now() WHERE id=$2",
        [c.total, id]
      );
      await manager.save(manager.create(PlacementHistory, {
        id: randomUUID(), placementId: id, action: "repatriated", reason: dto.reason,
        actorUserId: actor.id, beforeState: { status: "open" },
        afterState: { status: "repatriated", principal: c.principal, interest: c.interest, total: c.total }
      }));
      await this.audit.record(manager, {
        actorUserId: actor.id, sessionId: actor.sessionId, action: "treasury.placement.repatriated",
        objectType: "treasury.placement", objectId: id,
        beforeState: { status: "open" }, afterState: { status: "repatriated", total: c.total },
        metadata: { reason: dto.reason }, ...ctx
      });
      return { id, principal: c.principal, interest: c.interest, total: c.total, maturityDate: c.maturityDate };
    });
  }

  @Get("placements/report.xlsx")
  @RequirePermission("treasury:placements:export")
  async reportXlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const list = await this.placements.find({ relations: { institution: true }, order: { createdAt: "DESC" } });
    const today = new Date().toISOString().slice(0, 10);
    const rows = list.map((p) => {
      const c = computeSimpleInterest({
        principal: Number(p.principalAmount), annualRatePercent: Number(p.annualInterestRate),
        durationDays: p.durationDays, basis: basisOf(p.interestCalculationMode),
        startDate: String(p.startDate), currency: p.currency
      });
      return {
        institution: p.institution?.name ?? p.institutionId, currency: p.currency,
        principal: c.principal, rate: Number(p.annualInterestRate), days: p.durationDays,
        basis: basisOf(p.interestCalculationMode), start: String(p.startDate), maturity: c.maturityDate,
        interest: c.interest, total: c.total, status: p.status
      };
    });
    const buf = await buildXlsx("Situation placements", [
      { header: "Institution", key: "institution", width: 26 },
      { header: "Devise", key: "currency", width: 8 },
      { header: "Capital", key: "principal", width: 18 },
      { header: "Taux %", key: "rate", width: 9 },
      { header: "Durée (j)", key: "days", width: 10 },
      { header: "Base", key: "basis", width: 8 },
      { header: "Début", key: "start", width: 13 },
      { header: "Échéance", key: "maturity", width: 13 },
      { header: "Intérêts", key: "interest", width: 16 },
      { header: "Total", key: "total", width: 18 },
      { header: "Statut", key: "status", width: 13 }
    ], rows, "[DÉMONSTRATION] Situation des placements — PAOSITRA");
    await this.audit.record(this.dataSource.manager, {
      actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.placements.export.xlsx", objectType: "treasury.placement",
      metadata: { count: rows.length }, ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="situation-placements-DEMO.xlsx"');
    res.end(buf);
  }

  @Get("placements/echeancier.pdf")
  @RequirePermission("treasury:placements:export")
  async echeancierPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const open = await this.placements.find({ where: { status: "open" }, relations: { institution: true } });
    const today = new Date().toISOString().slice(0, 10);
    const lines = open.map((p) => {
      const c = computeSimpleInterest({
        principal: Number(p.principalAmount), annualRatePercent: Number(p.annualInterestRate),
        durationDays: p.durationDays, basis: basisOf(p.interestCalculationMode),
        startDate: String(p.startDate), currency: p.currency
      });
      const dr = daysBetween(today, c.maturityDate);
      return [
        p.institution?.name ?? "-", c.maturityDate, String(dr) + " j",
        isMaturingSoon(c.maturityDate, today, 15) ? "ÉCHÉANCE PROCHE" : "",
        c.total.toLocaleString("fr-FR") + " " + p.currency
      ];
    });
    const buf = await buildPdf(
      "Échéancier des placements", "[DÉMONSTRATION] PAOSITRA — placements ouverts au " + today,
      lines, ["Institution", "Échéance", "Restant", "Alerte", "Capital+Intérêts"]
    );
    await this.audit.record(this.dataSource.manager, {
      actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.placements.export.pdf", objectType: "treasury.placement",
      metadata: { count: lines.length }, ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="echeancier-placements-DEMO.pdf"');
    res.end(buf);
  }
}
