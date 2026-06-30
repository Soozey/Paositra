import {
  Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Req, Res
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumberString, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildPdf } from "../common/exporters";

const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100];
function billetageTotal(b: Record<string, unknown>): number {
  return DENOMS.reduce((s, d) => s + d * (Number(b?.[String(d)]) || 0), 0);
}

function scopedCashAgencyIds(req: AuthenticatedRequest) {
  return [
    ...new Set(
      req.user.permissions
        .filter((permission) =>
          ["operations:cash:open", "operations:counters:read"].includes(permission.code) &&
          permission.scopeType === "agency" &&
          permission.scopeId
        )
        .map((permission) => permission.scopeId as string)
    )
  ];
}

function ensureCashScope(req: AuthenticatedRequest, agencyId: string, cashierUserId?: string) {
  const scopedAgencyIds = scopedCashAgencyIds(req);
  if (scopedAgencyIds.length === 0) return;
  if (!scopedAgencyIds.includes(agencyId)) {
    throw new ForbiddenException("Votre compte n'est pas rattaché à cette agence.");
  }
  if (cashierUserId && cashierUserId !== req.user.id) {
    throw new ForbiddenException("Vous ne pouvez accéder qu'à votre propre caisse.");
  }
}

export class OpenSessionDto {
  @IsString() agencyId!: string;
  @IsString() @MinLength(1) @MaxLength(80) registerLabel!: string;
  @IsString() businessDate!: string;
  @IsObject() billetage!: Record<string, number>;
}
export class AddOperationDto {
  @IsString() @MinLength(2) @MaxLength(120) opType!: string;
  @IsIn(["encaissement","decaissement"]) direction!: "encaissement"|"decaissement";
  @IsNumberString() amount!: string;
  @IsIn(["especes","cheque","credit"]) paymentMode!: string;
  @IsOptional() @IsString() @MaxLength(20) clientIdType?: string;
  @IsOptional() @IsString() @MaxLength(60) clientIdNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) reference?: string;
}
export class CancelOpDto { @IsString() @MinLength(3) @MaxLength(1000) reason!: string; }
export class CloseSessionDto { @IsObject() billetage!: Record<string, number>; @Type(()=>Number) @IsInt() @Min(1) version!: number; @IsOptional() @IsString() @MaxLength(1000) note?: string; }
export class ValidateDayDto { @IsIn(["valider","refuser"]) decision!: string; @IsOptional() @IsString() @MaxLength(1000) comment?: string; @Type(()=>Number) @IsInt() @Min(1) version!: number; }

