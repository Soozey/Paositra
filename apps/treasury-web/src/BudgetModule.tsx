import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";
import { AttachmentsPanel } from "./AttachmentsPanel";

interface Exercise { id: string; year: number; label: string; status: string }
interface Line { id: string; direction: string; program: string; accountCode: string; label: string; allocated: string; engaged: string; available: string }
interface Engagement { id: string; reference: string; object: string; marketType: string; amount: string; status: string; version: number; lineLabel: string; direction: string }
interface BudgetVersion { id: string; versionNumber: number; label: string; status: string; justification: string | null; version: number }

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
  const [versions, setVersions] = useState<BudgetVersion[]>([]);
  const [versionId, setVersionId] = useState("");
  const [attachmentEngagement, setAttachmentEngagement] = useState<Engagement | null>(null);
  const [exForm, setExForm] = useState({ year: new Date().getFullYear(), label: "" });
  const [lineForm, setLineForm] = useState({ direction: "", program: "", accountCode: "", label: "", allocatedAmount: "" });
  const [engForm, setEngForm] = useState({ lineId: "", object: "", marketType: "bon_de_commande", amount: "" });
  const [versionForm, setVersionForm] = useState({ label: "", sourceVersionId: "", justification: "" });
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
      const [l, e, v] = await Promise.all([
        apiRequest<{ items: Line[] }>(`/api/v1/treasury/budget/lines?exerciseId=${exId}${versionId ? `&versionId=${versionId}` : ""}`, { token: auth.token }),
        apiRequest<{ items: Engagement[] }>("/api/v1/treasury/engagements", { token: auth.token })
        ,apiRequest<{ items: BudgetVersion[] }>(`/api/v1/treasury/budget/versions?exerciseId=${exId}`, { token: auth.token })
      ]);
      setLines(l.items); setEngs(e.items); setVersions(v.items);
      if (!versionId) {
        const activeVersion = v.items.find((item) => item.status === "active") ?? v.items[0];
        if (activeVersion) setVersionId(activeVersion.id);
      }
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); }
  }, [auth.token, exId, versionId]);
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
    try { await apiRequest("/api/v1/treasury/budget/lines", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ ...lineForm, exerciseId: exId, budgetVersionId: versionId || undefined }) });
      setMsg({ type: "success", text: "Ligne de crédit créée." }); setLineForm({ direction: "", program: "", accountCode: "", label: "", allocatedAmount: "" }); await loadDetail();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function createVersion(e: FormEvent) {
    e.preventDefault(); if (!exId) return; setLoading(true);
    try { const result = await apiRequest<{ id: string; versionNumber: number }>("/api/v1/treasury/budget/versions", { method: "POST", token: auth.token, idempotent: true,
      body: JSON.stringify({ exerciseId: exId, ...versionForm, sourceVersionId: versionForm.sourceVersionId || undefined, justification: versionForm.justification || undefined }) });
      setVersionId(result.id); setVersionForm({ label: "", sourceVersionId: "", justification: "" }); setMsg({ type: "success", text: `Version ${result.versionNumber} créée en brouillon.` }); await loadDetail();
    } catch (error) { setMsg({ type: "error", text: error instanceof Error ? error.message : "Création impossible." }); } finally { setLoading(false); }
  }
  async function activateVersion(version: BudgetVersion) {
    try { await apiRequest(`/api/v1/treasury/budget/versions/${version.id}/activate`, { method: "POST", token: auth.token, idempotent: true,
      body: JSON.stringify({ version: version.version, comment: "Activation depuis l'interface" }) }); setMsg({ type: "success", text: `Version ${version.versionNumber} activée.` }); await loadDetail(); }
    catch (error) { setMsg({ type: "error", text: error instanceof Error ? error.message : "Activation impossible." }); }
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
    <div className="grid budget-layout">
      {msg && <div className="wide-panel"><Message type={msg.type}>{msg.text}</Message></div>}
      <section className="panel engagement-panel">
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
      <section className="panel wide-panel">
        <div className="panel-head"><div><h2>Versions budgétaires</h2><p className="muted">Une seule version active par exercice. Les versions précédentes sont conservées et archivées.</p></div>
          <select value={versionId} onChange={(e) => setVersionId(e.target.value)}><option value="">Lignes historiques sans version</option>{versions.map((version) => <option key={version.id} value={version.id}>V{version.versionNumber} — {version.label} ({version.status})</option>)}</select></div>
        {canManage && exId && <form className="inline-form" onSubmit={createVersion}>
          <input required placeholder="Libellé de la version" value={versionForm.label} onChange={(e) => setVersionForm({ ...versionForm, label: e.target.value })} />
          <select value={versionForm.sourceVersionId} onChange={(e) => setVersionForm({ ...versionForm, sourceVersionId: e.target.value })}><option value="">Version vide</option>{versions.map((version) => <option key={version.id} value={version.id}>Copier V{version.versionNumber}</option>)}</select>
          <input placeholder="Justification" value={versionForm.justification} onChange={(e) => setVersionForm({ ...versionForm, justification: e.target.value })} />
          <button className="primary" disabled={loading}>Créer la version</button>
        </form>}
        <div className="table-wrap"><table><thead><tr><th>Version</th><th>Libellé</th><th>Statut</th><th>Justification</th><th>Actions</th></tr></thead>
          <tbody>{versions.length === 0 ? <tr><td colSpan={5} className="empty">Aucune version budgétaire. Créez une première version pour préparer le budget.</td></tr> : versions.map((version) => <tr key={version.id}><td>V{version.versionNumber}</td><td>{version.label}</td><td>{version.status}</td><td>{version.justification || "-"}</td>
            <td>{version.status === "brouillon" && auth.hasPermission("treasury:budget:validate") && <button className="primary" onClick={() => void activateVersion(version)}>Activer</button>}</td></tr>)}</tbody></table></div>
      </section>
      <section className="panel">
        <h2>Lignes de crédit (ouvert / engagé / disponible)</h2>
        <div className="table-wrap"><table>
            <thead><tr><th>Direction</th><th>Programme</th><th>Compte</th><th>Ouvert</th><th>Engagé</th><th>Disponible</th></tr></thead>
            <tbody>{lines.length === 0 ? (
              <tr><td colSpan={6} className="empty">Aucune ligne de crédit pour cet exercice. Le gabarit est prêt pour les données budgétaires validées.</td></tr>
            ) : lines.map((l) => (
              <tr key={l.id}><td>{l.direction}</td><td>{l.program}</td><td>{l.accountCode}</td><td>{fmt(l.allocated)}</td><td>{fmt(l.engaged)}</td>
                <td><strong className={Number(l.available) <= 0 ? "badge-due" : ""}>{fmt(l.available)}</strong></td></tr>
            ))}</tbody>
          </table></div>
        {canManage && exId && (
          <form onSubmit={createLine} className="inline-form">
            <input placeholder="Direction" required value={lineForm.direction} onChange={(e) => setLineForm({ ...lineForm, direction: e.target.value })} />
            <input placeholder="Programme" required value={lineForm.program} onChange={(e) => setLineForm({ ...lineForm, program: e.target.value })} />
            <input placeholder="Compte" required value={lineForm.accountCode} onChange={(e) => setLineForm({ ...lineForm, accountCode: e.target.value })} />
            <input placeholder="Libellé" required value={lineForm.label} onChange={(e) => setLineForm({ ...lineForm, label: e.target.value })} />
            <AmountInput placeholder="Montant ouvert" required value={lineForm.allocatedAmount} onValueChange={(value) => setLineForm({ ...lineForm, allocatedAmount: value })} />
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
            <AmountInput placeholder="Montant" required value={engForm.amount} onValueChange={(value) => setEngForm({ ...engForm, amount: value })} />
            <button className="primary" disabled={loading} type="submit">Créer le dossier</button>
          </form>
        )}
        <div className="table-wrap"><table>
            <thead><tr><th>Référence</th><th>Objet</th><th>Ligne</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{engs.length === 0 ? (
              <tr><td colSpan={6} className="empty">Aucun dossier d'engagement. Le circuit de traitement est prêt pour les dossiers autorisés.</td></tr>
            ) : engs.map((en) => (
              <tr key={en.id}><td>{en.reference}</td><td>{en.object}</td><td>{en.lineLabel}</td><td>{fmt(en.amount)}</td><td>{ESTATUS[en.status] ?? en.status}</td>
                <td><div className="actions">{(NEXT[en.status] ?? []).filter((a) => auth.hasPermission(a.perm)).map((a) =>
                  <button key={a.action} className={a.danger ? "danger" : "secondary"} onClick={() => void transition(en, a.action)}>{a.label}</button>)}
                  {auth.hasPermission("treasury:attachments:read") && <button className="secondary" onClick={() => setAttachmentEngagement(en)}>Pièces</button>}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        {attachmentEngagement && <AttachmentsPanel objectType="engagement" objectId={attachmentEngagement.id} title={`Pièces du dossier ${attachmentEngagement.reference}`} />}
      </section>
    </div>
  );
}
