import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";

interface Agency { id: string; name: string }
interface OpsKpi {
  agencesTotal: number; agencesParRegion: { region: string; n: number }[];
  operationsActives: number; chiffreAffaires: number;
  anomaliesVerification: number; caissesAvecEcart: number; caissesOuvertesAnc: number;
  journeesAValider: number; demandesValeursEnCours: number;
  detailEcarts: { agency: string; reg: string; date: string; ecart: string; status: string; note: string | null }[];
  detailNonCloturees: { agency: string; reg: string; date: string }[];
}
interface ValueReq { id: string; reference: string; valueType: string; amount: string; status: string; version: number; fromAgency: string; toAgency: string }
interface Notif { id: string; type: string; message: string; isRead: boolean; createdAt: string; isVirtual?: boolean }

const VRSTATUS: Record<string, string> = { demande: "Demande", notifiee: "Notifiée", traitee: "Traitée", rejetee: "Rejetée" };

export function OpsDashboardModule() {
  const auth = useAuth();
  const [k, setK] = useState<OpsKpi | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  useEffect(() => { (async () => {
    try { setK(await apiRequest<OpsKpi>("/api/v1/operations/dashboard", { token: auth.token })); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  })(); }, [auth.token]);
  if (msg) return <Message type={msg.type}>{msg.text}</Message>;
  if (!k) return <p className="empty">Chargement du tableau de bord…</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid">
      <section className="panel wide-panel">
        <div className="panel-head">
          <h2>Tableau de bord Opérations</h2>
          <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/operations/dashboard.pdf", `Tableau_Bord_Operations_${today}.pdf`).then((e) => e && setMsg({ type: "error", text: e }))}>Export PDF</button>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Agences / postes</span><strong>{k.agencesTotal}</strong></div>
          <div className="kpi-card"><span>Opérations actives</span><strong>{k.operationsActives}</strong></div>
          <div className="kpi-card"><span>Chiffre d'affaires (MGA)</span><strong>{fmt(k.chiffreAffaires)}</strong></div>
          <div className={`kpi-card${k.caissesAvecEcart > 0 ? " kpi-alert" : ""}`}><span>Caisses avec écart</span><strong>{k.caissesAvecEcart}</strong></div>
          <div className={`kpi-card${k.caissesOuvertesAnc > 0 ? " kpi-alert" : ""}`}><span>Caisses non clôturées (j. antér.)</span><strong>{k.caissesOuvertesAnc}</strong></div>
          <div className="kpi-card"><span>Anomalies vérification manuelle</span><strong>{k.anomaliesVerification}</strong></div>
          <div className="kpi-card"><span>Journées à valider</span><strong>{k.journeesAValider}</strong></div>
          <div className="kpi-card"><span>Demandes de valeurs</span><strong>{k.demandesValeursEnCours}</strong></div>
        </div>
      </section>
      {k.detailNonCloturees.length > 0 && (
        <section className="panel wide-panel">
          <h2>Caisses non clôturées (jours antérieurs)</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Agence</th><th>Caisse</th><th>Date journée</th></tr></thead>
            <tbody>{k.detailNonCloturees.map((r, i) => <tr key={i}><td>{r.agency}</td><td>{r.reg}</td><td>{r.date}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
      {k.detailEcarts.length > 0 && (
        <section className="panel wide-panel">
          <h2>Caisses avec écart (dernières clôtures)</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Agence</th><th>Caisse</th><th>Date</th><th>Écart (MGA)</th><th>Note caissier</th><th>État</th></tr></thead>
            <tbody>{k.detailEcarts.map((r, i) => (
              <tr key={i}>
                <td>{r.agency}</td><td>{r.reg}</td><td>{r.date}</td>
                <td><strong className={Number(r.ecart) !== 0 ? "badge-due" : ""}>{fmt(r.ecart)}</strong></td>
                <td>{r.note ?? "—"}</td>
                <td>{r.status === "fermee" ? "Clôturée" : r.status === "validee" ? "Validée" : r.status === "refusee" ? "Refusée" : r.status}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
      <section className="panel">
        <h2>Couverture par région</h2>
        <div className="table-wrap"><table><thead><tr><th>Région</th><th>Postes</th></tr></thead>
          <tbody>{k.agencesParRegion.map((r) => <tr key={r.region}><td>{r.region}</td><td>{r.n}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

export function ValueRequestsModule() {
  const auth = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [items, setItems] = useState<ValueReq[]>([]);
  const [form, setForm] = useState({ fromAgencyId: "", toAgencyId: "", valueType: "G59", amount: "" });
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const canManage = auth.hasPermission("operations:transfers:manage");
  const load = useCallback(async () => {
    try {
      const [a, v] = await Promise.all([
        apiRequest<{ items: Agency[] }>("/api/v1/operations/agencies?page=1&pageSize=100", { token: auth.token }),
        apiRequest<{ items: ValueReq[] }>("/api/v1/operations/value-requests", { token: auth.token })
      ]);
      setAgencies(a.items); setItems(v.items);
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }, [auth.token]);
  useEffect(() => { void load(); }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await apiRequest("/api/v1/operations/value-requests", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(form) });
      setMsg({ type: "success", text: "Demande de valeurs créée et notifiée." }); setForm({ ...form, amount: "" }); await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function action(v: ValueReq, act: string) {
    let comment: string | undefined;
    if (act === "reject") { comment = window.prompt("Motif du rejet :")?.trim(); if (!comment) return; }
    try { await apiRequest(`/api/v1/operations/value-requests/${v.id}/${act}`, { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ version: v.version, comment }) }); await load(); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }
  return (
    <div className="grid">
      {msg && <Message type={msg.type}>{msg.text}</Message>}
      {canManage && (
        <section className="panel">
          <h2>Demande de valeurs inter-agences (G59 versement / G60 rapatriement)</h2>
          <form onSubmit={create} className="inline-form">
            <select required value={form.fromAgencyId} onChange={(e) => setForm({ ...form, fromAgencyId: e.target.value })}><option value="">Agence source</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select required value={form.toAgencyId} onChange={(e) => setForm({ ...form, toAgencyId: e.target.value })}><option value="">Agence destinataire</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select value={form.valueType} onChange={(e) => setForm({ ...form, valueType: e.target.value })}><option value="G59">G59 (versement)</option><option value="G60">G60 (rapatriement)</option></select>
            <AmountInput placeholder="Montant" required value={form.amount} onValueChange={(value) => setForm({ ...form, amount: value })} />
            <button className="primary" disabled={loading} type="submit">Créer la demande</button>
          </form>
        </section>
      )}
      <section className="panel">
        <h2>Demandes de valeurs</h2>
        {items.length === 0 ? <p className="empty">Aucune demande.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Référence</th><th>Type</th><th>De</th><th>Vers</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{items.map((v) => (
              <tr key={v.id}><td>{v.reference}</td><td>{v.valueType}</td><td>{v.fromAgency}</td><td>{v.toAgency}</td><td>{fmt(v.amount)}</td><td>{VRSTATUS[v.status] ?? v.status}</td>
                <td><div className="actions">
                  {canManage && ["demande", "notifiee"].includes(v.status) && <button className="secondary" onClick={() => void action(v, "process")}>Traiter</button>}
                  {canManage && ["demande", "notifiee"].includes(v.status) && <button className="danger" onClick={() => void action(v, "reject")}>Rejeter</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}

export function AlertsPanel() {
  const auth = useAuth();
  const [data, setData] = useState<{ unread: number; items: Notif[] }>({ unread: 0, items: [] });
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const load = useCallback(async () => {
    try { setData(await apiRequest<{ unread: number; items: Notif[] }>("/api/v1/platform/notifications", { token: auth.token })); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }, [auth.token]);
  useEffect(() => { void load(); }, [load]);
  async function markRead(id: string) {
    try { await apiRequest(`/api/v1/platform/notifications/${id}/read`, { method: "POST", token: auth.token, idempotent: true, body: "{}" }); await load(); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }
  return (
    <section className="panel">
      {msg && <Message type={msg.type}>{msg.text}</Message>}
      <h2>Alertes {data.unread > 0 && <span className="alerts-badge">{data.unread}</span>}</h2>
      {data.items.length === 0 ? <p className="empty">Aucune alerte.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Type</th><th>Message</th><th>Date</th><th></th></tr></thead>
          <tbody>{data.items.map((n) => (
            <tr key={n.id} className={n.isRead ? "" : "unread"}>
              <td>{n.type}</td><td>{n.message}</td><td>{new Date(n.createdAt).toLocaleString("fr-FR")}</td>
              <td>{!n.isRead && !n.isVirtual && <button className="link" onClick={() => void markRead(n.id)}>Marquer lu</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
