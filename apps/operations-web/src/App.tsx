import { type FormEvent, useCallback, useEffect, useState } from "react";
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
import { CashModule } from "./CashModule";
import { VerificationModule } from "./VerificationModule";
import { OpsDashboardModule, ValueRequestsModule, AlertsPanel } from "./ops-extra-ui";

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
  type?: string | null;
  region?: string | null;
  district?: string | null;
  city?: string | null;
  codique?: string | null;
  publicCode?: string | null;
  sourceType?: string;
  validationStatus?: string;
  sourceName?: string | null;
  sourceNote?: string | null;
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

interface AuditEvent {
  id: string;
  occurredAt: string;
  action: string;
  objectType: string;
  objectId: string | null;
  actorUserId: string | null;
}

type OperationsTab =
  | "agencies"
  | "caisses"
  | "verification"
  | "opsdashboard"
  | "valeurs"
  | "alertes"
  | "referentiel"
  | "roles"
  | "clarifications"
  | "users"
  | "audit";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

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

const emptyUserForm = {
  email: "",
  displayName: "",
  password: "",
  mustChangePassword: true
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
      {DEMO_MODE && (
        <div className="demo-banner">
          MODE PRÉSENTATION — DONNÉES NON CONTRACTUELLES
        </div>
      )}
      <AgenciesWorkspace />
    </AppShell>
  );
}


function sourceBadgeClass(sourceType?: string) {
  if (sourceType === "paoma_validated") return "badge source-validated";
  if (sourceType === "public_source") return "badge source-public";
  if (sourceType === "demo_only") return "badge source-demo";
  return "badge source-unknown";
}

function sourceBadgeLabel(sourceType?: string) {
  if (sourceType === "paoma_validated") return "Validé PAOSITRA";
  if (sourceType === "public_source") return "Sources publiques";
  if (sourceType === "demo_only") return "Démonstration non contractuelle";
  return "À confirmer PAOSITRA";
}

