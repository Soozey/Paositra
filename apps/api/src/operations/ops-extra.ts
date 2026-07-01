import {
  Body, ConflictException, Controller, Get, NotFoundException,
  Param, ParseUUIDPipe, Post, Req, Res
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsNumberString, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildPdf } from "../common/exporters";

export class ValueRequestDto {
  @IsString() fromAgencyId!: string;
  @IsString() toAgencyId!: string;
  @IsIn(["G59","G60"]) valueType!: string;
  @IsNumberString() amount!: string;
}
export class VrActionDto { @IsOptional() @IsString() @MaxLength(1000) comment?: string; @Type(()=>Number) @IsInt() @Min(1) version!: number; }

@ApiTags("Plateforme — Notifications")
@ApiBearerAuth()
@Controller("api/v1/platform")
export class NotificationsController {
  constructor(private readonly ds: DataSource) {}

  @Get("notifications")
  @RequirePermission("platform:notifications:read")
  async list(@Req() req: AuthenticatedRequest) {
    const persisted = await this.ds.query(
      `SELECT id, type, message, object_type AS "objectType", object_id AS "objectId", is_read AS "isRead", created_at AS "createdAt"
       FROM platform.notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY is_read ASC, created_at DESC LIMIT 50`, [req.user!.id]);
    const today = new Date().toISOString().slice(0, 10);
    const unclosed = await this.ds.query(
      `SELECT s.id, a.name AS agency_name, s.register_label AS reg, s.business_date
       FROM operations.cash_sessions s JOIN operations.agencies a ON a.id=s.agency_id
       WHERE s.status='ouverte' AND s.business_date < $1 ORDER BY s.business_date`, [today]);
    const pending = await this.ds.query(
      `SELECT s.id, a.name AS agency_name, s.register_label AS reg, s.business_date
       FROM operations.cash_sessions s JOIN operations.agencies a ON a.id=s.agency_id
       WHERE s.status='fermee' ORDER BY s.closed_at DESC LIMIT 20`);
    const virtual = [
      ...unclosed.map((s: { id: string; agency_name: string; reg: string; business_date: string }) => ({
        id: `virt-unclosed-${s.id}`,
        type: "caisse_non_cloturee",
        message: `Caisse non clôturée — ${s.agency_name} / ${s.reg} (journée du ${s.business_date})`,
        objectType: "operations.cash_session", objectId: s.id,
        isRead: false, createdAt: new Date().toISOString(), isVirtual: true
      })),
      ...pending.map((s: { id: string; agency_name: string; reg: string; business_date: string }) => ({
        id: `virt-pending-${s.id}`,
        type: "journee_en_attente",
        message: `Journée en attente de validation — ${s.agency_name} / ${s.reg} (${s.business_date})`,
        objectType: "operations.cash_session", objectId: s.id,
        isRead: false, createdAt: new Date().toISOString(), isVirtual: true
      }))
    ];
    const items = [...virtual, ...persisted];
    const unread = items.filter((n: { isRead: boolean }) => !n.isRead).length;
    return { unread, items };
  }

  @Post("notifications/:id/read")
  @RequirePermission("platform:notifications:read")
  async read(@Param("id", ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    await this.ds.query("UPDATE platform.notifications SET is_read=true WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)", [id, req.user!.id]);
    return { id, isRead: true };
  }
}

@ApiTags("Opérations — Inter-agences")
@ApiBearerAuth()
@Controller("api/v1/operations")
export class ValueRequestsController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  @Get("value-requests")
  @RequirePermission("operations:transfers:read")
  async list() {
    return { items: await this.ds.query(
      `SELECT v.id, v.reference, v.value_type AS "valueType", v.amount, v.status, v.version,
              af.name AS "fromAgency", at.name AS "toAgency"
       FROM operations.value_requests v
       JOIN operations.agencies af ON af.id=v.from_agency_id
       JOIN operations.agencies at ON at.id=v.to_agency_id ORDER BY v.created_at DESC`) };
  }

  @Post("value-requests")
  @RequirePermission("operations:transfers:manage")
  async create(@Body() dto: ValueRequestDto, @Req() req: AuthenticatedRequest) {
    const id = randomUUID();
    await this.ds.transaction(async (m) => {
      const seq = await m.query("SELECT platform.next_transaction_sequence('value_request') AS n");
      const reference = `VAL-${new Date().getFullYear()}-${String(seq[0].n).padStart(5,"0")}`;
      const to = await m.query("SELECT name FROM operations.agencies WHERE id=$1", [dto.toAgencyId]);
      if (!to.length) throw new NotFoundException("Agence destinataire introuvable.");
      await m.query(
        `INSERT INTO operations.value_requests(id,reference,from_agency_id,to_agency_id,value_type,amount,status,created_by)
         VALUES($1,$2,$3,$4,$5,$6,'notifiee',$7)`,
        [id, reference, dto.fromAgencyId, dto.toAgencyId, dto.valueType, dto.amount, req.user!.id]);
      // Notification (panneau Alertes) — diffusion
      await m.query(
        `INSERT INTO platform.notifications(id,user_id,type,message,object_type,object_id)
         VALUES($1,NULL,'demande_valeurs',$2,'operations.value_request',$3)`,
        [randomUUID(), `Demande de valeurs ${reference} (${dto.valueType}) à destination de ${to[0].name}`, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: "operations.value_request.created", objectType: "operations.value_request", objectId: id,
        afterState: { reference, valueType: dto.valueType, amount: dto.amount }, ...requestMetadata(req) });
    });
    return { id, status: "notifiee" };
  }