@ApiTags("Opérations — Caisses")
@ApiBearerAuth()
@Controller("api/v1/operations")
export class CashController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get("cash/sessions")
  @RequirePermission("operations:counters:read")
  async sessions(@Req() req: AuthenticatedRequest) {
    const scopedAgencyIds = scopedCashAgencyIds(req);
    const where = scopedAgencyIds.length > 0 ? "WHERE s.agency_id = ANY($1::uuid[]) AND s.cashier_user_id = $2" : "";
    const params = scopedAgencyIds.length > 0 ? [scopedAgencyIds, req.user.id] : [];
    return { items: await this.ds.query(
      `SELECT s.id, s.register_label AS "registerLabel", s.business_date AS "businessDate", s.status,
              s.opening_amount AS "openingAmount", s.declared_amount AS "declaredAmount",
              s.counted_amount AS "countedAmount", s.ecart, s.cashier_note AS "cashierNote", s.version,
              a.name AS "agencyName", a.code AS "agencyCode"
       FROM operations.cash_sessions s JOIN operations.agencies a ON a.id=s.agency_id ${where} ORDER BY s.opened_at DESC`,
      params) };
  }

  @Get("cash/sessions/:id/operations")
  @RequirePermission("operations:counters:read")
  async operations(@Param("id", ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const session = await this.ds.query("SELECT agency_id, cashier_user_id FROM operations.cash_sessions WHERE id=$1", [id]);
    if (!session.length) throw new NotFoundException("Caisse introuvable.");
    ensureCashScope(req, session[0].agency_id, session[0].cashier_user_id);
    return this.ds.query(
      `SELECT id, code, op_type AS "opType", direction, amount, payment_mode AS "paymentMode",
              client_id_type AS "clientIdType", client_id_number AS "clientIdNumber", reference, status
       FROM operations.cash_operations WHERE session_id=$1 ORDER BY created_at`, [id]);
  }

  @Post("cash/open")
  @RequirePermission("operations:cash:open")
  async open(@Body() dto: OpenSessionDto, @Req() req: AuthenticatedRequest) {
    const amount = billetageTotal(dto.billetage);
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      ensureCashScope(req, dto.agencyId);
      const ag = await m.query("SELECT 1 FROM operations.agencies WHERE id=$1", [dto.agencyId]);
      if (!ag.length) throw new NotFoundException("Agence introuvable.");
      await m.query(
        `INSERT INTO operations.cash_sessions(id,agency_id,register_label,cashier_user_id,business_date,opening_amount,opening_billetage,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$4)`,
        [id, dto.agencyId, dto.registerLabel.trim(), req.user!.id, dto.businessDate, amount, JSON.stringify(dto.billetage)]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.cash.opened", objectType: "operations.cash_session", objectId: id,
        afterState: { openingAmount: amount }, ...requestMetadata(req) });
    });
    return { id, openingAmount: amount, status: "ouverte" };
  }

  @Post("cash/sessions/:id/operations")
  @RequirePermission("operations:cash:operate")
  async addOp(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AddOperationDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const s = await m.query("SELECT status, business_date, cashier_user_id, agency_id FROM operations.cash_sessions WHERE id=$1 FOR UPDATE", [id]);
      if (!s.length) throw new NotFoundException("Caisse introuvable.");
      ensureCashScope(req, s[0].agency_id, s[0].cashier_user_id);
      if (s[0].status !== "ouverte") throw new ConflictException("La caisse n'est pas ouverte.");
      if (s[0].cashier_user_id !== req.user!.id) throw new ForbiddenException("Vous ne pouvez opérer que sur votre propre caisse.");
      const ag = await m.query("SELECT code FROM operations.agencies WHERE id=$1", [s[0].agency_id]);
      const dateStr = new Date(s[0].business_date).toISOString().slice(0,10).replace(/-/g,"");
      const seq = await m.query("SELECT platform.next_transaction_sequence($1) AS n", ["cashop:"+dateStr+":"+s[0].agency_id]);
      const code = `LOT2-OP-${dateStr}-${(ag[0].code||"AG").replace(/[^A-Za-z0-9]/g,"").slice(0,10)}-${String(seq[0].n).padStart(4,"0")}`;
      const opId = randomUUID();
      await m.query(
        `INSERT INTO operations.cash_operations(id,session_id,code,op_type,direction,amount,payment_mode,client_id_type,client_id_number,reference,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [opId, id, code, dto.opType.trim(), dto.direction, dto.amount, dto.paymentMode,
         dto.clientIdType ?? null, dto.clientIdNumber ?? null, dto.reference ?? null, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.cash.operation.created", objectType: "operations.cash_operation", objectId: opId,
        afterState: { code, direction: dto.direction, amount: dto.amount }, ...requestMetadata(req) });
      return { id: opId, code, status: "active" };
    });
  }

  @Post("cash/operations/:opId/cancel")
  @RequirePermission("operations:cash:operate")
  async cancelOp(@Param("opId", ParseUUIDPipe) opId: string, @Body() dto: CancelOpDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const r = await m.query(
        `SELECT o.status, s.status AS sess, s.business_date, s.agency_id, s.cashier_user_id, o.created_by FROM operations.cash_operations o
         JOIN operations.cash_sessions s ON s.id=o.session_id WHERE o.id=$1 FOR UPDATE`, [opId]);
      if (!r.length) throw new NotFoundException("Opération introuvable.");
      ensureCashScope(req, r[0].agency_id, r[0].cashier_user_id);
      if (r[0].sess !== "ouverte") throw new ConflictException("Caisse clôturée ou validée : annulation impossible.");
      if (r[0].status !== "active") throw new ConflictException("Opération déjà annulée.");
      const today = new Date().toISOString().slice(0,10);
      if (new Date(r[0].business_date).toISOString().slice(0,10) !== today) throw new ConflictException("Annulation possible uniquement le jour même.");
      await m.query("UPDATE operations.cash_operations SET status='annulee', cancel_reason=$1 WHERE id=$2", [dto.reason.trim(), opId]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.cash.operation.cancelled", objectType: "operations.cash_operation", objectId: opId,
        beforeState: { status: "active" }, afterState: { status: "annulee" }, metadata: { reason: dto.reason }, ...requestMetadata(req) });
      return { id: opId, status: "annulee" };
    });
  }

  @Post("cash/sessions/:id/close")
  @RequirePermission("operations:cash:close")
  async close(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CloseSessionDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const s = await m.query("SELECT status, opening_amount, version, cashier_user_id, agency_id FROM operations.cash_sessions WHERE id=$1 FOR UPDATE", [id]);
      if (!s.length) throw new NotFoundException("Caisse introuvable.");
      ensureCashScope(req, s[0].agency_id, s[0].cashier_user_id);
      if (s[0].status !== "ouverte") throw new ConflictException("Seule une caisse ouverte peut être clôturée.");
      if (s[0].version !== dto.version) throw new ConflictException("Cette caisse a été modifiée entre-temps.");
      const mv = await m.query(
        `SELECT COALESCE(sum(CASE WHEN direction='encaissement' THEN amount ELSE -amount END),0) AS net
         FROM operations.cash_operations WHERE session_id=$1 AND status='active' AND payment_mode='especes'`, [id]);
      const expected = Number(s[0].opening_amount) + Number(mv[0].net);
      const counted = billetageTotal(dto.billetage);
      const ecart = counted - expected;
      await m.query(
        `UPDATE operations.cash_sessions SET status='fermee', closing_billetage=$1, declared_amount=$2,
         counted_amount=$3, ecart=$4, cashier_note=$5, closed_at=now(), version=version+1 WHERE id=$6`,
        [JSON.stringify(dto.billetage), expected, counted, ecart, dto.note?.trim() ?? null, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.cash.closed", objectType: "operations.cash_session", objectId: id,
        afterState: { expected, counted, ecart }, ...requestMetadata(req) });
      return { id, expected, counted, ecart, status: "fermee" };
    });
  }

  @Post("cash/sessions/:id/validate")
  @RequirePermission("operations:day:validate")
  async validateDay(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ValidateDayDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const s = await m.query("SELECT status, version FROM operations.cash_sessions WHERE id=$1 FOR UPDATE", [id]);
      if (!s.length) throw new NotFoundException("Caisse introuvable.");
      if (s[0].status !== "fermee") throw new ConflictException("Seule une caisse clôturée peut être validée/refusée.");
      if (s[0].version !== dto.version) throw new ConflictException("Cette caisse a été modifiée entre-temps.");
      const target = dto.decision === "valider" ? "validee" : "refusee";
      if (target === "refusee" && !dto.comment?.trim()) throw new ConflictException("Le motif de refus est obligatoire.");
      await m.query(
        `UPDATE operations.cash_sessions SET status=$1, validated_at=now(), validated_by=$2, validation_comment=$3, version=version+1 WHERE id=$4`,
        [target, req.user!.id, dto.comment?.trim() ?? null, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: `operations.cash.day.${target}`, objectType: "operations.cash_session", objectId: id,
        beforeState: { status: "fermee" }, afterState: { status: target }, metadata: dto.comment ? { comment: dto.comment } : {}, ...requestMetadata(req) });
      return { id, status: target };
    });
  }

  @Get("cash/sessions/ecarts")
  @RequirePermission("operations:verification:read")
  async sessionsWithEcart() {
    return { items: await this.ds.query(
      `SELECT s.id, s.register_label AS "registerLabel", s.business_date AS "businessDate", s.status,
              s.opening_amount AS "openingAmount", s.counted_amount AS "countedAmount",
              s.ecart, s.cashier_note AS "cashierNote", s.closed_at AS "closedAt",
              a.name AS "agencyName", a.code AS "agencyCode",
              u.display_name AS "cashierName"
       FROM operations.cash_sessions s
       JOIN operations.agencies a ON a.id = s.agency_id
       JOIN platform.users u ON u.id = s.cashier_user_id
       WHERE s.ecart IS NOT NULL AND s.ecart <> 0
       ORDER BY s.closed_at DESC NULLS LAST LIMIT 200`) };
  }

  @Get("cash/operations/:opId/ticket.pdf")
  @RequirePermission("operations:counters:read")
  async ticket(@Param("opId", ParseUUIDPipe) opId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const r = await this.ds.query(
      `SELECT o.code, o.op_type, o.direction, o.amount, o.payment_mode, o.created_at, a.name AS agency,
              s.agency_id, s.cashier_user_id
       FROM operations.cash_operations o JOIN operations.cash_sessions s ON s.id=o.session_id
       JOIN operations.agencies a ON a.id=s.agency_id WHERE o.id=$1`, [opId]);
    if (!r.length) throw new NotFoundException("Opération introuvable.");
    const o = r[0];
    ensureCashScope(req, o.agency_id, o.cashier_user_id);
    const buf = await buildPdf("Ticket d'opération", "[DOCUMENT DE DÉMONSTRATION] PAOSITRA — NON CONTRACTUEL",
      [["Code", o.code], ["Agence", o.agency], ["Type", o.op_type], ["Sens", o.direction],
       ["Montant", Number(o.amount).toLocaleString("fr-FR") + " MGA"], ["Mode", o.payment_mode]],
      ["Champ", "Valeur"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "operations.cash.ticket.export", objectType: "operations.cash_operation", objectId: opId, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ticket-${o.code}-DEMO.pdf"`);
    res.end(buf);
  }
}
