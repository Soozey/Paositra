import {
  Body, ConflictException, Controller, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Req, Res
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

export class CreateVerificationDto {
  @IsString() agencyId!: string;
  @IsString() periodDate!: string;
  @IsNumberString() expectedBalance!: string;
  @IsNumberString() countedBalance!: string;
  @IsOptional() @IsString() @MaxLength(1000) justification?: string;
}
export class CreditAckDto {
  @IsString() @MinLength(2) @MaxLength(240) beneficiary!: string;
  @IsNumberString() amount!: string;
}
export class FundProvisionDto {
  @IsString() fromAgencyId!: string;
  @IsString() toAgencyId!: string;
  @IsNumberString() amount!: string;
}
export class FundActionDto { @IsOptional() @IsString() @MaxLength(1000) comment?: string; @Type(()=>Number) @IsInt() @Min(1) version!: number; }

@ApiTags("Opérations — Vérification")
@ApiBearerAuth()
@Controller("api/v1/operations")
export class VerificationController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get("verifications")
  @RequirePermission("operations:verification:read")
  async list() {
    return { items: await this.ds.query(
      `SELECT v.id, v.period_date AS "periodDate", v.expected_balance AS "expectedBalance",
              v.counted_balance AS "countedBalance", v.ecart, v.status, v.justification, a.name AS "agencyName"
       FROM operations.verifications v JOIN operations.agencies a ON a.id=v.agency_id ORDER BY v.created_at DESC`) };
  }

  @Post("verifications")
  @RequirePermission("operations:verification:validate")
  async create(@Body() dto: CreateVerificationDto, @Req() req: AuthenticatedRequest) {
    const expected = Number(dto.expectedBalance), counted = Number(dto.countedBalance);
    const ecart = counted - expected;
    const status = ecart === 0 ? "conforme" : ecart < 0 ? "deficit" : "excedent";
    if (status !== "conforme" && !dto.justification?.trim())
      throw new ConflictException("Une justification est obligatoire en cas d'écart (déficit ou excédent).");
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      const ag = await m.query("SELECT name FROM operations.agencies WHERE id=$1", [dto.agencyId]);
      if (!ag.length) throw new NotFoundException("Agence introuvable.");
      await m.query(
        `INSERT INTO operations.verifications(id,agency_id,period_date,expected_balance,counted_balance,ecart,status,justification,verifier_user_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, dto.agencyId, dto.periodDate, expected, counted, ecart, status, dto.justification?.trim() ?? null, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.verification.created", objectType: "operations.verification", objectId: id,
        afterState: { ecart, status }, ...requestMetadata(req) });
      if (ecart !== 0) {
        const signe = ecart < 0 ? "déficit" : "excédent";
        const montant = Math.abs(ecart).toLocaleString("fr-FR");
        await m.query(
          `INSERT INTO platform.notifications(id,user_id,type,message,object_type,object_id)
           VALUES($1,NULL,$2,$3,'operations.verification',$4)`,
          [randomUUID(), "anomalie_verification",
           `Anomalie vérification (${signe} ${montant} MGA) — ${ag[0].name} période ${dto.periodDate}`, id]);
      }
    });
    return { id, ecart, status };
  }

  @Post("verifications/:id/credit-ack")
  @RequirePermission("operations:verification:validate")
  async creditAck(@Param("id", ParseUUIDPipe) id: string, @Body() dto: CreditAckDto, @Req() req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const v = await m.query("SELECT agency_id FROM operations.verifications WHERE id=$1", [id]);
      if (!v.length) throw new NotFoundException("Vérification introuvable.");
      const seq = await m.query("SELECT platform.next_transaction_sequence('credit_ack') AS n");
      const number = `ACR-${new Date().getFullYear()}-${String(seq[0].n).padStart(5,"0")}`;
      const ackId = randomUUID();
      await m.query(
        `INSERT INTO operations.credit_acknowledgements(id,number,agency_id,beneficiary,amount,verification_id,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [ackId, number, v[0].agency_id, dto.beneficiary.trim(), dto.amount, id, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.credit_ack.created", objectType: "operations.credit_acknowledgement", objectId: ackId,
        afterState: { number, amount: dto.amount }, ...requestMetadata(req) });
      return { id: ackId, number };
    });
  }

  @Get("credit-ack/:id.pdf")
  @RequirePermission("operations:verification:read")
  async ackPdf(@Param("id") rawId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const id = rawId.replace(/\.pdf$/, "");
    const r = await this.ds.query(
      `SELECT c.number, c.beneficiary, c.amount, a.name AS agency, c.created_at
       FROM operations.credit_acknowledgements c JOIN operations.agencies a ON a.id=c.agency_id WHERE c.id=$1`, [id]);
    if (!r.length) throw new NotFoundException("Accusé introuvable.");
    const c = r[0];
    const buf = await buildPdf("Accusé de crédit", "[DOCUMENT DE DÉMONSTRATION] PAOSITRA — modèle non officiel — À VALIDER PAOMA",
      [["Numéro", c.number], ["Agence", c.agency], ["Bénéficiaire", c.beneficiary],
       ["Montant", Number(c.amount).toLocaleString("fr-FR") + " MGA"]],
      ["Champ", "Valeur"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "operations.credit_ack.export", objectType: "operations.credit_acknowledgement", objectId: id, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="accuse-credit-${c.number}-DEMO.pdf"`);
    res.end(buf);
  }

  @Get("verifications.xlsx")
  @RequirePermission("operations:verification:read")
  async xlsx(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const rows = await this.ds.query(
      `SELECT a.name AS agency, v.period_date AS d, v.expected_balance AS expected, v.counted_balance AS counted,
              v.ecart, v.status FROM operations.verifications v JOIN operations.agencies a ON a.id=v.agency_id ORDER BY v.created_at DESC`);
    const buf = await buildXlsx("Verifications", [
      { header: "Agence", key: "agency", width: 24 }, { header: "Période", key: "d", width: 13 },
      { header: "Attendu", key: "expected", width: 16 }, { header: "Constaté", key: "counted", width: 16 },
      { header: "Écart", key: "ecart", width: 14 }, { header: "Statut", key: "status", width: 12 }
    ], rows, "[DÉMONSTRATION] Grille de vérification — NON CONTRACTUEL");
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "operations.verification.export.xlsx", objectType: "operations.verification", metadata: { count: rows.length }, ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="verifications-DEMO.xlsx"');
    res.end(buf);
  }

  // ---- Mise à disposition de fonds (double validation) ----
  @Get("fund-provisions")
  @RequirePermission("operations:fund:manage")
  async fundList() {
    return { items: await this.ds.query(
      `SELECT f.id, f.reference, f.amount, f.status, f.version, f.comment,
              af.name AS "fromAgency", at.name AS "toAgency"
       FROM operations.fund_provisions f
       JOIN operations.agencies af ON af.id=f.from_agency_id
       JOIN operations.agencies at ON at.id=f.to_agency_id ORDER BY f.created_at DESC`) };
  }

  @Post("fund-provisions")
  @RequirePermission("operations:fund:manage")
  async fundCreate(@Body() dto: FundProvisionDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      const seq = await m.query("SELECT platform.next_transaction_sequence('fund_provision') AS n");
      const reference = `FND-${new Date().getFullYear()}-${String(seq[0].n).padStart(5,"0")}`;
      await m.query(
        `INSERT INTO operations.fund_provisions(id,reference,from_agency_id,to_agency_id,amount,requested_by)
         VALUES($1,$2,$3,$4,$5,$6)`, [id, reference, dto.fromAgencyId, dto.toAgencyId, dto.amount, req.user!.id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.fund.requested", objectType: "operations.fund_provision", objectId: id,
        afterState: { reference, amount: dto.amount }, ...requestMetadata(req) });
    });
    return { id, status: "demande" };
  }

  private async fundTransition(id: string, version: number, from: string[], to: string, action: string,
    req: AuthenticatedRequest, opts: { requireDifferentFromRequester?: boolean; setField?: string; comment?: string | null } = {}) {
    return this.ds.transaction(async (m) => {
      const r = await m.query("SELECT status, version, requested_by FROM operations.fund_provisions WHERE id=$1 FOR UPDATE", [id]);
      if (!r.length) throw new NotFoundException("Mise à disposition introuvable.");
      if (r[0].version !== version) throw new ConflictException("Cette demande a été modifiée entre-temps.");
      if (!from.includes(r[0].status)) throw new ConflictException(`Transition impossible depuis « ${r[0].status} ».`);
      if (opts.requireDifferentFromRequester && r[0].requested_by === req.user!.id)
        throw new ConflictException("La validation doit être effectuée par une personne différente du demandeur (double validation).");
      const set = opts.setField ? `, ${opts.setField}=$3` : "";
      const params: unknown[] = [to, id]; if (opts.setField) params.splice(2, 0, req.user!.id);
      await m.query(`UPDATE operations.fund_provisions SET status=$1${set}, comment=COALESCE($${params.length+1},comment), version=version+1, updated_at=now() WHERE id=$2`,
        [...params, opts.comment ?? null]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: `operations.fund.${action}`, objectType: "operations.fund_provision", objectId: id,
        beforeState: { status: r[0].status }, afterState: { status: to }, ...requestMetadata(req) });
      return { id, status: to };
    });
  }

  @Post("fund-provisions/:id/verify-balance") @RequirePermission("operations:fund:manage")
  fundVerify(@Param("id", ParseUUIDPipe) id: string, @Body() d: FundActionDto, @Req() r: AuthenticatedRequest) {
    return this.fundTransition(id, d.version, ["demande"], "solde_verifie", "balance_verified", r); }

  @Post("fund-provisions/:id/authorize") @RequirePermission("operations:fund:manage")
  fundAuthorize(@Param("id", ParseUUIDPipe) id: string, @Body() d: FundActionDto, @Req() r: AuthenticatedRequest) {
    return this.fundTransition(id, d.version, ["solde_verifie"], "autorise", "authorized", r,
      { requireDifferentFromRequester: true, setField: "authorized_by" }); }

  @Post("fund-provisions/:id/confirm") @RequirePermission("operations:fund:manage")
  fundConfirm(@Param("id", ParseUUIDPipe) id: string, @Body() d: FundActionDto, @Req() r: AuthenticatedRequest) {
    return this.fundTransition(id, d.version, ["autorise"], "confirme", "confirmed", r, { setField: "confirmed_by" }); }

  @Post("fund-provisions/:id/reject") @RequirePermission("operations:fund:manage")
  fundReject(@Param("id", ParseUUIDPipe) id: string, @Body() d: FundActionDto, @Req() r: AuthenticatedRequest) {
    if (!d.comment?.trim()) throw new ConflictException("Le motif de rejet est obligatoire.");
    return this.fundTransition(id, d.version, ["demande","solde_verifie","autorise"], "rejete", "rejected", r, { comment: d.comment.trim() }); }
}
