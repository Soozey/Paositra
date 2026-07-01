import {
  Body, ConflictException, Controller, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Query, Req, Res, UseInterceptors
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import { IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildXlsx, buildPdf } from "../common/exporters";
import { IdempotencyInterceptor } from "../platform/idempotency.interceptor";

const ENGAGED = ['soumis','en_verification','valide','paye','archive'];

export class CreateExerciseDto { @Type(()=>Number) @IsInt() @Min(2000) year!: number; @IsString() @MinLength(2) @MaxLength(160) label!: string; }
export class CreateLineDto {
  @IsString() exerciseId!: string;
  @IsOptional() @IsString() budgetVersionId?: string;
  @IsString() @MinLength(2) @MaxLength(160) direction!: string;
  @IsString() @MinLength(1) @MaxLength(160) program!: string;
  @IsString() @MinLength(1) @MaxLength(40) accountCode!: string;
  @IsString() @MinLength(2) @MaxLength(240) label!: string;
  @IsNumberString() allocatedAmount!: string;
}
export class CreateBudgetVersionDto {
  @IsString() exerciseId!: string;
  @IsString() @MinLength(2) @MaxLength(160) label!: string;
  @IsOptional() @IsString() sourceVersionId?: string;
  @IsOptional() @IsString() @MaxLength(1000) justification?: string;
}
export class CreateEngagementDto {
  @IsString() lineId!: string;
  @IsString() @MinLength(2) object!: string;
  @IsString() @MinLength(2) @MaxLength(60) marketType!: string;
  @IsNumberString() amount!: string;
}
export class TransitionDto { @IsOptional() @IsString() @MaxLength(1000) comment?: string; @Type(()=>Number) @IsInt() @Min(1) version!: number; }

@ApiTags("Trésorerie — Budget ELO-P")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class BudgetController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get("budget/exercises")
  @RequirePermission("treasury:budget:read")
  async exercises() { return { items: await this.ds.query(
    `SELECT id, year, label, status FROM treasury.budget_exercises ORDER BY year DESC`) }; }

  @Post("budget/exercises")
  @RequirePermission("treasury:budget:manage")
  async createExercise(@Body() dto: CreateExerciseDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      await m.query("INSERT INTO treasury.budget_exercises(id,year,label,created_by) VALUES($1,$2,$3,$4)",
        [id, dto.year, dto.label.trim(), req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.budget.exercise.created", objectType: "treasury.budget_exercise", objectId: id,
        afterState: { year: dto.year }, ...requestMetadata(req) });
    });
    return { id };
  }

  @Get("budget/versions")
  @RequirePermission("treasury:budget:read")
  async versions(@Query("exerciseId") exerciseId?: string) {
    if (!exerciseId) return { items: [] };
    return { items: await this.ds.query(`SELECT id,version_number AS "versionNumber",label,status,justification,
      created_at AS "createdAt",activated_at AS "activatedAt",version
      FROM treasury.budget_versions WHERE exercise_id=$1 ORDER BY version_number DESC`, [exerciseId]) };
  }

  @Post("budget/versions")
  @RequirePermission("treasury:budget:manage")
  @UseInterceptors(IdempotencyInterceptor)
  async createVersion(@Body() dto: CreateBudgetVersionDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const exercise = await m.query("SELECT status FROM treasury.budget_exercises WHERE id=$1 FOR UPDATE", [dto.exerciseId]);
      if (!exercise.length || exercise[0].status !== "ouvert") throw new NotFoundException("Exercice budgetaire ouvert introuvable.");
      if (dto.sourceVersionId) {
        const source = await m.query("SELECT 1 FROM treasury.budget_versions WHERE id=$1 AND exercise_id=$2", [dto.sourceVersionId, dto.exerciseId]);
        if (!source.length) throw new NotFoundException("Version source introuvable pour cet exercice.");
      }
      const numberRows = await m.query("SELECT COALESCE(max(version_number),0)+1 AS n FROM treasury.budget_versions WHERE exercise_id=$1", [dto.exerciseId]);
      const id = randomUUID(); const versionNumber = Number(numberRows[0].n);
      await m.query(`INSERT INTO treasury.budget_versions(id,exercise_id,version_number,label,justification,created_by)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, dto.exerciseId, versionNumber, dto.label.trim(), dto.justification?.trim() || null, req.user!.id]);
      if (dto.sourceVersionId) {
        await m.query(`INSERT INTO treasury.budget_lines(id,exercise_id,budget_version_id,direction,program,account_code,label,allocated_amount,created_by)
          SELECT gen_random_uuid(),exercise_id,$1,direction,program,account_code,label,allocated_amount,$2
          FROM treasury.budget_lines WHERE budget_version_id=$3`, [id, req.user!.id, dto.sourceVersionId]);
      }
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.budget.version.created", objectType: "treasury.budget_version", objectId: id,
        afterState: { exerciseId: dto.exerciseId, versionNumber, sourceVersionId: dto.sourceVersionId ?? null }, ...requestMetadata(req) });
      return { id, versionNumber, status: "brouillon" };
    });
  }

  @Post("budget/versions/:id/activate")
  @RequirePermission("treasury:budget:validate")
  @UseInterceptors(IdempotencyInterceptor)
  async activateVersion(@Param("id", ParseUUIDPipe) id: string, @Body() dto: TransitionDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const rows = await m.query("SELECT exercise_id,status,version FROM treasury.budget_versions WHERE id=$1 FOR UPDATE", [id]);
      if (!rows.length) throw new NotFoundException("Version budgetaire introuvable.");
      if (rows[0].version !== dto.version) throw new ConflictException("Cette version a ete modifiee entre-temps.");
      if (rows[0].status !== "brouillon") throw new ConflictException("Seule une version brouillon peut etre activee.");
      await m.query("UPDATE treasury.budget_versions SET status='archivee',version=version+1 WHERE exercise_id=$1 AND status='active'", [rows[0].exercise_id]);
      await m.query("UPDATE treasury.budget_versions SET status='active',activated_by=$1,activated_at=now(),version=version+1 WHERE id=$2", [req.user!.id, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.budget.version.activated", objectType: "treasury.budget_version", objectId: id,
        beforeState: { status: "brouillon" }, afterState: { status: "active" }, metadata: { comment: dto.comment ?? null }, ...requestMetadata(req) });
      return { id, status: "active" };
    });
  }

  @Get("budget/lines")
  @RequirePermission("treasury:budget:read")
  async lines(@Query("exerciseId") exerciseId?: string, @Query("versionId") versionId?: string) {
    const params: unknown[] = []; let w = "";
    if (exerciseId) { params.push(exerciseId); w = "WHERE l.exercise_id = $1"; }
    if (versionId) { params.push(versionId); w += `${w ? " AND" : "WHERE"} l.budget_version_id = $${params.length}`; }
    return { items: await this.ds.query(
      `SELECT l.id, l.direction, l.program, l.account_code AS "accountCode", l.label,
              l.allocated_amount AS "allocated",
              COALESCE((SELECT sum(amount) FROM treasury.engagements e WHERE e.line_id=l.id AND e.status = ANY($${params.length+1})),0) AS "engaged",
              l.allocated_amount - COALESCE((SELECT sum(amount) FROM treasury.engagements e WHERE e.line_id=l.id AND e.status = ANY($${params.length+1})),0) AS "available"
       FROM treasury.budget_lines l ${w} ORDER BY l.direction, l.program`,
      [...params, ENGAGED]) };
  }

  @Post("budget/lines")
  @RequirePermission("treasury:budget:manage")
  async createLine(@Body() dto: CreateLineDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      const ex = await m.query("SELECT 1 FROM treasury.budget_exercises WHERE id=$1 AND status='ouvert'", [dto.exerciseId]);
      if (!ex.length) throw new NotFoundException("Exercice budgétaire ouvert introuvable.");
      if (dto.budgetVersionId) {
        const version = await m.query("SELECT 1 FROM treasury.budget_versions WHERE id=$1 AND exercise_id=$2 AND status='brouillon'", [dto.budgetVersionId, dto.exerciseId]);
        if (!version.length) throw new ConflictException("Ajoutez les lignes uniquement dans une version brouillon de cet exercice.");
      }
      await m.query(`INSERT INTO treasury.budget_lines(id,exercise_id,budget_version_id,direction,program,account_code,label,allocated_amount,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, dto.exerciseId, dto.budgetVersionId ?? null, dto.direction.trim(), dto.program.trim(), dto.accountCode.trim(), dto.label.trim(), dto.allocatedAmount, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.budget.line.created", objectType: "treasury.budget_line", objectId: id,
        afterState: { allocated: dto.allocatedAmount }, ...requestMetadata(req) });
    });
    return { id };
  }

  @Get("engagements")
  @RequirePermission("treasury:budget:read")
  async engagements(@Query("status") status?: string) {
    const p: unknown[] = []; let w = "";
    if (status) { p.push(status); w = "WHERE e.status=$1"; }
    return { items: await this.ds.query(
      `SELECT e.id, e.reference, e.object, e.market_type AS "marketType", e.amount, e.status, e.version,
              l.label AS "lineLabel", l.direction FROM treasury.engagements e
       JOIN treasury.budget_lines l ON l.id=e.line_id ${w} ORDER BY e.created_at DESC`, p) };
  }

  @Get("engagements/:id/events")
  @RequirePermission("treasury:budget:read")
  async events(@Param("id", ParseUUIDPipe) id: string) {
    return this.ds.query(`SELECT action, comment, occurred_at AS "occurredAt", metadata
      FROM treasury.engagement_events WHERE engagement_id=$1 ORDER BY occurred_at`, [id]);
  }

  @Post("engagements")
  @RequirePermission("treasury:budget:manage")
  async createEngagement(@Body() dto: CreateEngagementDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const line = await m.query("SELECT exercise_id FROM treasury.budget_lines WHERE id=$1", [dto.lineId]);
      if (!line.length) throw new NotFoundException("Ligne de crédit introuvable.");
      const id = randomUUID();
      const seq = await m.query("SELECT platform.next_transaction_sequence('engagement') AS n");
      const reference = `ENG-${new Date().getFullYear()}-${String(seq[0].n).padStart(5,"0")}`;
      await m.query(`INSERT INTO treasury.engagements(id,reference,exercise_id,line_id,object,market_type,amount,status,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,'brouillon',$8)`,
        [id, reference, line[0].exercise_id, dto.lineId, dto.object.trim(), dto.marketType.trim(), dto.amount, req.user!.id]);
      await m.query(`INSERT INTO treasury.engagement_events(id,engagement_id,action,comment,actor_user_id) VALUES($1,$2,'creation',$3,$4)`,
        [randomUUID(), id, "Création du dossier", req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "treasury.engagement.created", objectType: "treasury.engagement", objectId: id,
        afterState: { reference, amount: dto.amount }, ...requestMetadata(req) });
      return { id, reference, status: "brouillon" };
    });
  }

  private async transition(id: string, version: number, from: string[], to: string, action: string,
    comment: string | null, actor: { id: string; sessionId: string }, ctx: Record<string, unknown>, checkCredit = false) {
    return this.ds.transaction(async (m) => {
      const rows = await m.query("SELECT status, version, line_id, amount FROM treasury.engagements WHERE id=$1 FOR UPDATE", [id]);
      if (!rows.length) throw new NotFoundException("Dossier d'engagement introuvable.");
      if (rows[0].version !== version) throw new ConflictException("Ce dossier a été modifié entre-temps.");
      if (!from.includes(rows[0].status)) throw new ConflictException(`Transition impossible depuis « ${rows[0].status} ».`);
      if (checkCredit) {
        const r = await m.query(
          `SELECT l.allocated_amount - COALESCE((SELECT sum(amount) FROM treasury.engagements e
             WHERE e.line_id=l.id AND e.status = ANY($2) AND e.id<>$3),0) AS available
           FROM treasury.budget_lines l WHERE l.id=$1`, [rows[0].line_id, ENGAGED, id]);
        if (Number(r[0].available) < Number(rows[0].amount))
          throw new ConflictException("Ce montant dépasse le crédit disponible sur la ligne budgétaire.");
      }
      await m.query("UPDATE treasury.engagements SET status=$1, version=version+1, updated_at=now() WHERE id=$2", [to, id]);
      await m.query(`INSERT INTO treasury.engagement_events(id,engagement_id,action,comment,actor_user_id) VALUES($1,$2,$3,$4,$5)`,
        [randomUUID(), id, action, comment, actor.id]);
      await this.audit.record(m, { actorUserId: actor.id, sessionId: actor.sessionId,
        action: `treasury.engagement.${action}`, objectType: "treasury.engagement", objectId: id,
        beforeState: { status: rows[0].status }, afterState: { status: to }, metadata: comment ? { comment } : {}, ...ctx });
      return { id, status: to };
    });
  }

  @Post("engagements/:id/submit") @RequirePermission("treasury:budget:manage")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    return this.transition(id, d.version, ["brouillon"], "soumis", "soumission", d.comment ?? null, r.user!, requestMetadata(r), true); }

  @Post("engagements/:id/verify") @RequirePermission("treasury:budget:manage")
  verify(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    return this.transition(id, d.version, ["soumis"], "en_verification", "verification", d.comment ?? null, r.user!, requestMetadata(r)); }

  @Post("engagements/:id/validate") @RequirePermission("treasury:budget:validate")
  validate(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    return this.transition(id, d.version, ["en_verification"], "valide", "validation", d.comment ?? null, r.user!, requestMetadata(r)); }

  @Post("engagements/:id/reject") @RequirePermission("treasury:budget:validate")
  reject(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    if (!d.comment?.trim()) throw new ConflictException("Le motif de rejet est obligatoire.");
    return this.transition(id, d.version, ["soumis","en_verification"], "rejete", "rejet", d.comment.trim(), r.user!, requestMetadata(r)); }

  @Post("engagements/:id/pay") @RequirePermission("treasury:budget:manage")
  pay(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    return this.transition(id, d.version, ["valide"], "paye", "paiement", d.comment ?? null, r.user!, requestMetadata(r)); }

  @Post("engagements/:id/archive") @RequirePermission("treasury:budget:manage")
  archive(@Param("id", ParseUUIDPipe) id: string, @Body() d: TransitionDto, @Req() r: AuthenticatedRequest) {
    return this.transition(id, d.version, ["paye"], "archive", "archivage", d.comment ?? null, r.user!, requestMetadata(r)); }

  @Get("budget-credits.xlsx")
  @RequirePermission("treasury:budget:read")
  async creditsXlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT l.direction, l.program, l.account_code AS code, l.allocated_amount AS allocated,
              COALESCE((SELECT sum(amount) FROM treasury.engagements e WHERE e.line_id=l.id AND e.status = ANY($1)),0) AS engaged,
              l.allocated_amount - COALESCE((SELECT sum(amount) FROM treasury.engagements e WHERE e.line_id=l.id AND e.status = ANY($1)),0) AS available
       FROM treasury.budget_lines l ORDER BY l.direction, l.program`, [ENGAGED]);
    const buf = await buildXlsx("Situation credits", [
      { header: "Direction", key: "direction", width: 22 }, { header: "Programme", key: "program", width: 20 },
      { header: "Compte", key: "code", width: 12 }, { header: "Ouvert", key: "allocated", width: 16 },
      { header: "Engagé", key: "engaged", width: 16 }, { header: "Disponible", key: "available", width: 16 }
    ], rows, "[DÉMONSTRATION] Situation des crédits — NON CONTRACTUEL");
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.budget.export.xlsx", objectType: "treasury.budget_line", metadata: { count: rows.length }, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="situation-credits-DEMO.xlsx"');
    res.end(buf);
  }

  @Get("engagement-bordereau.pdf")
  @RequirePermission("treasury:budget:read")
  async bordereauPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT reference, object, market_type AS m, amount, status FROM treasury.engagements ORDER BY created_at DESC`);
    const lines = rows.map((r: { reference: string; object: string; m: string; amount: string; status: string }) =>
      [r.reference, r.object.slice(0,40), r.m, Number(r.amount).toLocaleString("fr-FR"), r.status]);
    const buf = await buildPdf("Bordereau des engagements", "[DÉMONSTRATION] PAOSITRA — circuit ELO-P provisoire — NON CONTRACTUEL",
      lines, ["Référence", "Objet", "Marché", "Montant", "Statut"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.budget.export.pdf", objectType: "treasury.engagement", metadata: { count: rows.length }, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="bordereau-engagements-DEMO.pdf"');
    res.end(buf);
  }
}
