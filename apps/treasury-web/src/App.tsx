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

interface Institution {
  id: string;
  name: string;
  isActive: boolean;
  version: number;
}

interface Placement {
  id: string;
  institutionId: string;
  institution?: Institution;
  principalAmount: string;
  currency: string;
  annualInterestRate: string;
  durationDays: number;
  depositMode: string;
  interestCalculationMode: string;
  startDate: string;
  status: "open" | "cancelled" | "closed";
  version: number;
}

const emptyPlacement = {
  institutionId: "",
  principalAmount: "",
  currency: "",
  annualInterestRate: "",
  durationDays: "",
  depositMode: "",
  interestCalculationMode: "",
  startDate: ""
};

export function App() {
  const auth = useAuth();
  if (!auth.token || !auth.user) {
    return <LoginPage applicationName="Gestion de la Trésorerie" />;
  }
  if (auth.user.mustChangePassword) {
    return <ChangePasswordPage applicationName="Gestion de la Trésorerie" />;
  }
  return (
    <AppShell title="Gestion de la Trésorerie">
      <TreasuryWorkspace />
    </AppShell>
  );
}

function TreasuryWorkspace() {
  const auth = useAuth();
  const [tab, setTab] = useState<"institutions" | "placements">("placements");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [institutionName, setInstitutionName] = useState("");
  const [placementForm, setPlacementForm] = useState(emptyPlacement);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [institutionResult, placementResult] = await Promise.all([
        auth.hasPermission("treasury:institutions:read")
          ? apiRequest<Paged<Institution>>("/api/v1/treasury/institutions?pageSize=100", {
              token: auth.token
            })
          : Promise.resolve({ items: [], total: 0 }),
        auth.hasPermission("treasury:placements:read")
          ? apiRequest<Paged<Placement>>("/api/v1/treasury/placements?pageSize=100", {
              token: auth.token
            })
          : Promise.resolve({ items: [], total: 0 })
      ]);
      setInstitutions(institutionResult.items);
      setPlacements(placementResult.items);
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInstitution(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/api/v1/treasury/institutions", {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify({ name: institutionName })
      });
      setInstitutionName("");
      setMessage({ type: "success", text: "Institution enregistrée." });
      await load();
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  async function createPlacement(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/api/v1/treasury/placements", {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify({
          ...placementForm,
          durationDays: Number(placementForm.durationDays)
        })
      });
      setPlacementForm(emptyPlacement);
      setMessage({ type: "success", text: "Placement enregistré." });
      await load();
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(placement: Placement, action: "cancel" | "close") {
    const label = action === "cancel" ? "annuler" : "clôturer";
    if (!window.confirm(`Confirmez-vous vouloir ${label} ce placement ?`)) {
      return;
    }
    const reason = window.prompt("Indiquez le motif de cette action :")?.trim();
    if (!reason) {
      setMessage({ type: "error", text: "Le motif est obligatoire." });
      return;
    }
    try {
      await apiRequest(`/api/v1/treasury/placements/${placement.id}/${action}`, {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify({ reason, version: placement.version })
      });
      setMessage({ type: "success", text: `Placement ${action === "cancel" ? "annulé" : "clôturé"}.` });
      await load();
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }

  return (
    <>
      <nav className="tabs" aria-label="Modules de trésorerie">
        <button className={tab === "placements" ? "active" : ""} onClick={() => setTab("placements")}>
          Placements
        </button>
        <button className={tab === "institutions" ? "active" : ""} onClick={() => setTab("institutions")}>
          Institutions
        </button>
      </nav>
      {message && <Message type={message.type}>{message.text}</Message>}
      {tab === "institutions" ? (
        <div className="grid">
          {auth.hasPermission("treasury:institutions:write") && (
            <section className="panel">
              <h2>Nouvelle institution</h2>
              <form onSubmit={createInstitution}>
                <label>
                  Nom de l'institution
                  <input
                    value={institutionName}
                    onChange={(event) => setInstitutionName(event.target.value)}
                    maxLength={240}
                    required
                  />
                </label>
                <button className="primary" disabled={loading} type="submit">
                  Enregistrer
                </button>
              </form>
            </section>
          )}
          <section className="panel">
            <h2>Institutions enregistrées</h2>
            {institutions.length === 0 ? (
              <p className="empty">Aucune institution enregistrée.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nom</th><th>État</th></tr></thead>
                  <tbody>
                    {institutions.map((item) => (
                      <tr key={item.id}><td>{item.name}</td><td>{item.isActive ? "Active" : "Inactive"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid">
          {auth.hasPermission("treasury:placements:write") && (
            <section className="panel">
              <h2>Ouvrir un placement</h2>
              {institutions.filter((item) => item.isActive).length === 0 ? (
                <Message type="info">Enregistrez d'abord une institution active.</Message>
              ) : (
                <form onSubmit={createPlacement}>
                  <label>Institution
                    <select required value={placementForm.institutionId} onChange={(e) => setPlacementForm({ ...placementForm, institutionId: e.target.value })}>
                      <option value="">Sélectionner</option>
                      {institutions.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label>Montant principal
                    <input inputMode="decimal" required value={placementForm.principalAmount} onChange={(e) => setPlacementForm({ ...placementForm, principalAmount: e.target.value })} />
                  </label>
                  <label>Devise (code ISO à trois lettres)
                    <input maxLength={3} required value={placementForm.currency} onChange={(e) => setPlacementForm({ ...placementForm, currency: e.target.value.toUpperCase() })} />
                  </label>
                  <label>Taux d'intérêt annuel (%)
                    <input inputMode="decimal" required value={placementForm.annualInterestRate} onChange={(e) => setPlacementForm({ ...placementForm, annualInterestRate: e.target.value })} />
                  </label>
                  <label>Durée en jours
                    <input type="number" min="1" required value={placementForm.durationDays} onChange={(e) => setPlacementForm({ ...placementForm, durationDays: e.target.value })} />
                  </label>
                  <label>Mode de dépôt
                    <input required value={placementForm.depositMode} onChange={(e) => setPlacementForm({ ...placementForm, depositMode: e.target.value })} />
                  </label>
                  <label>Mode de calcul des intérêts
                    <input required value={placementForm.interestCalculationMode} onChange={(e) => setPlacementForm({ ...placementForm, interestCalculationMode: e.target.value })} />
                  </label>
                  <label>Date de début
                    <input type="date" required value={placementForm.startDate} onChange={(e) => setPlacementForm({ ...placementForm, startDate: e.target.value })} />
                  </label>
                  <button className="primary" disabled={loading} type="submit">Enregistrer le placement</button>
                </form>
              )}
            </section>
          )}
          <section className="panel">
            <h2>Placements enregistrés</h2>
            {placements.length === 0 ? <p className="empty">Aucun placement enregistré.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Institution</th><th>Montant</th><th>Début</th><th>Durée</th><th>État</th><th>Actions</th></tr></thead>
                  <tbody>
                    {placements.map((item) => (
                      <tr key={item.id}>
                        <td>{item.institution?.name || institutions.find((institution) => institution.id === item.institutionId)?.name}</td>
                        <td>{item.principalAmount} {item.currency}</td>
                        <td>{item.startDate}</td>
                        <td>{item.durationDays} jours</td>
                        <td>{item.status === "open" ? "Ouvert" : item.status === "closed" ? "Clôturé" : "Annulé"}</td>
                        <td>
                          {item.status === "open" && <div className="actions">
                            {auth.hasPermission("treasury:placements:close") && <button className="secondary" onClick={() => void changeStatus(item, "close")}>Clôturer</button>}
                            {auth.hasPermission("treasury:placements:cancel") && <button className="danger" onClick={() => void changeStatus(item, "cancel")}>Annuler</button>}
                          </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
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