function AgenciesWorkspace() {
  const auth = useAuth();
  const [tab, setTab] = useState<OperationsTab>("agencies");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [form, setForm] = useState(emptyAgency);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState("");
  const [filterValidation, setFilterValidation] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterType, setFilterType] = useState("");
  const isCashierOnly =
    auth.hasPermission("operations:counters:read") &&
    auth.hasPermission("operations:cash:open") &&
    !auth.hasPermission("operations:agencies:write") &&
    !auth.hasPermission("operations:agencies:validate") &&
    !auth.hasPermission("operations:dashboard:read") &&
    !auth.hasPermission("operations:verification:read");
  const canSeeClarifications = [
    "demo.admin@paositra-demo.mg",
    "demo.admin@paositra.local"
  ].includes(auth.user?.email ?? "");
  const hasTreasuryScopeOnly =
    Boolean(auth.user?.permissions.some((permission) => permission.code.startsWith("treasury:"))) &&
    !auth.hasPermission("operations:counters:read") &&
    !auth.hasPermission("operations:agencies:read") &&
    !auth.hasPermission("operations:dashboard:read") &&
    !auth.hasPermission("operations:verification:read");

  const load = useCallback(async () => {
    try {
      const [agencyResult, auditResult, rolesResult] = await Promise.all([
        auth.hasPermission("operations:agencies:read")
          ? apiRequest<Paged<Agency>>(
              "/api/v1/operations/agencies?pageSize=100",
              { token: auth.token }
            )
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
      setAgencies(agencyResult.items);
      setAuditEvents(auditResult.items);
      setRoles(rolesResult.items);
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleTabs: Array<{ id: OperationsTab; label: string }> = [
    auth.hasPermission("operations:agencies:read") && !isCashierOnly && { id: "agencies", label: "Agences" },
    auth.hasPermission("operations:counters:read") && { id: "caisses", label: "Caisses" },
    auth.hasPermission("operations:verification:read") && { id: "verification", label: "Vérification" },
    auth.hasPermission("operations:dashboard:read") && { id: "opsdashboard", label: "Tableau de bord" },
    auth.hasPermission("operations:transfers:read") && { id: "valeurs", label: "Inter-agences" },
    auth.hasPermission("platform:notifications:read") && { id: "alertes", label: "Alertes" },
    auth.hasPermission("operations:agencies:read") && !isCashierOnly && { id: "referentiel", label: "Référentiel agences" },
    auth.hasPermission("platform:roles:read") && { id: "roles", label: "Rôles & habilitations" },
    canSeeClarifications && { id: "clarifications", label: "Parcours à cadrer" },
    auth.hasPermission("platform:users:manage") && { id: "users", label: "Utilisateurs" },
    auth.hasPermission("platform:audit:read") && { id: "audit", label: "Audit" }
  ].filter(Boolean) as Array<{ id: OperationsTab; label: string }>;
  const canSeeCurrentTab = visibleTabs.some((item) => item.id === tab);

  useEffect(() => {
    if (!canSeeCurrentTab && visibleTabs[0]) {
      setTab(visibleTabs[0].id);
    }
  }, [auth.user, canSeeCurrentTab, tab, visibleTabs]);

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
      await load();
      setMessage({
        type: "success",
        text: "Utilisateur créé. Aucune permission métier n'est attribuée automatiquement."
      });
    } catch (error) {
      handleApiError(error, auth.clearSession, setMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!isCashierOnly && visibleTabs.length > 0 && <section className="panel module-home">
        <div>
          <p className="eyebrow">LOT 2 — OPÉRATIONS</p>
          <h2>Module agences opérationnel</h2>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>Agences dans le référentiel</span>
            <strong>{agencies.length}</strong>
            <small>Données issues du référentiel agences chargé dans la démonstration. Les codiques officiels restent à confirmer par PAOSITRA.</small>
            {agencies.some((a) => a.sourceType === "demo_only") && (
              <small className="source-note">Certaines lignes sont des données de démonstration non contractuelles.</small>
            )}
          </div>
          <div className="kpi-card">
            <span>Agences validées PAOSITRA</span>
            <strong>{agencies.filter((a) => a.validationStatus === "validated").length}</strong>
            <small>Agences officiellement validées par PAOSITRA. À ce stade, aucune validation officielle ne doit être supposée sans confirmation.</small>
          </div>
          <div className="kpi-card">
            <span>Rôles proposés</span>
            <strong>{roles.length}</strong>
            <small>Rôles de travail proposés pour organiser la démonstration. Ils devront être validés ou corrigés par PAOSITRA avant production.</small>
          </div>
          <div className="kpi-card">
            <span>Audit consultable</span>
            <strong>{auditEvents.length}</strong>
            <small>Dernières actions enregistrées dans la piste d'audit de la démonstration.</small>
          </div>
        </div>
      </section>}
      <nav className="tabs" aria-label="Modules operations">
        {visibleTabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      {message && <Message type={message.type}>{message.text}</Message>}
      {visibleTabs.length === 0 ? (
        <Message type="info">
          {hasTreasuryScopeOnly
            ? "Ce compte est limité au périmètre Trésorerie et comptabilité. Le référentiel agences relève du Lot 2."
            : "Votre profil ne couvre pas ce module. Les informations affichées sont limitées à votre périmètre."}
        </Message>
      ) : !canSeeCurrentTab ? (
        <Message type="info">Votre profil ne couvre pas ce module. Les informations affichées sont limitées à votre périmètre.</Message>
      ) : tab === "caisses" ? (
        <CashModule />
      ) : tab === "verification" ? (
        <VerificationModule />
      ) : tab === "opsdashboard" ? (
        <OpsDashboardModule />
      ) : tab === "valeurs" ? (
        <ValueRequestsModule />
      ) : tab === "alertes" ? (
        <AlertsPanel />
      ) : tab === "referentiel" ? (
        <ReferentielAgences
          agencies={agencies}
          filterSource={filterSource}
          filterValidation={filterValidation}
          filterRegion={filterRegion}
          filterType={filterType}
          setFilterSource={setFilterSource}
          setFilterValidation={setFilterValidation}
          setFilterRegion={setFilterRegion}
          setFilterType={setFilterType}
          token={auth.token}
          canValidate={auth.hasPermission("operations:agencies:validate")}
          canExport={auth.hasPermission("operations:agencies:export")}
          onValidated={() => void load()}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      ) : tab === "roles" ? (
        <RolesHabilitations roles={roles} lot="lot2" />
      ) : tab === "clarifications" ? (
        <PointsAClarifier lot="lot2" />
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
                <AmountInput value={form.cashMaxAmount} onValueChange={(value) => setForm({ ...form, cashMaxAmount: value })} />
              </label>
              <label>Maximum autorisé en valeurs postales
                <AmountInput value={form.postalValueMaxAmount} onValueChange={(value) => setForm({ ...form, postalValueMaxAmount: value })} />
              </label>
              <label>Maximum autorisé en monnaie étrangère
                <AmountInput value={form.foreignCurrencyMaxAmount} onValueChange={(value) => setForm({ ...form, foreignCurrencyMaxAmount: value })} />
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
                        {agency.status === "open" && auth.hasPermission(
                          "operations:agencies:close",
                          { type: "agency", id: agency.id }
                        ) && (
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
      )}
    </>
  );
}

function ReferentielAgences({
  agencies,
  filterSource,
  filterValidation,
  filterRegion,
  filterType,
  setFilterSource,
  setFilterValidation,
  setFilterRegion,
  setFilterType,
  token,
  canValidate,
  canExport,
  onValidated,
  onError
}: {
  agencies: Agency[];
  filterSource: string;
  filterValidation: string;
  filterRegion: string;
  filterType: string;
  setFilterSource: (v: string) => void;
  setFilterValidation: (v: string) => void;
  setFilterRegion: (v: string) => void;
  setFilterType: (v: string) => void;
  token: string | null;
  canValidate: boolean;
  canExport: boolean;
  onValidated: () => void;
  onError: (msg: string) => void;
}) {
  const filtered = agencies.filter((a) => {
    if (filterSource && a.sourceType !== filterSource) return false;
    if (filterValidation && a.validationStatus !== filterValidation) return false;
    if (filterRegion && !(a.region ?? "").toLowerCase().includes(filterRegion.toLowerCase())) return false;
    if (filterType && a.type !== filterType) return false;
    return true;
  });

  const counts = {
    paoma_validated: agencies.filter((a) => a.sourceType === "paoma_validated").length,
    public_source: agencies.filter((a) => a.sourceType === "public_source").length,
    demo_only: agencies.filter((a) => a.sourceType === "demo_only").length,
    to_validate: agencies.filter((a) => a.sourceType === "to_validate").length
  };

  async function handleValidate(agency: Agency) {
    if (!window.confirm(`Valider officiellement l'agence "${agency.name}" ?`)) return;
    try {
      await apiRequest(`/api/v1/operations/agencies/${agency.id}/validate`, {
        method: "PATCH",
        token,
        idempotent: true,
        body: JSON.stringify({ version: agency.version })
      });
      onValidated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Erreur lors de la validation.");
    }
  }

  async function handleExport(path: string, filename: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) { onError("Export échoué."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel">
      <div className="demo-title">
        <div>
          <h2>Référentiel agences</h2>
          <p className="muted">Données classées par origine et statut de validation PAOSITRA.</p>
        </div>
        {canExport && (
          <div className="actions">
            <button className="secondary" type="button" onClick={() => void handleExport("/api/v1/operations/agencies/export.xlsx", `referentiel-agences-${new Date().toISOString().slice(0, 10)}.xlsx`)}>
              Export Excel
            </button>
            <button className="secondary" type="button" onClick={() => void handleExport("/api/v1/operations/agencies/export.pdf", `referentiel-agences-${new Date().toISOString().slice(0, 10)}.pdf`)}>
              Export PDF
            </button>
            <button className="secondary" type="button" onClick={() => void handleExport("/api/v1/operations/agencies/export", `referentiel-agences-${new Date().toISOString().slice(0, 10)}.csv`)}>
              CSV
            </button>
          </div>
        )}
      </div>
      <div className="demo-disclaimer">
        Les agences, codiques et données géographiques affichés sont soit issus de sources publiques, soit proposés à titre de cadrage.
        Ils devront être validés officiellement par PAOSITRA avant toute utilisation en production.
      </div>
      <div className="source-counters">
        <span className="source-counter"><span className="badge source-validated">{counts.paoma_validated}</span> Validées PAOSITRA</span>
        <span className="source-counter"><span className="badge source-public">{counts.public_source}</span> Sources publiques</span>
        <span className="source-counter"><span className="badge source-demo">{counts.demo_only}</span> Démonstration</span>
        <span className="source-counter"><span className="badge source-unknown">{counts.to_validate}</span> À confirmer</span>
      </div>
      <div className="filter-bar">
        <label>Source
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">Toutes</option>
            <option value="paoma_validated">Validé PAOSITRA</option>
            <option value="public_source">Sources publiques</option>
            <option value="demo_only">Démonstration non contractuelle</option>
            <option value="to_validate">À confirmer</option>
          </select>
        </label>
        <label>Validation
          <select value={filterValidation} onChange={(e) => setFilterValidation(e.target.value)}>
            <option value="">Tous</option>
            <option value="validated">Validée</option>
            <option value="to_validate">À valider</option>
            <option value="rejected">Rejetée</option>
          </select>
        </label>
        <label>Type
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous</option>
            <option value="direction">Direction</option>
            <option value="agence_principale">Agence principale</option>
            <option value="agence_secondaire">Agence secondaire</option>
            <option value="bureau">Bureau</option>
            <option value="point_service">Point service</option>
            <option value="guichet_financier">Guichet financier</option>
          </select>
        </label>
        <label>Région
          <input value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} placeholder="Filtrer par région" />
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="empty">Aucune agence ne correspond aux filtres.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Codique</th>
                <th>Nom</th>
                <th>Type</th>
                <th>Région</th>
                <th>Source</th>
                <th>Validation</th>
                {canValidate && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((agency) => (
                <tr key={agency.id}>
                  <td>{agency.code}</td>
                  <td>{agency.codique || "—"}</td>
                  <td>{agency.name}</td>
                  <td>{agency.type || "—"}</td>
                  <td>{agency.region || "—"}</td>
                  <td><span className={sourceBadgeClass(agency.sourceType)}>{sourceBadgeLabel(agency.sourceType)}</span></td>
                  <td>{agency.validationStatus === "validated" ? "Validée" : agency.validationStatus === "rejected" ? "Rejetée" : "À valider"}</td>
                  {canValidate && (
                    <td>
                      {agency.validationStatus !== "validated" && (
                        <button className="secondary" type="button" onClick={() => void handleValidate(agency)}>
                          Valider
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RolesHabilitations({ roles, lot }: { roles: RbacRole[]; lot: "lot1" | "lot2" | "all" }) {
  const filtered = lot === "all" ? roles : roles.filter((r) => r.lot === "common" || r.lot === lot);
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
        Tous les rôles et périmètres listés sont des propositions à valider par PAOSITRA avant toute utilisation en production.
        Le DAOO reste la référence prioritaire.
      </div>
      {(["common", "lot1", "lot2"] as const).map((l) => {
        const items = byLot(l);
        if (items.length === 0) return null;
        return (
          <div key={l} className="roles-lot-group">
            <h3 className="roles-lot-heading">
              {l === "common" ? "Commun (Lot 1 & 2)" : l === "lot1" ? "Lot 1 — Trésorerie" : "Lot 2 — Opérations"}
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

const clarificationSections: Array<{ num: number; title: string; statut: string; contenu: string[] }> = [
  {
    num: 1,
    title: "Codification des agences",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le DAOO demande la gestion des agences, mais ne fournit pas la liste officielle des agences ni leurs codiques. Pour la démonstration, KCI utilise un code provisoire afin d'identifier les agences sans prétendre qu'il s'agit du codique officiel PAOSITRA.",
      "Exemple : TMP-PF-ANA-TNR-008. TMP signifie code temporaire de démonstration, PF indique la source provisoire utilisée pour la démo, ANA désigne Analamanga, TNR Antananarivo, et 008 un numéro séquentiel provisoire.",
      "Proposition KCI : utiliser ces codes temporaires uniquement pour la démonstration, puis les remplacer par les codiques officiels fournis par PAOSITRA.",
      "Attente PAOSITRA : fournir la liste officielle des agences, bureaux, guichets et codiques, idéalement en Excel ou CSV.",
      "Risque si non confirmé : le système peut fonctionner techniquement, mais les agences ne pourront pas être considérées comme référentiel officiel."
    ]
  },
  {
    num: 2,
    title: "Types d'agences et hiérarchie",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le DAOO évoque les agences, les caisses, les guichets et les opérations, mais ne précise pas toute la hiérarchie organisationnelle.",
      "Proposition KCI : utiliser une structure direction > agence principale > agence secondaire ou bureau > guichet ou caisse, afin de gérer les filtres, rattachements, droits d'accès et rapports par niveau.",
      "Attente PAOSITRA : confirmer la hiérarchie réelle : directions, régions, agences principales, bureaux rattachés, guichets et caisses.",
      "Risque si non confirmé : les droits d'accès, rapports régionaux et rattachements des utilisateurs peuvent être mal alignés avec l'organisation réelle."
    ]
  },
  {
    num: 3,
    title: "Liste des guichets et caisses",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le DAOO demande la gestion des guichets, caisses et opérations de caisse, mais ne donne pas la liste des caisses par agence, ni le nombre de guichets, ni leur rattachement.",
      "Proposition KCI : prévoir une structure où chaque caisse appartient à une agence, et où chaque caissier est rattaché à une caisse ou à un guichet.",
      "Attente PAOSITRA : fournir pour chaque agence la liste des caisses, guichets, caissiers, plafonds et règles d'ouverture ou fermeture.",
      "Risque si non confirmé : la démonstration peut montrer le parcours, mais l'exploitation réelle des caisses ne pourra pas être sécurisée."
    ]
  },
  {
    num: 4,
    title: "Circuit de validation des agences",
    statut: "à valider PAOSITRA",
    contenu: [
      "Un circuit de validation signifie les étapes à suivre avant qu'une agence soit considérée comme officielle et utilisable dans le logiciel.",
      "Proposition KCI : proposition > contrôle > validation référentiel > ouverture opérationnelle > modification contrôlée > fermeture ou suspension.",
      "Attente PAOSITRA : indiquer qui peut proposer une agence, qui valide, quels documents sont nécessaires, quel délai est applicable et qui peut fermer ou suspendre une agence.",
      "Risque si non confirmé : une agence pourrait être utilisée dans le système sans validation administrative correcte."
    ]
  },
  {
    num: 5,
    title: "Gestion des droits par rôle",
    statut: "à valider PAOSITRA",
    contenu: [
      "La gestion des droits par rôle définit ce que chaque utilisateur peut voir ou faire. Un caissier peut saisir des opérations de caisse, mais ne doit pas créer un autre caissier. Un administrateur système peut créer les comptes, mais ne doit pas faire les opérations de caisse.",
      "Les périmètres d'accès proposés sont : global, direction, région, agence, caisse ou guichet.",
      "La délégation donne temporairement le droit d'agir à la place d'une autre personne. L'incompatibilité évite les conflits d'intérêt, par exemple saisir puis vérifier la même opération. La suppléance désigne un remplaçant officiel pendant une absence.",
      "Proposition KCI : utiliser 19 rôles de démonstration, tous marqués à valider PAOSITRA.",
      "Attente PAOSITRA : valider les rôles, droits, périmètres, incompatibilités et cas de remplacement.",
      "Risque si non confirmé : des utilisateurs pourraient avoir trop de droits ou pas assez, ce qui crée un risque opérationnel et de contrôle interne."
    ]
  },
  {
    num: 6,
    title: "Règles comptables et PCOP 2006",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le logiciel devra produire ou préparer des écritures comptables pour certaines opérations : caisse, versements, rapatriements, créances, placements, paiements, rapprochements, valeurs postales et régularisations.",
      "Proposition KCI : utiliser le PCOP 2006 comme référentiel provisoire de comptabilité publique, avec une architecture configurable : comptes, journaux, écritures, lignes débit/crédit, périodes, contrepassations et validations.",
      "Attente PAOSITRA : confirmer le référentiel applicable, fournir le plan de comptes, les journaux comptables, les schémas d'écriture par opération et les règles de correction.",
      "Risque si non confirmé : le logiciel peut afficher les écrans, mais ne doit pas générer d'écritures comptables définitives."
    ]
  },
  {
    num: 7,
    title: "Transactions financières postales",
    statut: "à valider PAOSITRA",
    contenu: [
      "Les transactions financières postales concernent les opérations d'argent ou de valeurs réalisées dans les agences : espèces, valeurs postales, monnaie électronique, mandats, paiements, versements, rapatriements, avances et régularisations.",
      "Termes à confirmer dans l'écran : numéraire, valeurs postales, monnaie électronique, billetage et plafond.",
      "Proposition KCI : prévoir des plafonds paramétrables par agence, caisse, type d'opération et profil utilisateur.",
      "Attente PAOSITRA : fournir les plafonds, devises acceptées, règles de billetage, limites par guichet, règles de contrôle et seuils d'alerte.",
      "Risque si non confirmé : la caisse peut être démontrée, mais pas utilisée en production avec des montants réels."
    ]
  },
  {
    num: 8,
    title: "Relations entre Lot 1 Trésorerie et Lot 2 Opérations",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le DAOO distingue deux lots. KCI propose un socle technique commun pour la sécurité, les utilisateurs, l'audit, les sauvegardes et les API, mais les métiers restent séparés.",
      "Le Lot 2 produit les opérations terrain : caisse, agence, guichets, versements, rapatriements, demandes de valeurs et accusés de crédit. Le Lot 1 suit les impacts financiers centraux : trésorerie, comptes, créances, placements, rapprochements, paiements et budget.",
      "Proposition KCI : prévoir des interfaces internes entre les deux lots, sans figer les flux tant que PAOSITRA ne confirme pas les règles.",
      "Attente PAOSITRA : indiquer quels flux passent du Lot 2 vers le Lot 1, à quel moment, avec quels documents, validations et formats.",
      "Risque si non confirmé : les rapprochements entre opérations terrain et trésorerie centrale resteront incomplets."
    ]
  },
  {
    num: 9,
    title: "Incidents et piste d'audit",
    statut: "partiel",
    contenu: [
      "La piste d'audit garde la trace des actions importantes : connexion, échec de connexion, création, modification, validation, annulation, export, refus d'accès et changement de rôle.",
      "La protection au niveau de la base signifie que les événements d'audit ne peuvent pas être modifiés ou supprimés par le compte applicatif normal.",
      "Proposition KCI : conserver l'audit applicatif au moins 10 ans pour les actions métier sensibles, conserver les journaux techniques 12 mois, chiffrer les sauvegardes et limiter l'accès aux auditeurs autorisés.",
      "Attente PAOSITRA : valider les durées de conservation, les profils autorisés, les formats d'export et les procédures d'archivage.",
      "Risque si non confirmé : les traces existent, mais leur valeur administrative et leur durée de conservation ne seront pas officiellement cadrées."
    ]
  },
  {
    num: 10,
    title: "Clôture d'agence",
    statut: "partiel",
    contenu: [
      "La clôture d'agence signifie l'arrêt ou la fermeture opérationnelle d'une agence, temporaire ou définitive. Elle ne se limite pas à désactiver l'agence dans le logiciel.",
      "Proposition KCI : demande de fermeture > inventaire des caisses et valeurs > contrôle des soldes > transfert ou rapatriement > téléversement des pièces > validation > archivage.",
      "Attente PAOSITRA : fournir les modèles G59/G60, les documents obligatoires, les validateurs, les règles de transfert et les règles d'archivage.",
      "Risque si non confirmé : on peut désactiver techniquement une agence, mais pas sécuriser sa fermeture administrative et financière."
    ]
  },
  {
    num: 11,
    title: "Modèles de rapports et documents",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le DAOO demande des rapports, exports, tickets, accusés de crédit, situations et documents de suivi. Les modèles officiels ne sont pas fournis.",
      "Proposition KCI : créer des modèles provisoires clairement marqués démonstration non contractuelle, avec export PDF, Excel ou CSV.",
      "Attente PAOSITRA : fournir les modèles officiels : en-têtes, signatures, champs obligatoires, numérotation, mentions légales, formats d'impression et règles de validation.",
      "Risque si non confirmé : les exports peuvent servir à la démonstration, mais ne doivent pas être utilisés comme documents officiels."
    ]
  },
  {
    num: 12,
    title: "Intégration avec systèmes externes",
    statut: "à valider PAOSITRA",
    contenu: [
      "Une intégration externe signifie que le logiciel échange des données avec un autre système : banque, CCP, mobile money, BCM, plateforme interne, email, application partenaire ou système existant.",
      "Un contrat d'échange de données décrit le format, les colonnes obligatoires, les identifiants, les règles d'erreur, les accusés de réception, la sécurité, la fréquence et les responsabilités.",
      "Proposition KCI : prévoir des API et imports configurables, sans connecter réellement un système externe tant que les contrats d'échange ne sont pas validés.",
      "Attente PAOSITRA : fournir les formats BCM, banques, CCP, paiement mobile, CPS, email ou autres systèmes partenaires.",
      "Risque si non confirmé : les écrans peuvent être démontrés, mais les échanges automatiques avec les systèmes externes ne peuvent pas être fiabilisés."
    ]
  },
  {
    num: 13,
    title: "Protection des données personnelles",
    statut: "à valider PAOSITRA",
    contenu: [
      "Le logiciel peut traiter des données personnelles : agents, utilisateurs, clients, bénéficiaires, pièces d'identité, contacts, opérations, traces de connexion et justificatifs.",
      "Ces données doivent être protégées selon la législation applicable à Madagascar, notamment la loi n°2014-038 sur la protection des données personnelles, ainsi que les règles internes PAOSITRA.",
      "Proposition KCI : prévoir des droits d'accès stricts, le masquage de certaines données sensibles, la journalisation des consultations, la limitation des exports, une conservation paramétrable et l'anonymisation selon règles validées.",
      "Attente PAOSITRA : confirmer les données personnelles traitées, durées de conservation, profils autorisés, règles d'export et procédures de suppression ou d'archivage.",
      "Risque si non confirmé : le logiciel pourrait être techniquement fonctionnel, mais non conforme aux obligations de protection des données."
    ]
  }
];

function PointsAClarifier({ lot }: { lot: "lot1" | "lot2" }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="panel">
      <h2>Parcours à cadrer avec PAOSITRA</h2>
      <p className="muted">
        Ces parcours représentent les fonctions à cadrer issues de l'analyse du DAO {lot === "lot1" ? "Lot 1 (Trésorerie)" : "Lot 2 (Opérations)"}.
        Ils restent à valider formellement par PAOSITRA avant activation comme règles définitives.
      </p>
      <Message type="info">
        Le DAOO n°26/005-PAOSITRA/DG/PRMP/AOO reste la référence prioritaire. Ces parcours de démonstration ne remplacent pas les règles définitives PAOSITRA.
      </Message>
      {clarificationSections.map((section) => (
        <div className="clarify-section" key={section.num}>
          <div
            className="clarify-section-header"
            onClick={() => setOpen(open === section.num ? null : section.num)}
          >
            <h3>{section.num}. {section.title}</h3>
            <div className="clarify-section-actions">
              <span className={`badge ${section.statut === "partiel" ? "" : "warning"}`}>
                {section.statut}
              </span>
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
