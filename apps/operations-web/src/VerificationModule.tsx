import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";

interface Agency { id: string; name: string }
interface Verif { id: string; periodDate: string; expectedBalance: string; countedBalance: string; ecart: string; status: string; justification: string | null; agencyName: string }
interface Fund { id: string; reference: string; amount: string; status: string; version: number; comment: string | null; fromAgency: string; toAgency: string }
interface CashEcart { id: string; registerLabel: string; businessDate: string; status: string; openingAmount: string; countedAmount: string | null; ecart: string; cashierNote: string | null; closedAt: string | null; agencyName: string; agencyCode: string; cashierName: string }

const VSTATUS: Record<string, string> = { conforme: "Conforme", deficit: "Déficit", excedent: "Excédent" };
const FSTATUS: Record<string, string> = { demande: "Demande", solde_verifie: "Solde vérifié", autorise: "Autorisé", confirme: "Confirmé", rejete: "Rejeté" };

export function VerificationModule() {
  const auth = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [verifs, setVerifs] = useState<Verif[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [cashEcarts, setCashEcarts] = useState<CashEcart[]>([]);
  const [vForm, setVForm] = useState({ agencyId: "", periodDate: new Date().toISOString().slice(0, 10), expectedBalance: "", countedBalance: "", justification: "" });
  const [fForm, setFForm] = useState({ fromAgencyId: "", toAgencyId: "", amount: "" });
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const canValidate = auth.hasPermission("operations:verification:validate");
  const canFund = auth.hasPermission("operations:fund:manage");

  const load = useCallback(async () => {
    try {
      const calls: Promise<unknown>[] = [
        apiRequest<{ items: Agency[] }>("/api/v1/operations/agencies?page=1&pageSize=100", { token: auth.token }),
        apiRequest<{ items: Verif[] }>("/api/v1/operations/verifications", { token: auth.token }),
        apiRequest<{ items: CashEcart[] }>("/api/v1/operations/cash/sessions/ecarts", { token: auth.token })
      ];
      const [ag, vs, ce] = await Promise.all(calls) as [{ items: Agency[] }, { items: Verif[] }, { items: CashEcart[] }];
      setAgencies(ag.items); setVerifs(vs.items); setCashEcarts(ce.items);
      if (canFund) {
        const f = await apiRequest<{ items: Fund[] }>("/api/v1/operations/fund-provisions", { token: auth.token });
        setFunds(f.items);
      }
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Chargement impossible." }); }
  }, [auth.token, canFund]);
  useEffect(() => { void load(); }, [load]);

  async function createVerif(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const r = await apiRequest<{ status: string; ecart: number }>("/api/v1/operations/verifications", {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ ...vForm, justification: vForm.justification || undefined })
      });
      setMsg({ type: "success", text: `Vérification enregistrée : ${VSTATUS[r.status]} (écart ${fmt(r.ecart)} MGA).` });
      setVForm({ ...vForm, expectedBalance: "", countedBalance: "", justification: "" });
      await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); }
    finally { setLoading(false); }
  }

  async function creditAck(v: Verif) {
    const beneficiary = window.prompt("Bénéficiaire de l'accusé de crédit :", v.agencyName)?.trim();
    if (!beneficiary) return;
    const amount = window.prompt("Montant (MGA) :", String(Math.abs(Number(v.ecart))))?.trim();
    if (!amount) return;
    try {
      const r = await apiRequest<{ id: string; number: string }>(`/api/v1/operations/verifications/${v.id}/credit-ack`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ beneficiary, amount })
      });
      setMsg({ type: "success", text: `Accusé ${r.number} généré.` });
      const err = await downloadFile(auth.token, `/api/v1/operations/credit-ack/${r.id}.pdf`, `accuse-${r.number}.pdf`);
      if (err) setMsg({ type: "error", text: err });
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  async function createFund(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      await apiRequest("/api/v1/operations/fund-provisions", {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(fForm)
      });
      setMsg({ type: "success", text: "Demande de mise à disposition créée." });
      setFForm({ fromAgencyId: "", toAgencyId: "", amount: "" });
      await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); }
    finally { setLoading(false); }
  }

  async function fundAction(f: Fund, action: string) {
    let comment = "";
    if (action === "reject") { comment = window.prompt("Motif du rejet :")?.trim() || ""; if (!comment) return; }
    try {
      await apiRequest(`/api/v1/operations/fund-provisions/${f.id}/${action}`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ version: f.version, comment: comment || undefined })
      });
      await load();
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  return (
    <div className="grid">
      {msg && <Message type={msg.type}>{msg.text}</Message>}
      {canValidate && (
        <section className="panel">
          <h2>Nouvelle vérification</h2>
          <form onSubmit={createVerif}>
            <label>Agence
              <select required value={vForm.agencyId} onChange={(e) => setVForm({ ...vForm, agencyId: e.target.value })}>
                <option value="">Sélectionner</option>
                {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label>Période<input type="date" required value={vForm.periodDate} onChange={(e) => setVForm({ ...vForm, periodDate: e.target.value })} /></label>
            <label>Solde attendu<AmountInput required value={vForm.expectedBalance} onValueChange={(value) => setVForm({ ...vForm, expectedBalance: value })} /></label>
            <label>Solde constaté<AmountInput required value={vForm.countedBalance} onValueChange={(value) => setVForm({ ...vForm, countedBalance: value })} /></label>
            <label>Justification (obligatoire si écart)<input maxLength={1000} value={vForm.justification} onChange={(e) => setVForm({ ...vForm, justification: e.target.value })} /></label>
            <button className="primary" disabled={loading} type="submit">Enregistrer la vérification</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>Vérifications</h2>
          <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/operations/verifications.xlsx", "verifications-DEMO.xlsx").then((e) => e && setMsg({ type: "error", text: e }))}>Export Excel</button>
        </div>
        {verifs.length === 0 ? <p className="empty">Aucune vérification enregistrée.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Agence</th><th>Période</th><th>Attendu</th><th>Constaté</th><th>Écart</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {verifs.map((v) => (
                <tr key={v.id}>
                  <td>{v.agencyName}</td><td>{v.periodDate}</td><td>{fmt(v.expectedBalance)}</td><td>{fmt(v.countedBalance)}</td>
                  <td><strong className={Number(v.ecart) !== 0 ? "badge-due" : ""}>{fmt(v.ecart)}</strong></td>
                  <td>{VSTATUS[v.status] ?? v.status}</td>
                  <td>{canValidate && <button className="secondary" onClick={() => void creditAck(v)}>Accusé de crédit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
      <section className="panel">
        <h2>Caisses clôturées avec écart</h2>
        <p className="muted">Écarts constatés lors de la clôture, avec la note de justification saisie par le caissier.</p>
        {cashEcarts.length === 0 ? <p className="empty">Aucune caisse avec écart.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Agence</th><th>Caisse</th><th>Caissier</th><th>Date</th><th>Fond initial</th><th>Compté</th><th>Écart</th><th>Note caissier</th><th>État</th></tr></thead>
            <tbody>
              {cashEcarts.map((c) => (
                <tr key={c.id}>
                  <td>{c.agencyName}</td>
                  <td>{c.registerLabel}</td>
                  <td>{c.cashierName}</td>
                  <td>{c.businessDate}</td>
                  <td>{fmt(c.openingAmount)}</td>
                  <td>{c.countedAmount != null ? fmt(c.countedAmount) : "—"}</td>
                  <td><strong className={Number(c.ecart) !== 0 ? "badge-due" : ""}>{fmt(c.ecart)}</strong></td>
                  <td>{c.cashierNote ?? <span className="muted">—</span>}</td>
                  <td>{c.status === "fermee" ? "Clôturée" : c.status === "validee" ? "Validée" : c.status === "refusee" ? "Refusée" : c.status}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      {canFund && (
        <section className="panel">
          <h2>Mise à disposition de fonds (double validation)</h2>
          <form onSubmit={createFund} className="inline-form">
            <select required value={fForm.fromAgencyId} onChange={(e) => setFForm({ ...fForm, fromAgencyId: e.target.value })}>
              <option value="">Agence source</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select required value={fForm.toAgencyId} onChange={(e) => setFForm({ ...fForm, toAgencyId: e.target.value })}>
              <option value="">Agence destinataire</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <AmountInput placeholder="Montant" required value={fForm.amount} onValueChange={(value) => setFForm({ ...fForm, amount: value })} />
            <button className="primary" disabled={loading} type="submit">Créer la demande</button>
          </form>
          {funds.length === 0 ? <p className="empty">Aucune demande.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Référence</th><th>De</th><th>Vers</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.id}>
                    <td>{f.reference}</td><td>{f.fromAgency}</td><td>{f.toAgency}</td><td>{fmt(f.amount)}</td><td>{FSTATUS[f.status] ?? f.status}</td>
                    <td><div className="actions">
                      {f.status === "demande" && <button className="secondary" onClick={() => void fundAction(f, "verify-balance")}>Vérifier solde</button>}
                      {f.status === "solde_verifie" && <button className="secondary" onClick={() => void fundAction(f, "authorize")}>Autoriser</button>}
                      {f.status === "autorise" && <button className="secondary" onClick={() => void fundAction(f, "confirm")}>Confirmer réception</button>}
                      {["demande", "solde_verifie", "autorise"].includes(f.status) && <button className="danger" onClick={() => void fundAction(f, "reject")}>Rejeter</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      )}
    </div>
  );
}
