import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile, fmt } from "./util";
import { TreasuryExtensionsModule } from "./TreasuryExtensionsModule";

interface Account { id: string; label: string; bank: string; accountNumber: string; currency: string; openingBalance: string; status: string; version: number; balance: string }
interface Entry { id: string; entryDate: string; direction: string; amount: string; pieceReference: string | null; label: string; reconciled: boolean }
interface Cheque { id: string; chequeNumber: string; beneficiary: string; amount: string; status: string; issueDate: string; version: number; accountLabel: string }
interface Institution { id: string; name: string }

const CSTATUS: Record<string, string> = { emis: "Émis", en_circulation: "En circulation", encaisse: "Encaissé", annule: "Annulé", expire: "Expiré" };

export function CurrentAccountsModule() {
  const auth = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry[]>>({});
  const [accForm, setAccForm] = useState({ label: "", bank: "", accountNumber: "", currency: "MGA", openingBalance: "0" });
  const [entryForm, setEntryForm] = useState({ entryDate: new Date().toISOString().slice(0, 10), direction: "encaissement", amount: "", pieceReference: "", label: "" });
  const [chForm, setChForm] = useState({ accountId: "", chequeNumber: "", beneficiary: "", amount: "", issueDate: new Date().toISOString().slice(0, 10) });
  const [msg, setMsg] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const canManage = auth.hasPermission("treasury:accounts:manage");

  const load = useCallback(async () => {
    try {
      const [a, c, i] = await Promise.all([
        apiRequest<{ items: Account[] }>("/api/v1/treasury/accounts", { token: auth.token }),
        apiRequest<Cheque[]>("/api/v1/treasury/cheques", { token: auth.token }),
        auth.hasPermission("treasury:institutions:read")
          ? apiRequest<{ items: Institution[] }>("/api/v1/treasury/institutions?pageSize=100", { token: auth.token })
          : Promise.resolve({ items: [] })
      ]);
      setAccounts(a.items); setCheques(c); setInstitutions(i.items);
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Chargement impossible." }); }
  }, [auth.token]);
  useEffect(() => { void load(); }, [load]);

  async function loadEntries(id: string) {
    try { const r = await apiRequest<Entry[]>(`/api/v1/treasury/accounts/${id}/entries`, { token: auth.token }); setEntries((p) => ({ ...p, [id]: r })); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }
  async function createAccount(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await apiRequest("/api/v1/treasury/accounts", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(accForm) });
      setMsg({ type: "success", text: "Compte créé." }); setAccForm({ label: "", bank: "", accountNumber: "", currency: "MGA", openingBalance: "0" }); await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function addEntry(e: FormEvent, accId: string) {
    e.preventDefault(); setLoading(true);
    try { await apiRequest(`/api/v1/treasury/accounts/${accId}/entries`, { method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ ...entryForm, pieceReference: entryForm.pieceReference || undefined }) });
      setMsg({ type: "success", text: "Écriture ajoutée." }); setEntryForm({ ...entryForm, amount: "", pieceReference: "", label: "" }); await loadEntries(accId); await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function reconcile(entryId: string, accId: string) {
    try { await apiRequest(`/api/v1/treasury/accounts/entries/${entryId}/reconcile`, { method: "POST", token: auth.token, idempotent: true }); await loadEntries(accId); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }
  async function createCheque(e: FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await apiRequest("/api/v1/treasury/cheques", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(chForm) });
      setMsg({ type: "success", text: "Chèque créé." }); setChForm({ ...chForm, chequeNumber: "", beneficiary: "", amount: "" }); await load();
    } catch (err) { setMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur." }); } finally { setLoading(false); }
  }
  async function chequeStatus(c: Cheque, target: string) {
    let reason: string | undefined;
    if (target === "annule") { reason = window.prompt("Motif d'annulation :")?.trim(); if (!reason) return; }
    try { await apiRequest(`/api/v1/treasury/cheques/${c.id}/status`, { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ target, reason, version: c.version }) }); await load(); }
    catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Erreur." }); }
  }

  return (
    <div className="grid">
      {msg && <div className="wide-panel"><Message type={msg.type}>{msg.text}</Message></div>}
      {canManage && (
        <section className="panel">
          <h2>Nouveau compte courant</h2>
          <form onSubmit={createAccount} className="inline-form">
            <input placeholder="Libellé" required value={accForm.label} onChange={(e) => setAccForm({ ...accForm, label: e.target.value })} />
            <input list="treasury-institutions" placeholder="Banque, CCP ou caisse interne" required value={accForm.bank} onChange={(e) => setAccForm({ ...accForm, bank: e.target.value })} />
            <datalist id="treasury-institutions">
              {institutions.map((institution) => <option key={institution.id} value={institution.name} />)}
              <option value="CCP" />
              <option value="Caisse interne" />
            </datalist>
            <input placeholder="N° compte" required value={accForm.accountNumber} onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })} />
            <AmountInput placeholder="Solde initial" value={accForm.openingBalance} onValueChange={(value) => setAccForm({ ...accForm, openingBalance: value })} />
            <button className="primary" disabled={loading} type="submit">Créer</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>Comptes courants</h2>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/account-journal.xlsx", "journal-comptes-DEMO.xlsx").then((e) => e && setMsg({ type: "error", text: e }))}>Journal Excel</button>
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/account-journal.pdf", "journal-comptes-DEMO.pdf").then((e) => e && setMsg({ type: "error", text: e }))}>Journal PDF</button>
          </div>
        </div>
        <div className="table-wrap"><table>
            <thead><tr><th>Libellé</th><th>Banque</th><th>Devise</th><th>Solde</th><th>Actions</th></tr></thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={5} className="empty">Aucun compte courant n'est enregistré dans ce périmètre. Le gabarit est prêt pour l'initialisation validée.</td></tr>
              ) : accounts.map((a) => {
                const list = entries[a.id];
                return (
                  <tr key={a.id}>
                    <td>{a.label}</td><td>{a.bank}</td><td>{a.currency}</td><td><strong>{fmt(a.balance)}</strong></td>
                    <td>
                      <button className="secondary" onClick={() => void loadEntries(a.id)}>Journal</button>
                      {list && (
                        <div className="subtable">
                          {list.length === 0 ? <p className="empty">Aucune écriture.</p> : (
                            <table><thead><tr><th>Date</th><th>Sens</th><th>Montant</th><th>Libellé</th><th>Rappr.</th><th></th></tr></thead>
                              <tbody>{list.map((en) => (
                                <tr key={en.id}><td>{en.entryDate}</td><td>{en.direction}</td><td>{fmt(en.amount)}</td><td>{en.label}</td>
                                  <td>{en.reconciled ? "✓" : "—"}</td>
                                  <td>{!en.reconciled && canManage && <button className="link" onClick={() => void reconcile(en.id, a.id)}>Rapprocher</button>}</td>
                                </tr>))}</tbody></table>
                          )}
                          {canManage && (
                            <form onSubmit={(e) => addEntry(e, a.id)} className="inline-form">
                              <input type="date" required value={entryForm.entryDate} onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })} />
                              <select value={entryForm.direction} onChange={(e) => setEntryForm({ ...entryForm, direction: e.target.value })}><option value="encaissement">Encaissement</option><option value="decaissement">Décaissement</option></select>
                              <AmountInput placeholder="Montant" required value={entryForm.amount} onValueChange={(value) => setEntryForm({ ...entryForm, amount: value })} />
                              <input placeholder="Libellé" required value={entryForm.label} onChange={(e) => setEntryForm({ ...entryForm, label: e.target.value })} />
                              <button className="primary" disabled={loading} type="submit">Ajouter écriture</button>
                            </form>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Chèques</h2>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/cheques-register.xlsx", "registre-cheques-DEMO.xlsx").then((e) => e && setMsg({ type: "error", text: e }))}>Registre Excel</button>
            <button className="secondary" type="button" onClick={() => void downloadFile(auth.token, "/api/v1/treasury/cheques-register.pdf", "registre-cheques-DEMO.pdf").then((e) => e && setMsg({ type: "error", text: e }))}>Registre PDF</button>
          </div>
        </div>
        {canManage && accounts.length > 0 && (
          <form onSubmit={createCheque} className="inline-form">
            <select required value={chForm.accountId} onChange={(e) => setChForm({ ...chForm, accountId: e.target.value })}><option value="">Compte</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
            <input placeholder="N° chèque" required value={chForm.chequeNumber} onChange={(e) => setChForm({ ...chForm, chequeNumber: e.target.value })} />
            <input placeholder="Bénéficiaire" required value={chForm.beneficiary} onChange={(e) => setChForm({ ...chForm, beneficiary: e.target.value })} />
            <AmountInput placeholder="Montant" required value={chForm.amount} onValueChange={(value) => setChForm({ ...chForm, amount: value })} />
            <button className="primary" disabled={loading} type="submit">Émettre</button>
          </form>
        )}
        <div className="table-wrap"><table>
            <thead><tr><th>N°</th><th>Bénéficiaire</th><th>Montant</th><th>Compte</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{cheques.length === 0 ? (
              <tr><td colSpan={6} className="empty">Aucun chèque n'est enregistré. Le registre vide peut être exporté en PDF ou Excel.</td></tr>
            ) : cheques.map((c) => (
              <tr key={c.id}><td>{c.chequeNumber}</td><td>{c.beneficiary}</td><td>{fmt(c.amount)}</td><td>{c.accountLabel}</td><td>{CSTATUS[c.status] ?? c.status}</td>
                <td><div className="actions">
                  {c.status === "emis" && canManage && <button className="secondary" onClick={() => void chequeStatus(c, "en_circulation")}>En circulation</button>}
                  {c.status === "en_circulation" && canManage && <button className="secondary" onClick={() => void chequeStatus(c, "encaisse")}>Encaissé</button>}
                  {["emis", "en_circulation"].includes(c.status) && canManage && <button className="danger" onClick={() => void chequeStatus(c, "annule")}>Annuler</button>}
                </div></td>
              </tr>))}</tbody>
          </table></div>
      </section>
      <TreasuryExtensionsModule accounts={accounts.map(({ id, label }) => ({ id, label }))} />
    </div>
  );
}
