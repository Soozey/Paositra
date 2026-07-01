import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CurrentAccountsModule } from "./CurrentAccountsModule";
import { BudgetModule } from "./BudgetModule";
import { TreasuryDashboardModule } from "./TreasuryDashboardModule";
import {
  AmountInput,
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
  status: "open" | "cancelled" | "closed" | "renewed" | "repatriated";
  version: number;
}

interface AuditEvent {
  id: string;
  occurredAt: string;
  action: string;
  objectType: string;
  objectId: string | null;
  actorUserId: string | null;
}

interface RbacRole {
  id: string;
  code: string;
  label: string;
  lot: string;
  scopeType: string;
  description: string | null;
  status: string;
}

type TreasuryTab =
  | "guide"
  | "institutions"
  | "placements"
  | "receivables"
  | "accounts"
  | "budget"
  | "dashboard"
  | "roles"
  | "clarifications"
  | "users"
  | "audit";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

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

const emptyUserForm = {
  email: "",
  displayName: "",
  password: "",
  mustChangePassword: true
};

const currencyOptions = ["MGA", "EUR", "USD"];
const depositModeOptions = [
  "Dépôt à terme",
  "Compte bancaire",
  "Espèces en caisse",
  "Virement bancaire",
  "Chèque"
];
const interestModeOptions = [
  "Exact/365",
  "Exact/360",
  "30/360",
  "Simple/360",
  "Simple/365"
];


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
      {DEMO_MODE && (
        <div className="demo-banner">
          MODE PRÉSENTATION — DONNÉES NON CONTRACTUELLES
        </div>
      )}
      <TreasuryWorkspace />
    </AppShell>
  );
}


