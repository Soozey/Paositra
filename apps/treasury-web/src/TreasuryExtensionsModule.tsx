import { type FormEvent, useCallback, useEffect, useState } from "react";
import { AmountInput, apiRequest, Message, useAuth } from "@paositra/web-core";
import { fmt } from "./util";

interface Wallet { id: string; provider: string; label: string; walletNumber: string; currency: string; balance: string; pendingCount: string }
interface WalletEntry { id: string; operationDate: string; direction: string; amount: string; externalReference: string | null; label: string; status: string; version: number }
interface ImportBatch { id: string; originalName: string; importedRows: number; rejectedRows: number; importedAt: string; accountLabel: string }
interface AccountChoice { id: string; label: string }

export function TreasuryExtensionsModule({ accounts }: { accounts: AccountChoice[] }) {
  const auth = useAuth(); const canWalletRead = auth.hasPermission("treasury:wallets:read");
  const canWalletManage = auth.hasPermission("treasury:wallets:manage"); const canImport = auth.hasPermission("treasury:imports:manage");
  const [wallets, setWallets] = useState<Wallet[]>([]); const [entries, setEntries] = useState<Record<string, WalletEntry[]>>({});
  const [imports, setImports] = useState<ImportBatch[]>([]); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);
  const [walletForm, setWalletForm] = useState({ provider: "", label: "", walletNumber: "", currency: "MGA", openingBalance: "0" });
  const [entryForm, setEntryForm] = useState({ operationDate: new Date().toISOString().slice(0, 10), direction: "encaissement", amount: "", externalReference: "", label: "" });
  const [importAccount, setImportAccount] = useState(""); const [importFile, setImportFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      if (canWalletRead) setWallets((await apiRequest<{ items: Wallet[] }>("/api/v1/treasury/wallets", { token: auth.token })).items);
      if (auth.hasPermission("treasury:imports:read")) setImports((await apiRequest<{ items: ImportBatch[] }>("/api/v1/treasury/bank-imports", { token: auth.token })).items);
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Chargement impossible." }); }
  }, [auth.token, canWalletRead]);
  useEffect(() => { void load(); }, [load]);

  async function createWallet(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest("/api/v1/treasury/wallets", { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(walletForm) });
      setWalletForm({ provider: "", label: "", walletNumber: "", currency: "MGA", openingBalance: "0" }); setMessage({ type: "success", text: "Portefeuille enregistré." }); await load();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Enregistrement impossible." }); } finally { setBusy(false); }
  }
  async function loadEntries(id: string) {
    try { const result = await apiRequest<{ items: WalletEntry[] }>(`/api/v1/treasury/wallets/${id}/entries`, { token: auth.token }); setEntries((old) => ({ ...old, [id]: result.items })); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Chargement impossible." }); }
  }
  async function addEntry(event: FormEvent, walletId: string) {
    event.preventDefault(); setBusy(true);
    try { await apiRequest(`/api/v1/treasury/wallets/${walletId}/entries`, { method: "POST", token: auth.token, idempotent: true,
      body: JSON.stringify({ ...entryForm, externalReference: entryForm.externalReference || undefined }) });
      setEntryForm({ ...entryForm, amount: "", externalReference: "", label: "" }); setMessage({ type: "success", text: "Mouvement enregistré et placé en attente de validation." }); await loadEntries(walletId); await load();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Enregistrement impossible." }); } finally { setBusy(false); }
  }
  async function setEntryStatus(walletId: string, entry: WalletEntry, target: string) {
    try { await apiRequest(`/api/v1/treasury/wallets/entries/${entry.id}/status`, { method: "POST", token: auth.token, idempotent: true, body: JSON.stringify({ target, version: entry.version }) }); await loadEntries(walletId); await load(); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Traitement impossible." }); }
  }
  async function importStatement(event: FormEvent) {
    event.preventDefault(); if (!importFile || !importAccount) return; setBusy(true);
    const body = new FormData(); body.append("file", importFile);
    try { const result = await apiRequest<{ imported: number; rejected: number }>(`/api/v1/treasury/bank-imports/${importAccount}`, { method: "POST", token: auth.token, body });
      setMessage({ type: "success", text: `${result.imported} ligne(s) importée(s), ${result.rejected} rejetée(s).` }); setImportFile(null); await load();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Import impossible." }); } finally { setBusy(false); }
  }

  return <>
    {message && <div className="wide-panel"><Message type={message.type}>{message.text}</Message></div>}
    {canWalletRead && <section className="panel wide-panel">
      <div className="panel-head"><div><h2>Portefeuilles électroniques</h2><p className="muted">Mouvements persistés, contrôlés puis validés avant impact sur le solde.</p></div></div>
      {canWalletManage && <form className="inline-form" onSubmit={createWallet}>
        <input required placeholder="Opérateur" value={walletForm.provider} onChange={(e) => setWalletForm({ ...walletForm, provider: e.target.value })} />
        <input required placeholder="Libellé" value={walletForm.label} onChange={(e) => setWalletForm({ ...walletForm, label: e.target.value })} />
        <input required placeholder="N° portefeuille" value={walletForm.walletNumber} onChange={(e) => setWalletForm({ ...walletForm, walletNumber: e.target.value })} />
        <AmountInput placeholder="Solde initial" value={walletForm.openingBalance} onValueChange={(value) => setWalletForm({ ...walletForm, openingBalance: value })} />
        <button className="primary" disabled={busy}>Créer</button>
      </form>}
      <div className="table-wrap"><table><thead><tr><th>Opérateur</th><th>Portefeuille</th><th>Numéro</th><th>Solde</th><th>À valider</th><th>Actions</th></tr></thead>
        <tbody>{wallets.length === 0 ? <tr><td className="empty" colSpan={6}>Aucun portefeuille électronique enregistré.</td></tr> : wallets.map((wallet) => <tr key={wallet.id}>
          <td>{wallet.provider}</td><td>{wallet.label}</td><td>{wallet.walletNumber}</td><td>{fmt(wallet.balance)} {wallet.currency}</td><td>{wallet.pendingCount}</td>
          <td><button className="secondary" onClick={() => void loadEntries(wallet.id)}>Mouvements</button>
            {entries[wallet.id] && <div className="subtable"><table><thead><tr><th>Date</th><th>Sens</th><th>Montant</th><th>Référence</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>{(entries[wallet.id] ?? []).length === 0 ? <tr><td className="empty" colSpan={6}>Aucun mouvement.</td></tr> : (entries[wallet.id] ?? []).map((entry) => <tr key={entry.id}>
                <td>{entry.operationDate}</td><td>{entry.direction}</td><td>{fmt(entry.amount)}</td><td>{entry.externalReference || "-"}</td><td>{entry.status.replaceAll("_", " ")}</td>
                <td>{entry.status === "a_valider" && canWalletManage && <div className="actions"><button className="secondary" onClick={() => void setEntryStatus(wallet.id, entry, "valide")}>Valider</button><button className="danger" onClick={() => void setEntryStatus(wallet.id, entry, "rejete")}>Rejeter</button></div>}</td></tr>)}</tbody></table>
              {canWalletManage && <form className="inline-form" onSubmit={(e) => addEntry(e, wallet.id)}>
                <input type="date" required value={entryForm.operationDate} onChange={(e) => setEntryForm({ ...entryForm, operationDate: e.target.value })} />
                <select value={entryForm.direction} onChange={(e) => setEntryForm({ ...entryForm, direction: e.target.value })}><option value="encaissement">Encaissement</option><option value="decaissement">Décaissement</option></select>
                <AmountInput required placeholder="Montant" value={entryForm.amount} onValueChange={(value) => setEntryForm({ ...entryForm, amount: value })} />
                <input placeholder="Référence externe" value={entryForm.externalReference} onChange={(e) => setEntryForm({ ...entryForm, externalReference: e.target.value })} />
                <input required placeholder="Libellé" value={entryForm.label} onChange={(e) => setEntryForm({ ...entryForm, label: e.target.value })} />
                <button className="primary" disabled={busy}>Ajouter</button></form>}
            </div>}</td></tr>)}</tbody></table></div>
    </section>}
    {auth.hasPermission("treasury:imports:read") && <section className="panel wide-panel">
      <div className="panel-head"><div><h2>Imports de relevés bancaires</h2><p className="muted">CSV attendu : date, sens, montant, libelle, reference. Les doublons sont rejetés.</p></div></div>
      {canImport && <form className="inline-form" onSubmit={importStatement}>
        <select required value={importAccount} onChange={(e) => setImportAccount(e.target.value)}><option value="">Compte destinataire</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select>
        <input required type="file" accept=".csv,text/csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
        <button className="primary" disabled={busy || !importFile}>Importer</button>
      </form>}
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Compte</th><th>Fichier</th><th>Importées</th><th>Rejetées</th></tr></thead>
        <tbody>{imports.length === 0 ? <tr><td className="empty" colSpan={5}>Aucun relevé bancaire importé.</td></tr> : imports.map((batch) => <tr key={batch.id}><td>{new Date(batch.importedAt).toLocaleString("fr-FR")}</td><td>{batch.accountLabel}</td><td>{batch.originalName}</td><td>{batch.importedRows}</td><td>{batch.rejectedRows}</td></tr>)}</tbody></table></div>
    </section>}
  </>;
}
