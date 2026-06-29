import { Controller, Get, Req, Res } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { requestMetadata } from "../common/request-context";
import type { AuthenticatedRequest } from "../common/request-context";
import { AuditService } from "../platform/audit.service";
import { buildPdf } from "../common/exporters";

@ApiTags("Trésorerie — Tableau de bord")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class TreasuryDashboardController {
  constructor(private readonly ds: DataSource, private readonly audit: AuditService) {}

  private async kpis() {
    const today = new Date().toISOString().slice(0, 10);
    const q = async (sql: string, p: unknown[] = []) => (await this.ds.query(sql, p))[0];
    const pl = await q("SELECT count(*)::int n, COALESCE(sum(principal_amount),0) m FROM treasury.placements WHERE status='open'");
    const cr = await q("SELECT count(*)::int n, COALESCE(sum(amount),0) m FROM treasury.receivables WHERE status<>'cloturee' AND due_date < $1", [today]);
    const eng = await q("SELECT count(*)::int n FROM treasury.engagements WHERE status IN ('soumis','en_verification')");
    const bud = await q("SELECT COALESCE(sum(allocated_amount),0) ouvert FROM treasury.budget_lines");
    const engaged = await q("SELECT COALESCE(sum(amount),0) e FROM treasury.engagements WHERE status IN ('soumis','en_verification','valide','paye','archive')");
    const acc = await q("SELECT count(*)::int n FROM treasury.current_accounts WHERE status='active'");
    const chq = await q("SELECT count(*)::int n FROM treasury.cheques WHERE status='en_circulation'");
    const ouvert = Number(bud.ouvert), engageM = Number(engaged.e);
    return {
      demo: true,
      placementsActifs: pl.n, montantPlace: Number(pl.m),
      creancesEnRetard: cr.n, montantCreancesRetard: Number(cr.m),
      engagementsEnAttente: eng.n,
      budgetOuvert: ouvert, budgetEngage: engageM,
      tauxExecutionPct: ouvert > 0 ? Math.round((engageM / ouvert) * 1000) / 10 : 0,
      comptesActifs: acc.n, chequesEnCirculation: chq.n,
      genereLe: new Date().toISOString()
    };
  }

  @Get("dashboard")
  @RequirePermission("treasury:dashboard:read")
  async dashboard() { return this.kpis(); }

  @Get("dashboard.pdf")
  @RequirePermission("treasury:dashboard:read")
  async dashboardPdf(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const k = await this.kpis();
    const lines = [
      ["Placements actifs", String(k.placementsActifs)],
      ["Montant placé (MGA)", k.montantPlace.toLocaleString("fr-FR")],
      ["Créances en retard", `${k.creancesEnRetard} (${k.montantCreancesRetard.toLocaleString("fr-FR")} MGA)`],
      ["Dossiers d'engagement en attente", String(k.engagementsEnAttente)],
      ["Budget ouvert (MGA)", k.budgetOuvert.toLocaleString("fr-FR")],
      ["Budget engagé (MGA)", k.budgetEngage.toLocaleString("fr-FR")],
      ["Taux d'exécution budgétaire", k.tauxExecutionPct + " %"],
      ["Comptes courants actifs", String(k.comptesActifs)],
      ["Chèques en circulation", String(k.chequesEnCirculation)]
    ];
    const buf = await buildPdf("Tableau de bord Trésorerie", "[DÉMONSTRATION] PAOSITRA — KPI calculés depuis les données réelles — NON CONTRACTUEL",
      lines, ["Indicateur", "Valeur"]);
    await this.audit.record(this.ds.manager, { actorUserId: req.user!.id, sessionId: req.user!.sessionId,
      action: "treasury.dashboard.export.pdf", objectType: "treasury.dashboard", ...requestMetadata(req) });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="tableau-bord-tresorerie-DEMO.pdf"');
    res.end(buf);
  }
}
