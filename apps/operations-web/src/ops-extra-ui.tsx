import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";

interface Agency { id: string; name: string }
interface OpsKpi {
  agencesTotal: number; agencesParRegion: { region: string; n: number }[]; operationsActives: number;
  chiffreAffairesDemo: number; anomaliesVerification: number; journeesAValider: number; demandesValeursEnCours: number;
}
interface ValueReq { id: string; reference: string; valueType: string; amount: string; status: string; version: number; fromAgency: string; toAgency: string }
interface Notif { id: string; type: string; message: string; isRead: boolean; createdAt: string }

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
  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-head">
          <h2>Tableau de bord Opérations <span className="badge source-demo">DEMO</span></h2>
          <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/operations/dashboard.pdf", "tableau-bord-operations-DEMO.pdf").then((e) => e && setMsg({ type: "error", text: e }))}>Export PDF</button>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card"><span>Agences / postes</span><strong>{k.agencesTotal}</strong></div>
          <div className="kpi-card"><span>Opérations actives</span><strong>{k.operationsActives}</strong></div>
          <div className="kpi-card"><span>Chiffre d'affaires [DEMO]</span><strong>{fmt(k.chiffreAffairesDemo)}</strong><small>MGA</small></div>
          <div className="kpi-card"><span>Anomalies vérification</span><strong>{k.anomaliesVerification}</strong></div>
          <div className="kpi-card"><span>Journées à valider</span><strong>{k.journeesAValider}</strong></div>
          <div className="kpi-card"><span>Demandes de valeurs</span><strong>{k.demandesValeursEnCours}</strong></div>
        </div>
      </section>
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
            <input placeholder="Montant" inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
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
              <td>{!n.isRead && <button className="link" onClick={() => void markRead(n.id)}>Marquer lu</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
