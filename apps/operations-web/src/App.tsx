import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  AppShell,
  ChangePasswordPage,
  LoginPage,
  Message,
  apiRequest,
  useAuth
} from "@paositra/web-core";

interface Paged<T> {
  items: T[];
  total: number;
}

interface Agency {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  parentOrgan: string | null;
  cashMaxAmount: string | null;
  postalValueMaxAmount: string | null;
  foreignCurrencyMaxAmount: string | null;
  managerManagementStartDate: string | null;
  status: "open" | "closed";
  version: number;
}

const emptyAgency = {
  code: "",
  name: "",
  zone: "",
  parentOrgan: "",
  cashMaxAmount: "",
  postalValueMaxAmount: "",
  foreignCurrencyMaxAmount: "",
  managerManagementStartDate: ""
};

export function App() {
  const auth = useAuth();
  if (!auth.token || !auth.user) {
    return <LoginPage applicationName="Gestion des opérations" />;
  }
  if (auth.user.mustChangePassword) {
    return <ChangePasswordPage applicationName="Gestion des opérations" />;
  }
  return (
    <AppShell title="Gestion des opérations">
      <AgenciesWorkspace />
    </AppShell>
  );
}

function AgenciesWorkspace() {
  const auth = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState(emptyAgency);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!auth.hasPermission("operations:agencies:read")) {
      return;
    }
    try {
      const result = await apiRequest<Paged<Agency>>(
        "/api/v1/operations/agencies?pageSize=100",
        { token: auth.token }
      );
      setAgencies(result.items);
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAgency(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== "")
    );
    try {
      await apiRequest("/api/v1/operations/agencies", {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify(payload)
      });
      setForm(emptyAgency);
      await load();
      setMessage({ type: "success", text: "Agence ouverte et enregistrée." });
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  async function closeAgency(agency: Agency) {
    if (!window.confirm(`Confirmez-vous la fermeture de l'agence ${agency.name} ?`)) {
      return;
    }
    const reason = window.prompt("Indiquez le motif de fermeture :")?.trim();
    if (!reason) {
      setMessage({ type: "error", text: "Le motif de fermeture est obligatoire." });
      return;
    }
    try {
      await apiRequest(`/api/v1/operations/agencies/${agency.id}/close`, {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify({ reason, version: agency.version })
      });
      await load();
      setMessage({ type: "success", text: "Agence fermée. Son historique est conservé." });
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }

  return (
    <>
      {message && <Message type={message.type}>{message.text}</Message>}
      <div className="grid">
        {auth.hasPermission("operations:agencies:write") && (
          <section className="panel">
            <h2>Ouvrir une agence</h2>
            <form onSubmit={createAgency}>
              <label>Code agence
                <input required maxLength={80} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </label>
              <label>Nom de l'agence
                <input required maxLength={240} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>Zone
                <input maxLength={160} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
              </label>
              <label>Organe de rattachement
                <input maxLength={240} value={form.parentOrgan} onChange={(e) => setForm({ ...form, parentOrgan: e.target.value })} />
              </label>
              <label>Maximum autorisé en numéraire
                <input inputMode="decimal" value={form.cashMaxAmount} onChange={(e) => setForm({ ...form, cashMaxAmount: e.target.value })} />
              </label>
              <label>Maximum autorisé en valeurs postales
                <input inputMode="decimal" value={form.postalValueMaxAmount} onChange={(e) => setForm({ ...form, postalValueMaxAmount: e.target.value })} />
              </label>
              <label>Maximum autorisé en monnaie étrangère
                <input inputMode="decimal" value={form.foreignCurrencyMaxAmount} onChange={(e) => setForm({ ...form, foreignCurrencyMaxAmount: e.target.value })} />
              </label>
              <label>Date de début de gestion du chef d'agence
                <input type="date" value={form.managerManagementStartDate} onChange={(e) => setForm({ ...form, managerManagementStartDate: e.target.value })} />
              </label>
              <button className="primary" disabled={loading} type="submit">
                {loading ? "Enregistrement..." : "Ouvrir l'agence"}
              </button>
            </form>
          </section>
        )}
        <section className="panel">
          <h2>Agences enregistrées</h2>
          {agencies.length === 0 ? (
            <p className="empty">Aucune agence enregistrée.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Code</th><th>Agence</th><th>Zone</th><th>État</th><th>Actions</th></tr></thead>
                <tbody>
                  {agencies.map((agency) => (
                    <tr key={agency.id}>
                      <td>{agency.code}</td>
                      <td>{agency.name}</td>
                      <td>{agency.zone || "Non renseignée"}</td>
                      <td>{agency.status === "open" ? "Ouverte" : "Fermée"}</td>
                      <td>
                        {agency.status === "open" && auth.hasPermission("operations:agencies:close") && (
                          <button className="danger" onClick={() => void closeAgency(agency)} type="button">
                            Fermer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function handleApiError(
  error: unknown,
  clearSession: () => void,
  setMessage: (message: { type: "error"; text: string }) => void
) {
  if (error instanceof ApiError && error.status === 401) {
    clearSession();
    return;
  }
  setMessage({
    type: "error",
    text: error instanceof Error ? error.message : "L'action n'a pas pu être effectuée."
  });
}
