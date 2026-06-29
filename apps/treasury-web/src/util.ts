export const API_BASE =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:3000";

export async function downloadFile(token: string | null, path: string, filename: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return "Export impossible (droits insuffisants ou erreur serveur).";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return null;
}

export const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100];
export function billetageTotal(b: Record<string, number>): number {
  return DENOMS.reduce((s, d) => s + d * (Number(b[String(d)]) || 0), 0);
}
export const fmt = (n: number | string) => Number(n).toLocaleString("fr-FR");
