import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";

interface Exercise { id: string; year: number; label: string; status: string }
interface Line { id: string; direction: string; program: string; accountCode: string; label: string; allocated: string; engaged: string; available: string }
interface Engagement { id: string; reference: string; object: string; marketType: string; amount: string; status: string; version: number; lineLabel: string; direction: string }

const ESTATUS: Record<string, string> = { brouillon: "Brouillon", soumis: "Soumis", en_verification: "En vérification", valide: "Validé", rejete: "Rejeté", paye: "Payé", archive: "Archivé" };
const NEXT: Record<string, { action: string; label: string; perm: string; danger?: boolean }[]> = {
  brouillon: [{ action: "submit", label: "Soumettre", perm: "treasury:budget:manage" }],
  soumis: [{ action: "verify", label: "Vérifier", perm: "treasury:budget:manage" }],
  en_verification: [{ action: "validate", label: "Valider", perm: "treasury:budget:validate" }, { action: "reject", label: "Rejeter", perm: "treasury:budget:validate", danger: true }],
  valide: [{ action: "pay", label: "Payer", perm: "treasury:budget:manage" }],
  paye: [{ action: "archive", label: "Archiver", perm: "treasury:budget:manage" }]
};

export function BudgetModule() {
  const auth = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exId, setExId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [engs, setEngs] = useState<Engagement[]>([]);
  const [exForm, setExForm] = useState({ year: new Date().getFullYear(), label: "" });
  const [lineForm, setLineForm] = useState({ direction: "", program: "", accountCode: "", label: "", allocatedAmount: "" });
  const [engForm, setEngForm] = useState({ lineId: "", object: "", marketType: "bon_de_commande", amount: "" });
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const canManage = auth.hasPermission("treasury:budget:manage");

  const loadEx = useCallback(async () => {
    try { const r = await apiRequest<{ items: Exercise[] }>("/api/v1/treasury/budget/exercises", { token: auth.token });
      setExercises(r.items); if (!exId && r.items[0]) setExId(r.items[0].id);
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }, [auth.token, exId]);
  const loadDetail = useCallback(async () => {
    if (!exId) { setLines([]); setEngs([]); return; }
    try {
      const [l, e] = await Promise.all([
        apiRequest<{ items: Line[] }>(`/api/v1/treasury/budget/lines?exerciseId=${exId}`, { token: auth.token }),
        apiRequest<{ items: Engagement[] }>("/api/v1/treasury/engagements", { token: auth.token })
      ]);
      setLines(l.items); setEngs(e.items);
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); }
  }, [auth.token, exId]);
  useEffect(() => { void loadEx(); }, [loadEx]);
  useEffect(() => { void loadDetail(); }, [loadDetail]);

  async function createEx(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await apiRequest("/api/v1/treasury/budget/exercises", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(exForm) });
      setMsg({ type: "success", text: "Exercice créé." }); setExForm({ year: new Date().getFullYear(), label: "" }); await loadEx();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function createLine(e: FormEvent) {
    e.preventDefault(); if (!exId) return; setLoading(true);
    try { await apiRequest("/api/v1/treasury/budget/lines", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ ...lineForm, exerciseId: exId }) });
      setMsg({ type: "success", text: "Ligne de crédit créée." }); setLineForm({ direction: "", program: "", accountCode: "", label: "", allocatedAmount: "" }); await loadDetail();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function createEng(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { const r = await apiRequest<{ reference: string }>("/api/v1/treasury/engagements", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(engForm) });
      setMsg({ type: "success", text: `Dossier ${r.reference} créé.` }); setEngForm({ lineId: "", object: "", marketType: "bon_de_commande", amount: "" }); await loadDetail();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function transition(eng: Engagement, action: string) {
    let comment: string | undefined;
    if (action === "reject") { comment = window.prompt("Motif du rejet :")?.trim(); if (!comment) return; }
    try { await apiRequest(`/api/v1/treasury/engagements/${eng.id}/${action}`, { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ version: eng.version, comment }) }); await loadDetail(); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  return (
    <div className="grid">
      {msg && <Message type={msg.type}>{msg.text}</Message>}
      <section className="panel">
        <div className="panel-head">
          <h2>Exercice budgétaire</h2>
          <div className="actions">
            <select value={exId} onChange={(e) => setExId(e.target.value)}>
              <option value="">— exercice —</option>
              {exercises.map((x) => <option key={x.id} value={x.id}>{x.year} — {x.label}</option>)}
            </select>
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/budget-credits.xlsx", "situation-credits-DEMO.xlsx").then((e) => e && setMsg({ type: "error", text: e }))}>Crédits Excel</button>
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/engagement-bordereau.pdf", "bordereau-engagements-DEMO.pdf").then((e) => e && setMsg({ type: "error", text: e }))}>Bordereau PDF</button>
          </div>
        </div>
        {canManage && (
          <form onSubmit={createEx} className="inline-form">
            <input type="number" placeholder="Année" required value={exForm.year} onChange={(e) => setExForm({ ...exForm, year: Number(e.target.value) })} />
            <input placeholder="Libellé exercice" required value={exForm.label} onChange={(e) => setExForm({ ...exForm, label: e.target.value })} />
            <button className="primary" disabled={loading} type="submit">Créer l'exercice</button>
          </form>
        )}
      </section>
      <section className="panel">
        <h2>Lignes de crédit (ouvert / engagé / disponible)</h2>
        {lines.length === 0 ? <p className="empty">Aucune ligne pour cet exercice.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Direction</th><th>Programme</th><th>Compte</th><th>Ouvert</th><th>Engagé</th><th>Disponible</th></tr></thead>
            <tbody>{lines.map((l) => (
              <tr key={l.id}><td>{l.direction}</td><td>{l.program}</td><td>{l.accountCode}</td><td>{fmt(l.allocated)}</td><td>{fmt(l.engaged)}</td>
                <td><strong className={Number(l.available) <= 0 ? "badge-due" : ""}>{fmt(l.available)}</strong></td></tr>
            ))}</tbody>
          </table></div>
        )}
        {canManage && exId && (
          <form onSubmit={createLine} className="inline-form">
            <input placeholder="Direction" required value={lineForm.direction} onChange={(e) => setLineForm({ ...lineForm, direction: e.target.value })} />
            <input placeholder="Programme" required value={lineForm.program} onChange={(e) => setLineForm({ ...lineForm, program: e.target.value })} />
            <input placeholder="Compte" required value={lineForm.accountCode} onChange={(e) => setLineForm({ ...lineForm, accountCode: e.target.value })} />
            <input placeholder="Libellé" required value={lineForm.label} onChange={(e) => setLineForm({ ...lineForm, label: e.target.value })} />
            <input placeholder="Montant ouvert" inputMode="decimal" required value={lineForm.allocatedAmount} onChange={(e) => setLineForm({ ...lineForm, allocatedAmount: e.target.value })} />
            <button className="primary" disabled={loading} type="submit">Ajouter ligne</button>
          </form>
        )}
      </section>
      <section className="panel">
        <h2>Dossiers d'engagement</h2>
        {canManage && lines.length > 0 && (
          <form onSubmit={createEng} className="inline-form">
            <select required value={engForm.lineId} onChange={(e) => setEngForm({ ...engForm, lineId: e.target.value })}><option value="">Ligne de crédit</option>{lines.map((l) => <option key={l.id} value={l.id}>{l.label} (dispo {fmt(l.available)})</option>)}</select>
            <input placeholder="Objet" required value={engForm.object} onChange={(e) => setEngForm({ ...engForm, object: e.target.value })} />
            <input placeholder="Type de marché" required value={engForm.marketType} onChange={(e) => setEngForm({ ...engForm, marketType: e.target.value })} />
            <input placeholder="Montant" inputMode="decimal" required value={engForm.amount} onChange={(e) => setEngForm({ ...engForm, amount: e.target.value })} />
            <button className="primary" disabled={loading} type="submit">Créer le dossier</button>
          </form>
        )}
        {engs.length === 0 ? <p className="empty">Aucun dossier d'engagement.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Référence</th><th>Objet</th><th>Ligne</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{engs.map((en) => (
              <tr key={en.id}><td>{en.reference}</td><td>{en.object}</td><td>{en.lineLabel}</td><td>{fmt(en.amount)}</td><td>{ESTATUS[en.status] ?? en.status}</td>
                <td><div className="actions">{(NEXT[en.status] ?? []).filter((a) => auth.hasPermission(a.perm)).map((a) =>
                  <button key={a.action} className={a.danger ? "danger" : "secondary"} onClick={() => void transition(en, a.action)}>{a.label}</button>)}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