function TreasuryWorkspace() {
  const auth = useAuth();
  const [tab, setTab] = useState<TreasuryTab>("guide");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [institutionName, setInstitutionName] = useState("");
  const [placementForm, setPlacementForm] = useState(emptyPlacement);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<{ interest: number; total: number; maturityDate: string; basis: string } | null>(null);
  const [insights, setInsights] = useState<Array<{ id: string; maturityDate: string; daysRemaining: number; maturingSoon: boolean }>>([]);
  const canSeeClarifications = [
    "demo.admin@paositra-demo.mg",
    "demo.admin@paositra.local"
  ].includes(auth.user?.email ?? "");
  const hasTreasuryBusinessAccess =
    auth.hasPermission("treasury:dashboard:read") ||
    auth.hasPermission("treasury:institutions:read") ||
    auth.hasPermission("treasury:placements:read") ||
    auth.hasPermission("treasury:receivables:read") ||
    auth.hasPermission("treasury:accounts:read") ||
    auth.hasPermission("treasury:budget:read");

  const load = useCallback(async () => {
    try {
      const [institutionResult, placementResult, auditResult, rolesResult] = await Promise.all([
        auth.hasPermission("treasury:institutions:read")
          ? apiRequest<Paged<Institution>>("/api/v1/treasury/institutions?pageSize=100", {
              token: auth.token
            })
          : Promise.resolve({ items: [], total: 0 }),
        auth.hasPermission("treasury:placements:read")
          ? apiRequest<Paged<Placement>>("/api/v1/treasury/placements?pageSize=100", {
              token: auth.token
            })
          : Promise.resolve({ items: [], total: 0 }),
        auth.hasPermission("platform:audit:read")
          ? apiRequest<Paged<AuditEvent>>("/api/v1/platform/audit-events?pageSize=20", {
              token: auth.token
            })
          : Promise.resolve({ items: [], total: 0 }),
        auth.hasPermission("platform:roles:read")
          ? apiRequest<{ items: RbacRole[] }>("/api/v1/platform/roles", { token: auth.token })
          : Promise.resolve({ items: [] })
      ]);
      setInstitutions(institutionResult.items);
      setPlacements(placementResult.items);
      setAuditEvents(auditResult.items);
      setRoles(rolesResult.items);
      if (auth.hasPermission("treasury:placements:read")) {
        try {
          const ins = await apiRequest<{ items: Array<{ id: string; maturityDate: string; daysRemaining: number; maturingSoon: boolean }> }>(
            "/api/v1/treasury/placements/insights",
            { token: auth.token }
          );
          setInsights(ins.items ?? []);
        } catch {
          /* échéancier non bloquant */
        }
      }
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleTabs: Array<{ id: TreasuryTab; label: string }> = [
    hasTreasuryBusinessAccess && { id: "guide", label: "Guide démo Lot 1" },
    auth.hasPermission("treasury:placements:read") && { id: "placements", label: "Placements" },
    auth.hasPermission("treasury:receivables:read") && { id: "receivables", label: "Créances" },
    auth.hasPermission("treasury:accounts:read") && { id: "accounts", label: "Comptes courants" },
    auth.hasPermission("treasury:budget:read") && { id: "budget", label: "Budget" },
    auth.hasPermission("treasury:dashboard:read") && { id: "dashboard", label: "Tableau de bord" },
    auth.hasPermission("treasury:institutions:read") && { id: "institutions", label: "Institutions" },
    auth.hasPermission("platform:roles:read") && { id: "roles", label: "Rôles & habilitations" },
    canSeeClarifications && { id: "clarifications", label: "Parcours à cadrer" },
    auth.hasPermission("platform:users:manage") && { id: "users", label: "Utilisateurs" },
    auth.hasPermission("platform:audit:read") && { id: "audit", label: "Audit" }
  ].filter(Boolean) as Array<{ id: TreasuryTab; label: string }>;
  const canSeeCurrentTab = visibleTabs.some((item) => item.id === tab);

  useEffect(() => {
    if (!canSeeCurrentTab && visibleTabs[0]) {
      setTab(visibleTabs[0].id);
    }
  }, [auth.user, canSeeCurrentTab, tab, visibleTabs]);

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

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiRequest("/api/v1/platform/users", {
        method: "POST",
        token: auth.token,
        idempotent: true,
        body: JSON.stringify(userForm)
      });
      setUserForm(emptyUserForm);
      setMessage({
        type: "success",
        text: "Utilisateur créé. Aucune permission métier n'est attribuée automatiquement."
      });
      await load();
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  async function simulate() {
    setLoading(true);
    try {
      const r = await apiRequest<{ interest: number; total: number; maturityDate: string; basis: string }>(
        "/api/v1/treasury/placements/simulate",
        {
          method: "POST",
          token: auth.token,
          body: JSON.stringify({
            principalAmount: Number(placementForm.principalAmount),
            annualInterestRate: Number(placementForm.annualInterestRate),
            durationDays: Number(placementForm.durationDays),
            basis: (placementForm.interestCalculationMode || "").includes("365") ? "365" : "360",
            startDate: placementForm.startDate,
            currency: placementForm.currency || "MGA"
          })
        }
      );
      setSimResult(r);
      setMessage({ type: "success", text: `Intérêts simulés : ${r.interest.toLocaleString("fr-FR")} — échéance ${r.maturityDate}.` });
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  async function renewPlacement(p: Placement) {
    const reason = window.prompt("Motif du renouvellement :")?.trim();
    if (!reason) { setMessage({ type: "error", text: "Le motif est obligatoire." }); return; }
    const d = window.prompt("Nouvelle durée en jours (vide = identique) :")?.trim();
    try {
      await apiRequest(`/api/v1/treasury/placements/${p.id}/renew`, {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ reason, version: p.version, ...(d ? { durationDays: Number(d) } : {}) })
      });
      setMessage({ type: "success", text: "Placement renouvelé : un nouveau placement ouvert a été créé." });
      await load();
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }

  async function repatriatePlacement(p: Placement) {
    if (!window.confirm("Confirmer le rapatriement (capital + intérêts) ?")) return;
    const reason = window.prompt("Motif du rapatriement :")?.trim();
    if (!reason) { setMessage({ type: "error", text: "Le motif est obligatoire." }); return; }
    try {
      const r = await apiRequest<{ total: number }>(`/api/v1/treasury/placements/${p.id}/repatriate`, {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ reason, version: p.version })
      });
      setMessage({ type: "success", text: `Rapatrié : total ${Number(r.total).toLocaleString("fr-FR")} ${p.currency}.` });
      await load();
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }

  async function downloadExport(path: string, filename: string) {
    try {
      const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) { setMessage({ type: "error", text: "Export impossible (droits insuffisants ?)." }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }

  return (
    <>
      {hasTreasuryBusinessAccess && <section className="panel module-home">
        <div>
          <p className="eyebrow">LOT 1 — TRÉSORERIE</p>
          <h2>Modules opérationnels</h2>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>Institutions financières</span>
            <strong>{institutions.length}</strong>
            <small>Données issues du référentiel financier chargé dans la démonstration. Les institutions officielles restent à confirmer par PAOSITRA.</small>
          </div>
          <div className="kpi-card">
            <span>Placements</span>
            <strong>{placements.length}</strong>
            <small>Placements enregistrés dans le périmètre autorisé du compte connecté.</small>
          </div>
          <div className="kpi-card">
            <span>Rôles proposés</span>
            <strong>{roles.length}</strong>
            <small>Rôles de travail proposés pour la démonstration, à valider ou corriger par PAOSITRA.</small>
          </div>
          <div className="kpi-card">
            <span>Audit consultable</span>
            <strong>{auditEvents.length}</strong>
            <small>Dernières actions enregistrées dans la piste d'audit de la démonstration.</small>
          </div>
        </div>
      </section>}
      <nav className="tabs" aria-label="Modules de tresorerie">
        {visibleTabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      {message && <Message type={message.type}>{message.text}</Message>}
      {visibleTabs.length === 0 ? (
        <Message type="info">Votre profil ne couvre pas ce module. Les informations affichées sont limitées à votre périmètre.</Message>
      ) : !canSeeCurrentTab ? (
        <Message type="info">Votre profil ne couvre pas ce module. Les informations affichées sont limitées à votre périmètre.</Message>
      ) : tab === "guide" ? (
        <TreasuryDemoGuide
          canOpen={(target) => visibleTabs.some((item) => item.id === target)}
          onOpen={setTab}
        />
      ) : tab === "dashboard" ? (
        <TreasuryDashboardModule />
      ) : tab === "budget" ? (
        <BudgetModule />
      ) : tab === "accounts" ? (
        <CurrentAccountsModule />
      ) : tab === "receivables" ? (
        <TreasuryReceivables />
      ) : tab === "roles" ? (
        <TreasuryRolesHabilitations roles={roles} />
      ) : tab === "clarifications" ? (
        <TreasuryPointsAClarifier />
      ) : tab === "institutions" ? (
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
      ) : tab === "users" ? (
        <div className="grid">
          {auth.hasPermission("platform:users:manage") ? (
            <section className="panel">
              <h2>Créer un utilisateur technique</h2>
              <Message type="info">La création ne donne aucun droit automatiquement. Les habilitations contractuelles restent à valider.</Message>
              <form onSubmit={createUser}>
                <label>Adresse e-mail
                  <input type="email" required value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
                </label>
                <label>Nom affiché
                  <input required maxLength={200} value={userForm.displayName} onChange={(event) => setUserForm({ ...userForm, displayName: event.target.value })} />
                </label>
                <label>Mot de passe temporaire
                  <input type="password" required minLength={12} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={userForm.mustChangePassword} onChange={(event) => setUserForm({ ...userForm, mustChangePassword: event.target.checked })} />
                  Changement obligatoire au premier accès
                </label>
                <button className="primary" disabled={loading} type="submit">Créer l'utilisateur</button>
              </form>
            </section>
          ) : (
            <section className="panel"><Message type="info">Votre compte n'a pas la permission de créer des utilisateurs.</Message></section>
          )}
          <section className="panel">
            <h2>Règle d'habilitation</h2>
            <p className="muted">Aucun profil PAOMA définitif n'est attribué automatiquement. Les droits doivent rester explicitement validés.</p>
          </section>
        </div>
      ) : tab === "audit" ? (
        <section className="panel">
          <h2>Derniers événements d'audit</h2>
          {!auth.hasPermission("platform:audit:read") ? (
            <Message type="info">Votre compte n'a pas la permission de consulter l'audit.</Message>
          ) : auditEvents.length === 0 ? (
            <p className="empty">Aucun événement d'audit disponible.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Action</th><th>Objet</th><th>Identifiant</th><th>Utilisateur</th></tr></thead>
                <tbody>
                  {auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.occurredAt).toLocaleString()}</td>
                      <td>{event.action}</td>
                      <td>{event.objectType}</td>
                      <td>{event.objectId ?? "—"}</td>
                      <td>{event.actorUserId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
                    <AmountInput required value={placementForm.principalAmount} onValueChange={(value) => setPlacementForm({ ...placementForm, principalAmount: value })} />
                  </label>
                  <label>Devise (code ISO à trois lettres)
                    <select required value={placementForm.currency} onChange={(e) => setPlacementForm({ ...placementForm, currency: e.target.value })}>
                      <option value="">Sélectionner</option>
                      {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </label>
                  <label>Taux d'intérêt annuel (%)
                    <input inputMode="decimal" required value={placementForm.annualInterestRate} onChange={(e) => setPlacementForm({ ...placementForm, annualInterestRate: e.target.value })} />
                  </label>
                  <label>Durée en jours
                    <input type="number" min="1" required value={placementForm.durationDays} onChange={(e) => setPlacementForm({ ...placementForm, durationDays: e.target.value })} />
                  </label>
                  <label>Mode de dépôt
                    <select required value={placementForm.depositMode} onChange={(e) => setPlacementForm({ ...placementForm, depositMode: e.target.value })}>
                      <option value="">Sélectionner</option>
                      {depositModeOptions.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  <label>Mode de calcul des intérêts
                    <select required value={placementForm.interestCalculationMode} onChange={(e) => setPlacementForm({ ...placementForm, interestCalculationMode: e.target.value })}>
                      <option value="">Sélectionner</option>
                      {interestModeOptions.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  <label>Date de début
                    <input type="date" required value={placementForm.startDate} onChange={(e) => setPlacementForm({ ...placementForm, startDate: e.target.value })} />
                  </label>
                  <div className="actions">
                    <button className="secondary" disabled={loading} type="button" onClick={() => void simulate()}>Simuler les intérêts</button>
                    <button className="primary" disabled={loading} type="submit">Enregistrer le placement</button>
                  </div>
                  {simResult && (
                    <p className="message info">Simulation (base {simResult.basis}j) : intérêts {simResult.interest.toLocaleString("fr-FR")} — total {simResult.total.toLocaleString("fr-FR")} — échéance {simResult.maturityDate}.</p>
                  )}
                </form>
              )}
            </section>
          )}
          <section className="panel">
            <div className="panel-head">
              <h2>Placements enregistrés</h2>
              {auth.hasPermission("treasury:placements:export") && (
                <div className="actions">
                  <button className="secondary" type="button" onClick={() => void downloadExport("/api/v1/treasury/placements/report.xlsx", "situation-placements-DEMO.xlsx")}>Export Excel</button>
                  <button className="secondary" type="button" onClick={() => void downloadExport("/api/v1/treasury/placements/echeancier.pdf", "echeancier-placements-DEMO.pdf")}>Échéancier PDF</button>
                </div>
              )}
            </div>
            <div className="table-wrap">
                <table>
                  <thead><tr><th>Institution</th><th>Montant</th><th>Début</th><th>Durée</th><th>Échéance</th><th>État</th><th>Actions</th></tr></thead>
                  <tbody>
                    {placements.length === 0 ? (
                      <tr><td colSpan={7} className="empty">Aucun placement n'est enregistré dans ce périmètre. Le gabarit et les exports restent disponibles pour l'initialisation validée.</td></tr>
                    ) : placements.map((item) => {
                      const ins = insights.find((x) => x.id === item.id);
                      const statusLabel = item.status === "open" ? "Ouvert" : item.status === "closed" ? "Clôturé" : item.status === "cancelled" ? "Annulé" : item.status === "renewed" ? "Renouvelé" : "Rapatrié";
                      return (
                      <tr key={item.id}>
                        <td>{item.institution?.name || institutions.find((institution) => institution.id === item.institutionId)?.name}</td>
                        <td>{item.principalAmount} {item.currency}</td>
                        <td>{item.startDate}</td>
                        <td>{item.durationDays} jours</td>
                        <td>{ins ? (<span>{ins.maturityDate}{ins.maturingSoon ? <strong className="badge-due"> ⚠ {ins.daysRemaining} j</strong> : null}</span>) : "—"}</td>
                        <td>{statusLabel}</td>
                        <td>
                          {item.status === "open" && <div className="actions">
                            {auth.hasPermission("treasury:placements:write") && <button className="secondary" onClick={() => void renewPlacement(item)}>Renouveler</button>}
                            {auth.hasPermission("treasury:placements:write") && <button className="secondary" onClick={() => void repatriatePlacement(item)}>Rapatrier</button>}
                            {auth.hasPermission("treasury:placements:close") && <button className="secondary" onClick={() => void changeStatus(item, "close")}>Clôturer</button>}
                            {auth.hasPermission("treasury:placements:cancel") && <button className="danger" onClick={() => void changeStatus(item, "cancel")}>Annuler</button>}
                          </div>}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          </section>
        </div>
      )}
    </>
  );
}

const treasuryDemoSteps: Array<{
  number: number;
  title: string;
  summary: string;
  status: "Disponible en démo" | "Partiel" | "À cadrer";
  target?: TreasuryTab;
}> = [
  {
    number: 1,
    title: "Structure globale",
    summary: "Navigation par modules, interfaces uniformes, API versionnée, recherche locale selon les écrans, archivage et audit des actions sensibles.",
    status: "Partiel",
    target: "dashboard"
  },
  {
    number: 2,
    title: "Placements",
    summary: "Ouverture, simulation, renouvellement, rapatriement, clôture, annulation, échéancier et situation Excel.",
    status: "Disponible en démo",
    target: "placements"
  },
  {
    number: 3,
    title: "Facturation et recouvrement",
    summary: "Créances, relances, virements de régularisation, clôture ou contentieux, situation Excel et état PDF.",
    status: "Disponible en démo",
    target: "receivables"
  },
  {
    number: 4,
    title: "Gestion des comptes",
    summary: "Comptes MGA ou devises, portefeuilles électroniques, mouvements validés, imports CSV contrôlés et rapprochement.",
    status: "Disponible en démo",
    target: "accounts"
  },
  {
    number: 5,
    title: "Comptes courants",
    summary: "Comptes, encaissements, décaissements, chèques, états, rapprochement et historique des mouvements.",
    status: "Disponible en démo",
    target: "accounts"
  },
  {
    number: 6,
    title: "Élaboration du budget",
    summary: "Ouverture d'exercice, versions numérotées, copie, activation contrôlée et lignes de crédit. Les prévisions consolidées et l'arrêté restent à confirmer.",
    status: "Partiel",
    target: "budget"
  },
  {
    number: 7,
    title: "Exécution du budget",
    summary: "Création de dossiers, références, pièces jointes sécurisées, étapes de validation, rejet, paiement, archivage et bordereau.",
    status: "Disponible en démo",
    target: "budget"
  },
  {
    number: 8,
    title: "Reporting et tableaux de bord",
    summary: "Indicateurs consolidés et exports. Les modèles officiels et statistiques avancées restent à valider par PAOSITRA.",
    status: "Partiel",
    target: "dashboard"
  },
  {
    number: 9,
    title: "Paramètres et configuration",
    summary: "Institutions, devises, modes de dépôt et calculs guidés. Taux de change, calendriers et rubriques avancées restent à cadrer.",
    status: "Partiel",
    target: "institutions"
  },
  {
    number: 10,
    title: "Gestion des utilisateurs",
    summary: "Création des comptes, rôles proposés, permissions, audit et changement obligatoire du mot de passe selon le profil.",
    status: "Partiel",
    target: "users"
  }
];

function TreasuryDemoGuide({
  canOpen,
  onOpen
}: {
  canOpen: (target: TreasuryTab) => boolean;
  onOpen: (target: TreasuryTab) => void;
}) {
  return (
    <section className="panel demo-guide">
      <div className="panel-head">
        <div>
          <p className="eyebrow">DÉMONSTRATION LOT 1</p>
          <h2>Parcours conseillé</h2>
          <p className="muted">Commencez par Placements, puis Créances, Comptes courants, Budget et Tableau de bord.</p>
        </div>
      </div>
      <div className="demo-guide-list">
        {treasuryDemoSteps.map((step) => (
          <article key={step.number} className="demo-guide-row">
            <span className="demo-guide-number">{step.number}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.summary}</p>
            </div>
            <span className={`badge ${step.status === "Disponible en démo" ? "source-validated" : "warning"}`}>
              {step.status}
            </span>
            {step.target && canOpen(step.target) ? (
              <button className="secondary" type="button" onClick={() => onOpen(step.target!)}>
                Ouvrir
              </button>
            ) : (
              <span className="muted">Selon habilitation</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function TreasuryRolesHabilitations({ roles }: { roles: RbacRole[] }) {
  const filtered = roles.filter((r) => r.lot === "common" || r.lot === "lot1");
  const byLot = (l: string) => filtered.filter((r) => r.lot === l);
  const scopeLabel = (scope: string) =>
    ({
      global: "Toute la plateforme",
      organ: "Organe",
      direction: "Direction",
      region: "Région",
      agency: "Agence",
      counter: "Caisse ou guichet"
    })[scope] ?? scope;

  return (
    <section className="panel">
      <h2>Rôles &amp; habilitations</h2>
      <div className="roles-table-notice">
        Proposition KCI — tous les rôles et périmètres listés sont des propositions à valider par PAOSITRA avant toute utilisation en production.
        Le DAOO reste la référence prioritaire.
      </div>
      {(["common", "lot1"] as const).map((l) => {
        const items = byLot(l);
        if (items.length === 0) return null;
        return (
          <div key={l} className="roles-lot-group">
            <h3 className="roles-lot-heading">
              {l === "common" ? "Commun (Lot 1 & 2)" : "Lot 1 — Trésorerie"}
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Libellé</th>
                    <th>Périmètre</th>
                    <th>Description</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((role) => (
                    <tr key={role.code}>
                      <td><code>{role.code}</code></td>
                      <td>{role.label}</td>
                      <td>{scopeLabel(role.scopeType)}</td>
                      <td>{role.description ?? "—"}</td>
                      <td><span className="badge warning">Proposition à valider</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <Message type="info">Les rôles ne sont pas encore chargés. Vérifiez que vous avez la permission platform:roles:read.</Message>
      )}
    </section>
  );
}

const treasuryClarifications: Array<{ num: number; title: string; statut: string; contenu: string[] }> = [
  {
    num: 1,
    title: "Matrice des rôles Lot 1",
    statut: "à clarifier",
    contenu: [
      "Le Lot 1 doit distinguer les rôles de consultation, saisie, contrôle, validation et décision financière.",
      "Proposition KCI : séparer direction financière, trésorier chef, comptable, auditeur et consultation direction, avec des périmètres d'accès par direction, compte, institution ou opération.",
      "Attente PAOSITRA : confirmer les profils réels, les délégations, les suppléances et les incompatibilités, par exemple entre saisie d'une opération et validation."
    ]
  },
  {
    num: 2,
    title: "Calculs financiers placements",
    statut: "à clarifier",
    contenu: [
      "Les intérêts peuvent être calculés selon plusieurs bases. Exact/365 compte les jours réels sur une année de 365 jours. Exact/360 compte les jours réels sur 360 jours, souvent utilisé par des banques. 30/360 considère chaque mois comme 30 jours, ce qui simplifie les calculs mais peut créer un écart avec les jours réels.",
      "Proposition KCI : rendre la formule paramétrable par institution et par produit de placement, sans figer une règle officielle tant que PAOSITRA n'a pas confirmé les contrats bancaires.",
      "Arrondi : il faut préciser si les intérêts sont arrondis à l'ariary inférieur, supérieur, le plus proche, ou selon une précision comptable. Le backend doit appliquer cette règle de façon unique pour éviter les écarts entre écran, PDF et comptabilité.",
      "Fiscalité : selon le contexte malgache et la nature de PAOSITRA, il faut confirmer s'il existe une retenue, taxe ou exonération sur les intérêts perçus, qui la calcule, à quel moment et sur quelle base.",
      "Risque si non confirmé : le moteur peut simuler un placement, mais les intérêts, échéances, pénalités et écritures comptables ne doivent pas être considérés comme définitifs."
    ]
  },
  {
    num: 3,
    title: "Référentiel institutions financières",
    statut: "démo front",
    contenu: [
      "Le référentiel doit distinguer banque commerciale, banque centrale, compte CCP, caisse interne, espèces, mobile money éventuel et autre organisme financier.",
      "Liste de travail à préparer avec PAOSITRA : BNI Madagascar, BOA Madagascar, BFV-SG, MCB Madagascar, Société Générale Madagasikara, BMOI, Baobab Banque, Banque Centrale de Madagascar, comptes CCP et caisse interne. Cette liste est une proposition de cadrage, pas un référentiel officiel.",
      "Proposition KCI : enrichir la fiche institution avec type, code interne, devise, compte rattaché, mode de dépôt autorisé, contact, statut actif/inactif et validation PAOSITRA.",
      "Cas espèces : certaines opérations peuvent ne pas passer par une banque. Le logiciel doit pouvoir représenter une caisse ou un dépôt espèces, avec des contrôles de plafond, billetage et justification.",
      "Attente PAOSITRA : fournir la liste officielle des institutions, comptes, conventions bancaires, devises et modes de règlement autorisés."
    ]
  },
  {
    num: 4,
    title: "Circuit de traitement des placements",
    statut: "partiel",
    contenu: [
      "Le circuit doit préciser qui propose un placement, qui le contrôle, qui l'approuve, qui constate l'échéance, et qui valide le rapatriement des fonds.",
      "Proposition KCI : brouillon > contrôle > validation financière > ouverture > suivi échéance > renouvellement ou rapatriement > clôture comptable.",
      "Attente PAOSITRA : confirmer les seuils d'autorisation, pièces justificatives, pénalités de rupture et règles de double validation."
    ]
  },
  {
    num: 5,
    title: "Référentiel comptable trésorerie",
    statut: "à clarifier",
    contenu: [
      "Le PCOP 2006 sert de cadrage provisoire pour structurer comptes, journaux, écritures débit/crédit, contrepassations et périodes.",
      "Proposition KCI : garder une comptabilité configurable par type d'opération afin de remplacer les schémas provisoires par les schémas PAOSITRA validés.",
      "Attente PAOSITRA : fournir le plan de comptes applicable, les journaux, les schémas d'écriture par placement, créance, paiement, rapprochement et régularisation."
    ]
  },
  {
    num: 6,
    title: "Facturation et recouvrement",
    statut: "démo front",
    contenu: [
      "Le module doit cadrer les créances, relances, virements reçus, pièces justificatives, contentieux et clôtures.",
      "Proposition KCI : permettre la saisie d'une créance avec débiteur, montant, devise, date d'émission, échéance, description, statut, événements et exports.",
      "Attente PAOSITRA : valider les modèles de factures, CPS, règles de relance, formats de reçu et autorisations de clôture ou contentieux."
    ]
  },
  {
    num: 7,
    title: "Comptes en devises",
    statut: "démo front",
    contenu: [
      "Certains comptes peuvent être en MGA ou en devise étrangère. Les taux de change et dates de valeur doivent être cadrés.",
      "Proposition KCI : stocker la devise, le solde, la banque, les mouvements et la source du taux de change, sans calcul définitif avant validation.",
      "Attente PAOSITRA : confirmer les devises autorisées, règles de conversion, source officielle des taux et traitements comptables des écarts de change."
    ]
  },
  {
    num: 8,
    title: "Rapprochement bancaire",
    statut: "démo front",
    contenu: [
      "Le rapprochement compare les mouvements internes avec les relevés bancaires ou justificatifs externes.",
      "Proposition KCI : importer ou saisir les mouvements, rapprocher les lignes, isoler les écarts et produire un rapport PDF/Excel.",
      "Attente PAOSITRA : fournir les formats de relevés, tolérances, règles de lettrage, délais et responsables de validation."
    ]
  },
  {
    num: 9,
    title: "Reporting réglementaire Lot 1",
    statut: "démo front",
    contenu: [
      "Les rapports doivent être imprimables, traçables et cohérents avec les données API, base, PDF et Excel.",
      "Proposition KCI : produire des gabarits A4 provisoires avec mention démonstration non contractuelle, même lorsqu'aucune donnée n'est présente.",
      "Attente PAOSITRA : fournir les modèles officiels, signatures, périodicités, destinataires et règles d'archivage."
    ]
  },
  {
    num: 10,
    title: "Relations entre Lot 1 et Lot 2",
    statut: "à clarifier",
    contenu: [
      "Les flux entre trésorerie centrale et agences concernent les virements, accusés de crédit, versements, rapatriements, régularisations et demandes de valeurs.",
      "Proposition KCI : garder les lots séparés métier, mais prévoir des interfaces internes contrôlées pour rapprocher les opérations terrain et la trésorerie.",
      "Attente PAOSITRA : confirmer les événements transmis, formats, pièces, validateurs et délais entre Lot 1 et Lot 2."
    ]
  }
];

function TreasuryPointsAClarifier() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="panel">
      <h2>Parcours à cadrer avec PAOSITRA — Lot 1 Trésorerie</h2>
      <p className="muted">
        Ces parcours représentent les fonctions à cadrer issues de l'analyse du DAO Lot 1.
        Ils restent à valider formellement par PAOSITRA avant activation comme règles définitives.
      </p>
      <Message type="info">
        Le DAOO reste la référence prioritaire. Ces parcours de démonstration ne remplacent pas les règles définitives PAOSITRA.
      </Message>
      {treasuryClarifications.map((section) => (
        <div className="clarify-section" key={section.num}>
          <div
            className="clarify-section-header"
            onClick={() => setOpen(open === section.num ? null : section.num)}
          >
            <h3>{section.num}. {section.title}</h3>
            <div className="clarify-section-actions">
              <span className="badge warning">{section.statut}</span>
              <span>{open === section.num ? "▲" : "▼"}</span>
            </div>
          </div>
          {open === section.num && (
            <div className="clarify-section-body">
              {section.contenu.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
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


interface Receivable {
  id: string;
  reference: string;
  debtorName: string;
  amount: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: "en_cours" | "relancee" | "virement_recu" | "cloturee" | "contentieux";
  version: number;
}

const emptyReceivable = { debtorName: "", amount: "", currency: "MGA", issueDate: "", dueDate: "", description: "" };

function receivableStatusLabel(s: Receivable["status"]) {
  return s === "en_cours" ? "En cours" : s === "relancee" ? "Relancée" : s === "virement_recu" ? "Virement reçu" : s === "cloturee" ? "Clôturée" : "Contentieux";
}

function TreasuryReceivables() {
  const auth = useAuth();
  const [items, setItems] = useState<Receivable[]>([]);
  const [form, setForm] = useState(emptyReceivable);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const canWrite = auth.hasPermission("treasury:receivables:write");

  const load = useCallback(async () => {
    if (!auth.hasPermission("treasury:receivables:read")) return;
    try {
      const r = await apiRequest<{ items: Receivable[] }>("/api/v1/treasury/receivables?pageSize=100", { token: auth.token });
      setItems(r.items);
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }, [auth]);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault(); setLoading(true);
    try {
      await apiRequest("/api/v1/treasury/receivables", {
        method: "POST", token: auth.token, idempotent: true,
        body: JSON.stringify({ ...form, currency: form.currency.toUpperCase() })
      });
      setForm(emptyReceivable);
      setMessage({ type: "success", text: "Créance enregistrée." });
      await load();
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
    finally { setLoading(false); }
  }

  async function act(r: Receivable, kind: "relance" | "virement" | "close") {
    try {
      let body: Record<string, unknown> = { version: r.version };
      if (kind === "relance") {
        const comment = window.prompt("Commentaire de relance :")?.trim(); if (!comment) return;
        const mode = window.prompt("Mode (courrier, e-mail, téléphone) :")?.trim() || "courrier";
        body = { ...body, comment, mode };
      } else if (kind === "virement") {
        const reference = window.prompt("Référence du virement :")?.trim(); if (!reference) return;
        const bank = window.prompt("Banque émettrice :")?.trim() || "—";
        const valueDate = window.prompt("Date de valeur (AAAA-MM-JJ) :")?.trim() || r.dueDate;
        body = { ...body, reference, amount: r.amount, bank, valueDate };
      } else {
        const comment = window.prompt("Commentaire de clôture :")?.trim(); if (!comment) return;
        const c = window.confirm("OK = Clôturer (soldée). Annuler = passer en contentieux.");
        body = { ...body, comment, target: c ? "cloturee" : "contentieux" };
      }
      await apiRequest(`/api/v1/treasury/receivables/${r.id}/${kind}`, {
        method: "POST", token: auth.token, idempotent: true, body: JSON.stringify(body)
      });
      setMessage({ type: "success", text: "Action enregistrée." });
      await load();
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }

  async function download(path: string, filename: string) {
    try {
      const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${auth.token}` } });
      if (!res.ok) { setMessage({ type: "error", text: "Export impossible." }); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    } catch (error) { handleApiError(error, auth.clearSession, setMessage); }
  }

  return (
    <div className="grid">
      {message && <Message type={message.type}>{message.text}</Message>}
      {canWrite && (
        <section className="panel">
          <h2>Nouvelle créance</h2>
          <form onSubmit={create}>
            <label>Débiteur<input required maxLength={240} value={form.debtorName} onChange={(e) => setForm({ ...form, debtorName: e.target.value })} /></label>
            <label>Montant<AmountInput required value={form.amount} onValueChange={(value) => setForm({ ...form, amount: value })} /></label>
            <label>Devise
              <select required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </label>
            <label>Date d'émission<input type="date" required value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></label>
            <label>Date d'échéance<input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
            <label>Description<input maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <button className="primary" disabled={loading} type="submit">Enregistrer la créance</button>
          </form>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <h2>Créances</h2>
          {auth.hasPermission("treasury:receivables:export") && (
            <div className="actions">
              <button className="secondary" type="button" onClick={() => void download("/api/v1/treasury/receivables/report.xlsx", "etat-creances-DEMO.xlsx")}>État Excel</button>
              <button className="secondary" type="button" onClick={() => void download("/api/v1/treasury/receivables/virements.pdf", "virements-DEMO.pdf")}>Virements PDF</button>
            </div>
          )}
        </div>
        <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Débiteur</th><th>Montant</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Aucune créance n'est enregistrée. Le tableau et les exports restent disponibles pour l'initialisation validée.</td></tr>
                ) : items.map((r) => {
                  const overdue = r.status !== "cloturee" && r.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={r.id}>
                      <td>{r.reference}</td>
                      <td>{r.debtorName}</td>
                      <td>{Number(r.amount).toLocaleString("fr-FR")} {r.currency}</td>
                      <td>{r.dueDate}{overdue ? <strong className="badge-due"> ⚠ en retard</strong> : null}</td>
                      <td>{receivableStatusLabel(r.status)}</td>
                      <td>
                        {canWrite && r.status !== "cloturee" && r.status !== "contentieux" && (
                          <div className="actions">
                            {(r.status === "en_cours" || r.status === "relancee") && <button className="secondary" onClick={() => void act(r, "relance")}>Relancer</button>}
                            {(r.status === "en_cours" || r.status === "relancee") && <button className="secondary" onClick={() => void act(r, "virement")}>Virement</button>}
                            <button className="secondary" onClick={() => void act(r, "close")}>Clôturer</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </section>
    </div>
  );
}
