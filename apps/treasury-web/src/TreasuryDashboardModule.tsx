import { useEffect, useState } from "react";
import { apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";

interface Kpi {
  placementsActifs: number; montantPlace: number; creancesEnRetard: number; montantCreancesRetard: number;
  engagementsEnAttente: number; budgetOuvert: number; budgetEngage: number; tauxExecutionPct: number;
  comptesActifs: number; chequesEnCirculation: number;
}

export function TreasuryDashboardModule() {
  const auth = useAuth();
  const [k, setK] = useState<Kpi | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  useEffect(() => { (async () => {
    try { setK(await apiRequest<Kpi>("/api/v1/treasury/dashboard", { token: auth.token })); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  })(); }, [auth.token]);
  if (msg) return <Message type={msg.type}>{msg.text}</Message>;
  if (!k) return <p className="empty">Chargement du tableau de bord…</p>;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Tableau de bord Trésorerie <span className="badge source-demo">DEMO</span></h2>
        <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/dashboard.pdf", "tableau-bord-tresorerie-DEMO.pdf").then((e) => e && setMsg({ type: "error", text: e }))}>Export PDF</button>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card"><span>Placements actifs</span><strong>{k.placementsActifs}</strong></div>
        <div className="kpi-card"><span>Montant placé</span><strong>{fmt(k.montantPlace)}</strong><small>MGA</small></div>
        <div className="kpi-card"><span>Créances en retard</span><strong>{k.creancesEnRetard}</strong><small>{fmt(k.montantCreancesRetard)} MGA</small></div>
        <div className="kpi-card"><span>Engagements en attente</span><strong>{k.engagementsEnAttente}</strong></div>
        <div className="kpi-card"><span>Budget ouvert</span><strong>{fmt(k.budgetOuvert)}</strong><small>MGA</small></div>
        <div className="kpi-card"><span>Budget engagé</span><strong>{fmt(k.budgetEngage)}</strong><small>MGA</small></div>
        <div className="kpi-card"><span>Taux d'exécution</span><strong>{k.tauxExecutionPct} %</strong></div>
        <div className="kpi-card"><span>Comptes actifs</span><strong>{k.comptesActifs}</strong></div>
        <div className="kpi-card"><span>Chèques en circulation</span><strong>{k.chequesEnCirculation}</strong></div>
      </div>
    </section>
  );
}
