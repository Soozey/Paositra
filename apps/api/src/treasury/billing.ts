import {
  Body, ConflictException, Controller, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Query, Req, Res
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import {
  IsIn, IsInt, IsNumberString, IsOptional, IsString, Length, Matches, MaxLength, Min, MinLength
} from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildXlsx, buildPdf } from "../common/exporters";

export class CreateReceivableDto {
  @IsString() @MinLength(2) @MaxLength(240) debtorName!: string;
  @IsNumberString() amount!: string;
  @IsOptional() @IsString() @Length(3, 3) @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsString() issueDate!: string;
  @IsString() dueDate!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
export class RelanceDto {
  @IsString() @MinLength(2) @MaxLength(60) mode!: string;
  @IsString() @MinLength(3) @MaxLength(1000) comment!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class VirementDto {
  @IsString() @MinLength(1) @MaxLength(60) reference!: string;
  @IsNumberString() amount!: string;
  @IsString() @MinLength(2) @MaxLength(120) bank!: string;
  @IsString() valueDate!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class CloseReceivableDto {
  @IsIn(["cloturee", "contentieux"]) target!: "cloturee" | "contentieux";
  @IsString() @MinLength(3) @MaxLength(1000) comment!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class ReceivableQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

@ApiTags("Trésorerie — Créances")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class BillingController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService
  ) {}

  @Get("receivables")
  @RequirePermission("treasury:receivables:read")
  async list(@Query() q: ReceivableQueryDto) {
    const page = q.page ?? 1, pageSize = Math.min(q.pageSize ?? 50, 200);
    const where: string[] = []; const params: unknown[] = [];
    if (q.status) { params.push(q.status); where.push(`status = $${params.length}`); }
    if (q.search?.trim()) { params.push(`%${q.search.trim()}%`); where.push(`(debtor_name ILIKE $${params.length} OR reference ILIKE $${params.length})`); }
    const w = where.length ? "WHERE " + where.join(" AND ") : "";
    const totalRow = await this.dataSource.query(`SELECT count(*)::int AS c FROM treasury.receivables ${w}`, params);
    const total = totalRow[0].c;
    params.push(pageSize); params.push((page - 1) * pageSize);
    const items = await this.dataSource.query(
      `SELECT id, reference, debtor_name AS "debtorName", amount, currency, issue_date AS "issueDate",
              due_date AS "dueDate", status, description, settled_amount AS "settledAmount", version
       FROM treasury.receivables ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { items, total, page, pageSize };
  }

  @Get("receivables/report.xlsx")
  @RequirePermission("treasury:receivables:export")
  async reportXlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.dataSource.query(
      `SELECT reference, debtor_name AS d, amount, currency, issue_date AS i, due_date AS due, status,
              (due_date < $1 AND status NOT IN ('cloturee')) AS overdue FROM treasury.receivables ORDER BY due_date`,
      [today]
    );
    const buf = await buildXlsx("Etat des creances", [
      { header: "Référence", key: "reference", width: 16 },
      { header: "Débiteur", key: "d", width: 28 },
      { header: "Montant", key: "amount", width: 16 },
      { header: "Devise", key: "currency", width: 8 },
      { header: "Émission", key: "i", width: 13 },
      { header: "Échéance", key: "due", width: 13 },
      { header: "Statut", key: "status", width: 15 },
      { header: "En retard", key: "overdue", width: 10 }
    ], rows.map((r: Record<string, unknown>) => ({ ...r, overdue: r.overdue ? "OUI" : "" })),
      "[DÉMONSTRATION] État des créances — PAOSITRA");
    await this.audit.record(this.dataSource.manager, {
      actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.receivables.export.xlsx", objectType: "treasury.receivable",
      metadata: { count: rows.length }, ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="etat-creances-DEMO.xlsx"');
    res.end(buf);
  }

  @Get("receivables/virements.pdf")
  @RequirePermission("treasury:receivables:export")
  async virementsPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.dataSource.query(
      `SELECT r.reference, r.debtor_name AS d, e.metadata, e.occurred_at
       FROM treasury.receivable_events e JOIN treasury.receivables r ON r.id = e.receivable_id
       WHERE e.action = 'virement' ORDER BY e.occurred_at DESC`
    );
    const lines = rows.map((r: { reference: string; d: string; metadata: Record<string, unknown>; occurred_at: Date }) => [
      r.reference, r.d, String(r.metadata.bank ?? "-"),
      String(r.metadata.reference ?? "-"),
      Number(r.metadata.amount ?? 0).toLocaleString("fr-FR")
    ]);
    const buf = await buildPdf("État des virements reçus", "[DÉMONSTRATION] PAOSITRA — régularisations",
      lines, ["Créance", "Débiteur", "Banque", "Réf. virement", "Montant"]);
    await this.audit.record(this.dataSource.manager, {
      actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.receivables.export.pdf", objectType: "treasury.receivable",
      metadata: { count: lines.length }, ...requestMetadata(req)
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="virements-DEMO.pdf"');
    res.end(buf);
  }

  @Get("receivables/:id/events")
  @RequirePermission("treasury:receivables:read")
  async events(@Param("id", ParseUUIDPipe) id: string) {
    return this.dataSource.query(
      `SELECT id, action, comment, actor_user_id AS "actorUserId", occurred_at AS "occurredAt", metadata
       FROM treasury.receivable_events WHERE receivable_id = $1 ORDER BY occurred_at ASC`, [id]);
  }

  @Post("receivables")
  @RequirePermission("treasury:receivables:write")
  async create(@Body() dto: CreateReceivableDto, @Req() req: AuthenticatedRequest) {
    const actor = req.user!; const ctx = requestMetadata(req);
    return this.dataSource.transaction(async (m) => {
      const seq = await m.query("SELECT platform.next_transaction_sequence('receivable') AS n");
      const reference = `CRE-${new Date().getFullYear()}-${String(seq[0].n).padStart(5, "0")}`;
      const id = randomUUID();
      await m.query(
        `INSERT INTO treasury.receivables(id,reference,debtor_name,amount,currency,issue_date,due_date,status,description,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,'en_cours',$8,$9)`,
        [id, reference, dto.debtorName.trim(), dto.amount, (dto.currency ?? "MGA").toUpperCase(), dto.issueDate, dto.dueDate, dto.description ?? null, actor.id]
      );
      await m.query(`INSERT INTO treasury.receivable_events(id,receivable_id,action,comment,actor_user_id) VALUES($1,$2,'creation',$3,$4)`,
        [randomUUID(), id, "Création de la créance", actor.id]);
      await this.audit.record(m, { actorUserId: actor.id, sessionId: actor.sessionId,
        action: "treasury.receivable.created", objectType: "treasury.receivable", objectId: id,
        afterState: { reference, amount: dto.amount, status: "en_cours" }, ...ctx });
      return { id, reference, status: "en_cours" };
    });
  }

  private async transition(
    id: string, version: number, allowedFrom: string[], newStatus: string,
    action: string, comment: string, metadata: Record<string, unknown>,
    actor: { id: string; sessionId: string }, ctx: Record<string, unknown>,
    extraSet = "", extraParams: unknown[] = []
  ) {
    return this.dataSource.transaction(async (m) => {
      const rows = await m.query(`SELECT status, version FROM treasury.receivables WHERE id=$1 FOR UPDATE`, [id]);
      if (!rows.length) throw new NotFoundException("Créance introuvable.");
      if (rows[0].version !== version) throw new ConflictException("Cette créance a été modifiée entre-temps.");
      if (!allowedFrom.includes(rows[0].status))
        throw new ConflictException(`Transition impossible depuis le statut « ${rows[0].status} ».`);
      const params = [newStatus, ...extraParams, id];
      await m.query(
        `UPDATE treasury.receivables SET status=$1${extraSet}, version=version+1, updated_at=now() WHERE id=$${params.length}`,
        params
      );
      await m.query(`INSERT INTO treasury.receivable_events(id,receivable_id,action,comment,actor_user_id,metadata) VALUES($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), id, action, comment, actor.id, metadata]);
      await this.audit.record(m, { actorUserId: actor.id, sessionId: actor.sessionId,
        action: `treasury.receivable.${action}`, objectType: "treasury.receivable", objectId: id,
        beforeState: { status: rows[0].status }, afterState: { status: newStatus }, metadata, ...ctx });
      return { id, status: newStatus };
    });
  }

  @Post("receivables/:id/relance")
  @RequirePermission("treasury:receivables:write")
  async relance(@Param("id", ParseUUIDPipe) id: string, @Body() dto: RelanceDto, @Req() req: AuthenticatedRequest) {
    return this.transition(id, dto.version, ["en_cours", "relancee"], "relancee", "relance", dto.comment,
      { mode: dto.mode }, req.user!, requestMetadata(req));
  }

  @Post("receivables/:id/virement")
  @RequirePermission("treasury:receivables:write")
  async virement(@Param("id", ParseUUIDPipe) id: string, @Body() dto: VirementDto, @Req() req: AuthenticatedRequest) {
    return this.transition(id, dto.version, ["en_cours", "relancee"], "virement_recu", "virement",
      `Virement ${dto.reference}`, { reference: dto.reference, amount: dto.amount, bank: dto.bank, valueDate: dto.valueDate },
      req.user!, requestMetadata(req), ", settled_amount=$2", [dto.amount]);
  }

  @Post("receivables/:id/close")
  @RequirePermission("treasury:receivables:write")
  async close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CloseReceivableDto, @Req() req: AuthenticatedRequest) {
    return this.transition(id, dto.version, ["en_cours", "relancee", "virement_recu"], dto.target,
      dto.target === "contentieux" ? "contentieux" : "cloture", dto.comment, {}, req.user!, requestMetadata(req));
  }
}