  @Post("value-requests/:id/process")
  @RequirePermission("operations:transfers:manage")
  async process(@Param("id", ParseUUIDPipe) id: string, @Body() d: VrActionDto, @Req() req: AuthenticatedRequest) {
    return this.transition(id, d.version, ["demande","notifiee"], "traitee", "traitement", null, req);
  }
  @Post("value-requests/:id/reject")
  @RequirePermission("operations:transfers:manage")
  async reject(@Param("id", ParseUUIDPipe) id: string, @Body() d: VrActionDto, @Req() req: AuthenticatedRequest) {
    if (!d.comment?.trim()) throw new ConflictException("Le motif de rejet est obligatoire.");
    return this.transition(id, d.version, ["demande","notifiee"], "rejetee", "rejet", d.comment.trim(), req);
  }

  private async transition(id: string, version: number, from: string[], to: string, action: string,
    comment: string | null, req: AuthenticatedRequest) {
    return this.ds.transaction(async (m) => {
      const r = await m.query("SELECT status, version FROM operations.value_requests WHERE id=$1 FOR UPDATE", [id]);
      if (!r.length) throw new NotFoundException("Demande introuvable.");
      if (r[0].version !== version) throw new ConflictException("Cette demande a été modifiée entre-temps.");
      if (!from.includes(r[0].status)) throw new ConflictException(`Transition impossible depuis « ${r[0].status} ».`);
      await m.query("UPDATE operations.value_requests SET status=$1, comment=COALESCE($2,comment), version=version+1, updated_at=now() WHERE id=$3",
        [to, comment, id]);
      await this.audit.record(m, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
        action: `operations.value_request.${action}`, objectType: "operations.value_request", objectId: id,
        beforeState: { status: r[0].status }, afterState: { status: to }, ...requestMetadata(req) });
      return { id, status: to };
    });
  }
}

@ApiTags("Opérations — Tableau de bord")
@ApiBearerAuth()
@Controller("api/v1/operations")
export class OpsDashboardController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  private async kpis() {
    const q = async (sql: string, params: unknown[] = []) => (await this.ds.query(sql, params))[0];
    const today = new Date().toISOString().slice(0, 10);
    const ag = await q("SELECT count(*)::int n FROM operations.agencies");
    const byRegion = await this.ds.query("SELECT region, count(*)::int n FROM operations.agencies GROUP BY region ORDER BY n DESC LIMIT 8");
    const ops = await q("SELECT count(*)::int n, COALESCE(sum(CASE WHEN direction='encaissement' THEN amount ELSE 0 END),0) ca FROM operations.cash_operations WHERE status='active'");
    const anomaliesVerif = await q("SELECT count(*)::int n FROM operations.verifications WHERE ecart <> 0");
    const caissesAvecEcart = await q("SELECT count(*)::int n FROM operations.cash_sessions WHERE ecart IS NOT NULL AND ecart <> 0");
    const caissesOuvertesAnc = await q("SELECT count(*)::int n FROM operations.cash_sessions WHERE status='ouverte' AND business_date < $1", [today]);
    const aValider = await q("SELECT count(*)::int n FROM operations.cash_sessions WHERE status='fermee'");
    const valeurs = await q("SELECT count(*)::int n FROM operations.value_requests WHERE status IN ('demande','notifiee')");
    const detailEcarts = await this.ds.query(
      `SELECT a.name AS agency, s.register_label AS reg, s.business_date AS date, s.ecart, s.status, s.cashier_note AS note
       FROM operations.cash_sessions s JOIN operations.agencies a ON a.id=s.agency_id
       WHERE s.ecart IS NOT NULL AND s.ecart <> 0 ORDER BY s.business_date DESC LIMIT 20`);
    const detailNonCloturees = await this.ds.query(
      `SELECT a.name AS agency, s.register_label AS reg, s.business_date AS date
       FROM operations.cash_sessions s JOIN operations.agencies a ON a.id=s.agency_id
       WHERE s.status='ouverte' AND s.business_date < $1 ORDER BY s.business_date`, [today]);
    return {
      agencesTotal: ag.n, agencesParRegion: byRegion,
      operationsActives: ops.n, chiffreAffaires: Number(ops.ca),
      anomaliesVerification: anomaliesVerif.n, caissesAvecEcart: caissesAvecEcart.n,
      caissesOuvertesAnc: caissesOuvertesAnc.n, journeesAValider: aValider.n,
      demandesValeursEnCours: valeurs.n,
      detailEcarts, detailNonCloturees,
      genereLe: new Date().toISOString()
    };
  }

  @Get("dashboard")
  @RequirePermission("operations:dashboard:read")
  async dashboard() { return this.kpis(); }

  @Get("dashboard.pdf")
  @RequirePermission("operations:dashboard:read")
  async pdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const k = await this.kpis();
    const lines = [
      ["Agences / postes", String(k.agencesTotal)],
      ["Opérations actives", String(k.operationsActives)],
      ["Chiffre d'affaires (MGA)", k.chiffreAffaires.toLocaleString("fr-FR")],
      ["Caisses avec écart", String(k.caissesAvecEcart)],
      ["Caisses non clôturées (jours antérieurs)", String(k.caissesOuvertesAnc)],
      ["Anomalies de vérification manuelle", String(k.anomaliesVerification)],
      ["Journées de caisse à valider", String(k.journeesAValider)],
      ["Demandes de valeurs en cours", String(k.demandesValeursEnCours)]
    ];
    const buf = await buildPdf("Tableau de bord Opérations", `PAOSITRA — KPI consolidés — Généré le ${new Date().toLocaleDateString("fr-FR")}`,
      lines, ["Indicateur", "Valeur"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "operations.dashboard.export.pdf", objectType: "operations.dashboard", ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Tableau_Bord_Operations_${new Date().toISOString().slice(0,10)}.pdf"`);
    res.end(buf);
  }
}
