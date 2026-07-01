import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, Message, useAuth } from "@paositra/web-core";
import { downloadFile } from "./util";

interface Attachment { id: string; originalName: string; mediaType: string; sizeBytes: string; uploadedAt: string }

export function AttachmentsPanel({ objectType, objectId, title = "Pièces jointes" }: { objectType: string; objectId: string; title?: string }) {
  const auth = useAuth(); const [items, setItems] = useState<Attachment[]>([]); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const canManage = auth.hasPermission("treasury:attachments:manage");
  const load = useCallback(async () => {
    try { setItems((await apiRequest<{ items: Attachment[] }>(`/api/v1/treasury/attachments/objects/${objectType}/${objectId}`, { token: auth.token })).items); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Chargement impossible." }); }
  }, [auth.token, objectId, objectType]);
  useEffect(() => { void load(); }, [load]);
  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) return; setBusy(true); const body = new FormData(); body.append("file", file);
    try { await apiRequest(`/api/v1/treasury/attachments/objects/${objectType}/${objectId}`, { method: "POST", token: auth.token, body });
      setFile(null); setMessage({ type: "success", text: "Pièce jointe enregistrée." }); await load();
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Envoi impossible." }); } finally { setBusy(false); }
  }
  async function archive(id: string) {
    try { await apiRequest(`/api/v1/treasury/attachments/file/${id}/archive`, { method: "POST", token: auth.token, idempotent: true }); await load(); }
    catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Archivage impossible." }); }
  }
  return <div className="subtable attachment-panel">
    <h3>{title}</h3>{message && <Message type={message.type}>{message.text}</Message>}
    {canManage && <form className="inline-form" onSubmit={upload}>
      <input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button className="primary" disabled={busy || !file}>{busy ? "Envoi en cours…" : "Ajouter"}</button>
    </form>}
    <div className="table-wrap"><table><thead><tr><th>Document</th><th>Type</th><th>Taille</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>{items.length === 0 ? <tr><td colSpan={5} className="empty">Aucune pièce jointe enregistrée.</td></tr> : items.map((item) => <tr key={item.id}>
        <td>{item.originalName}</td><td>{item.mediaType}</td><td>{(Number(item.sizeBytes) / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko</td><td>{new Date(item.uploadedAt).toLocaleString("fr-FR")}</td>
        <td><div className="actions"><button className="secondary" onClick={() => void downloadFile(auth.token, `/api/v1/treasury/attachments/file/${item.id}`, item.originalName)}>Télécharger</button>
          {canManage && <button className="danger" onClick={() => void archive(item.id)}>Archiver</button>}</div></td></tr>)}</tbody></table></div>
  </div>;
}
