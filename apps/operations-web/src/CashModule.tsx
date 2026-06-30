import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { DENOMS, billetageTotal, downloadFile, fmt } from "./util";

interface Agency { id: string; code: string; name: string }
interface Session {
  id: string; registerLabel: string; businessDate: string; status: string;
  openingAmount: string; declaredAmount: string | null; countedAmount: string | null;
  ecart: string | null; version: number; agencyName: string; agencyCode: string;
}
interface CashOp {
  id: string; code: string; opType: string; direction: string; amount: string;
  paymentMode: string; status: string;
}

const STATUS_LABEL: Record<string, string> = {
  ouverte: "Ouverte", fermee: "Clôturée", validee: "Validée", refusee: "Refusée"
};

export function CashModule() {
  const auth = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ops, setOps] = useState<Record<string, CashOp[]>>({});
  const [openForm, setOpenForm] = useState({ agencyId: "", registerLabel: "Caisse 1", businessDate: new Date().toISOString().slice(0, 10) });
  const [openBill, setOpenBill] = useState<Record<string, number>>({});
  const [closeBill, setCloseBill] = useState<Record<string, number>>({});
  const [opForm, setOpForm] = useState({ opType: "Mandat national", direction: "encaissement", amount: "", paymentMode: "especes", clientIdType: "", clientIdNumber: "" });
  const [closing, setClosing] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const canOpen = auth.hasPermission("operations:cash:open");
  const canOperate = auth.hasPermission("operations:cash:operate");
  const canClose = auth.hasPermission("operations:cash:close");
  const canValidate = auth.hasPermission("operations:day:validate");

  const load = useCallback(async () => {
    try {
      const [ag, ss] = await Promise.all([
        apiRequest<{ items: Agency[] }>("/api/v1/operations/agencies?page=1&pageSize=100", { token: auth.token }),
        apiRequest<{ items: Session[] }>("/api/v1/operations/cash/sessions", { token: auth.token })
      ]);
      setAgencies(ag.items);
      setSessions(ss.items);
    } catch (e) {
      setMsg({ type: "error", text: e instanceof Error ? e.message : "Chargement impossible." });
    }
  }, [auth.token]);
  useEffect(() => { void load(); }, [load]);

  async function loadOps(id: string) {
    try {
      const r = await apiRequest<CashOp[]>(`/api/v1/operations/cash/sessions/${id}/operations`, { token: auth.token });
      setOps((prev) => ({ ...prev, [id]: r }));
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  async function openSession(e: FormEvent) {
    e.preventDefault();
    if (!openForm.agencyId) { setMsg({ type: "error", text: "Sélectionnez une agence." }); return; }
    setLoading(true);
    try {
      await apiRequest("/api/v1/operations/cash/open", {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ ...openForm, billetage: openBill })
      });
      setMsg({ type: "success", text: `Caisse ouverte avec ${fmt(billetageTotal(openBill))} MGA de fond.` });
      setOpenBill({});
      await load();
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Ouverture impossible." }); }
    finally { setLoading(false); }
  }

  async function addOp(e: FormEvent, sessionId: string) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiRequest<{ code: string }>(`/api/v1/operations/cash/sessions/${sessionId}/operations`, {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ ...opForm, clientIdType: opForm.clientIdType || undefined, clientIdNumber: opForm.clientIdNumber || undefined })
      });
      setMsg({ type: "success", text: `Opération enregistrée : ${r.code}` });
      setOpForm({ ...opForm, amount: "", clientIdNumber: "" });
      await loadOps(sessionId);
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); }
    finally { setLoading(false); }
  }

  async function cancelOp(opId: string, sessionId: string) {
    const reason = window.prompt("Motif d'annulation :")?.trim();
    if (!reason) return;
    try {
      await apiRequest(`/api/v1/operations/cash/operations/${opId}/cancel`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ reason })
      });
      await loadOps(sessionId);
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  async function closeSession(e: FormEvent, s: Session) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiRequest<{ expected: number; counted: number; ecart: number }>(`/api/v1/operations/cash/sessions/${s.id}/close`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ billetage: closeBill, version: s.version })
      });
      setMsg({ type: "success", text: `Caisse clôturée. Attendu ${fmt(r.expected)} / compté ${fmt(r.counted)} / écart ${fmt(r.ecart)} MGA.` });
      setClosing(null); setCloseBill({});
      await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Clôture impossible." }); }
    finally { setLoading(false); }
  }

  async function validateDay(s: Session, decision: "valider" | "refuser") {
    let comment = "";
    if (decision === "refuser") { comment = window.prompt("Motif du refus :")?.trim() || ""; if (!comment) return; }
    if (decision === "valider" && !window.confirm("Valider la journée ? La caisse sera verrouillée (irréversible).")) return;
    try {
      await apiRequest(`/api/v1/operations/cash/sessions/${s.id}/validate`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ decision, comment, version: s.version })
      });
      setMsg({ type: "success", text: decision === "valider" ? "Journée validée et verrouillée." : "Journée refusée." });
      await load();
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  function BilletageInputs({ value, onChange }: { value: Record<string, number>; onChange: (v: Record<string, number>) => void }) {
    return (
      <div className="billetage">
        {DENOMS.map((d) => (
          <label key={d} className="billetage-item">{fmt(d)}
            <input type="number" min="0" value={value[String(d)] ?? ""} onChange={(e) => onChange({ ...value, [String(d)]: Number(e.target.value) })} />
          </label>
        ))}
        <strong>Total : {fmt(billetageTotal(value))} MGA</strong>
      </div>
    );
  }

  return (
    <div className="grid">
      {msg && <Message type={msg.type}>{msg.text}</Message>}
      {canOpen && (
        <section className="panel">
          <h2>Ouvrir une caisse (billetage de début)</h2>
          <form onSubmit={openSession}>
            <label>Agence
              <select required value={openForm.agencyId} onChange={(e) => setOpenForm({ ...openForm, agencyId: e.target.value })}>
                <option value="">Sélectionner</option>
                {agencies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
              </select>
            </label>
            <label>Caisse / guichet
              <input required value={openForm.registerLabel} onChange={(e) => setOpenForm({ ...openForm, registerLabel: e.target.value })} />
            </label>
            <label>Date de journée
              <input type="date" required value={openForm.businessDate} onChange={(e) => setOpenForm({ ...openForm, businessDate: e.target.value })} />
            </label>
            <BilletageInputs value={openBill} onChange={setOpenBill} />
            <button className="primary" disabled={loading} type="submit">Ouvrir la caisse</button>
          </form>
        </section>
      )}
      <section className="panel">
        <h2>Caisses</h2>
        {sessions.length === 0 ? <p className="empty">Aucune caisse ouverte. {canOpen ? "Ouvrez-en une ci-contre." : ""}</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agence</th><th>Caisse</th><th>Date</th><th>Fond</th><th>Écart</th><th>État</th><th>Actions</th></tr></thead>
              <tbody>
                {sessions.map((s) => {
                  const list = ops[s.id];
                  return (
                  <tr key={s.id}>
                    <td>{s.agencyName}</td>
                    <td>{s.registerLabel}</td>
                    <td>{s.businessDate}</td>
                    <td>{fmt(s.openingAmount)}</td>
                    <td>{s.ecart != null ? <strong className={Number(s.ecart) !== 0 ? "badge-due" : ""}>{fmt(s.ecart)}</strong> : "—"}</td>
                    <td>{STATUS_LABEL[s.status] ?? s.status}</td>
                    <td>
                      <div className="actions">
                        <button className="secondary" onClick={() => void loadOps(s.id)}>Opérations</button>
                        {s.status === "ouverte" && canClose && <button className="secondary" onClick={() => setClosing(closing === s.id ? null : s.id)}>Clôturer</button>}
                        {s.status === "fermee" && canValidate && <button className="secondary" onClick={() => void validateDay(s, "valider")}>Valider journée</button>}
                        {s.status === "fermee" && canValidate && <button className="danger" onClick={() => void validateDay(s, "refuser")}>Refuser</button>}
                      </div>
                      {list && (
                        <div className="subtable">
                          {list.length === 0 ? <p className="empty">Aucune opération.</p> : (
                            <table>
                              <thead><tr><th>Code</th><th>Type</th><th>Sens</th><th>Montant</th><th>Mode</th><th>État</th><th></th></tr></thead>
                              <tbody>
                                {list.map((o) => (
                                  <tr key={o.id}>
                                    <td>{o.code}</td><td>{o.opType}</td><td>{o.direction}</td><td>{fmt(o.amount)}</td><td>{o.paymentMode}</td>
                                    <td>{o.status === "active" ? "Active" : "Annulée"}</td>
                                    <td>
                                      <button className="link" onClick={() => void downloadFile(auth.token, `/api/v1/operations/cash/operations/${o.id}/ticket.pdf`, `ticket-${o.code}.pdf`).then((e) => e && setMsg({ type: "error", text: e }))}>Ticket</button>
                                      {s.status === "ouverte" && o.status === "active" && canOperate && <button className="link danger" onClick={() => void cancelOp(o.id, s.id)}>Annuler</button>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {s.status === "ouverte" && canOperate && (
                            <form onSubmit={(e) => addOp(e, s.id)} className="inline-form">
                              <input placeholder="Type d'opération" required value={opForm.opType} onChange={(e) => setOpForm({ ...opForm, opType: e.target.value })} />
                              <select value={opForm.direction} onChange={(e) => setOpForm({ ...opForm, direction: e.target.value })}>
                                <option value="encaissement">Encaissement</option><option value="decaissement">Décaissement</option>
                              </select>
                              <AmountInput placeholder="Montant" required value={opForm.amount} onValueChange={(value) => setOpForm({ ...opForm, amount: value })} />
                              <select value={opForm.paymentMode} onChange={(e) => setOpForm({ ...opForm, paymentMode: e.target.value })}>
                                <option value="especes">Espèces</option><option value="cheque">Chèque</option><option value="credit">Crédit</option>
                              </select>
                              <input placeholder="N° CIN (optionnel)" value={opForm.clientIdNumber} onChange={(e) => setOpForm({ ...opForm, clientIdNumber: e.target.value, clientIdType: e.target.value ? "CIN" : "" })} />
                              <button className="primary" disabled={loading} type="submit">Enregistrer l'opération</button>
                            </form>
                          )}
                          {closing === s.id && s.status === "ouverte" && (
                            <form onSubmit={(e) => closeSession(e, s)}>
                              <h3>Billetage de fin de journée</h3>
                              <BilletageInputs value={closeBill} onChange={setCloseBill} />
                              <button className="primary" disabled={loading} type="submit">Confirmer la clôture</button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
