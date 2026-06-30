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
          MODE PRÉSENTATION — MODULES CONNECTÉS API UNIQUEMENT — AUCUNE DONNÉE MÉTIER FICTIVE
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
  if (sourceType === "paoma_validated") return "Données réelles PAOMA";
  if (sourceType === "public_source") return "Sources publiques";
  if (sourceType === "demo_only") return "Démonstration";
  return "À valider";
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
    auth.hasPermission("operations:agencies:read") && { id: "agencies", label: "Agences" },
    auth.hasPermission("operations:counters:read") && { id: "caisses", label: "Caisses" },
    auth.hasPermission("operations:verification:read") && { id: "verification", label: "Verification" },
    auth.hasPermission("operations:dashboard:read") && { id: "opsdashboard", label: "Tableau de bord" },
    auth.hasPermission("operations:transfers:read") && { id: "valeurs", label: "Inter-agences" },
    auth.hasPermission("platform:notifications:read") && { id: "alertes", label: "Alertes" },
    auth.hasPermission("operations:agencies:read") && { id: "referentiel", label: "Referentiel agences" },
    auth.hasPermission("platform:roles:read") && { id: "roles", label: "Roles & habilitations" },
    auth.hasPermission("platform:roles:read") && { id: "clarifications", label: "Points a clarifier" },
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
      <section className="panel module-home">
        <div>
          <p className="eyebrow">LOT 2 — OPÉRATIONS</p>
          <h2>Module agences opérationnel connecté au backend</h2>
          <p className="muted">
            Cette vue affiche uniquement les fonctions réellement reliées à l'API, aux permissions et à l'audit.
            Les caisses, valeurs postales, G59/G60, AC et workflows non couverts par une route backend ne sont pas simulés.
          </p>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>Agences dans le référentiel</span>
            <strong>{agencies.length}</strong>
            <small>Données lues depuis /api/v1/operations/agencies</small>
            {agencies.some((a) => a.sourceType === "demo_only") && (
              <small className="source-note">Dont données de démonstration (demo_only)</small>
            )}
          </div>
          <div className="kpi-card">
            <span>Agences validées PAOMA</span>
            <strong>{agencies.filter((a) => a.validationStatus === "validated").length}</strong>
            <small>Source paoma_validated uniquement</small>
          </div>
          <div className="kpi-card">
            <span>Rôles proposés</span>
            <strong>{roles.length}</strong>
            <small>Proposition KCI — à valider PAOMA</small>
          </div>
          <div className="kpi-card">
            <span>Audit consultable</span>
            <strong>{auditEvents.length}</strong>
            <small>Derniers événements chargés depuis l'API</small>
          </div>
        </div>
      </section>
      <nav className="tabs" aria-label="Modules operations">
        {visibleTabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      {message && <Message type={message.type}>{message.text}</Message>}
      {visibleTabs.length === 0 ? (
        <Message type="info">Votre compte n'a acces a aucun module Operations.</Message>
      ) : !canSeeCurrentTab ? (
        <Message type="info">Votre compte n'a pas acces a ce module.</Message>
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

  async function handleExport() {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/v1/operations/agencies/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) { onError("Export échoué."); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agences-paoma-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel">
      <div className="demo-title">
        <div>
          <h2>Référentiel agences</h2>
          <p className="muted">Données tracées par source — proposition à valider par PAOMA</p>
        </div>
        {canExport && (
          <button className="secondary" type="button" onClick={() => void handleExport()}>
            Export CSV
          </button>
        )}
      </div>
      <div className="demo-disclaimer">
        Les agences, codiques et données géographiques affichés sont soit issus de sources publiques, soit proposés à titre de cadrage.
        Ils devront être validés officiellement par PAOMA avant toute utilisation en production.
      </div>
      <div className="source-counters">
        <span className="source-counter"><span className="badge source-validated">{counts.paoma_validated}</span> Validées PAOMA</span>
        <span className="source-counter"><span className="badge source-public">{counts.public_source}</span> Sources publiques</span>
        <span className="source-counter"><span className="badge source-demo">{counts.demo_only}</span> Démonstration</span>
        <span className="source-counter"><span className="badge source-unknown">{counts.to_validate}</span> À valider</span>
      </div>
      <div className="filter-bar">
        <label>Source
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">Toutes</option>
            <option value="paoma_validated">Données réelles PAOMA</option>
            <option value="public_source">Sources publiques</option>
            <option value="demo_only">Démonstration</option>
            <option value="to_validate">À valider</option>
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

  return (
    <section className="panel">
      <h2>Rôles &amp; habilitations</h2>
      <div className="roles-table-notice">
        Proposition KCI — tous les rôles et périmètres listés sont des propositions à valider par PAOMA avant toute utilisation en production.
        Le DAO reste la référence contractuelle.
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
                      <td>{role.scopeType}</td>
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

const clarificationSections = [
  {
    num: 1,
    title: "Codification des agences",
    statut: "à clarifier",
    contenu: "Le format du codique PAOMA (public_code, codique, temporary_code) n'est pas défini dans le DAO. La structure proposée (code public à 3 chiffres, codique interne) est une hypothèse à confirmer."
  },
  {
    num: 2,
    title: "Types d'agences et hiérarchie",
    statut: "proposition à valider",
    contenu: "Types proposés : direction, agence_principale, agence_secondaire, bureau, point_service, guichet_financier. Hiérarchie (direction > agence_principale > bureau) à valider avec PAOMA."
  },
  {
    num: 3,
    title: "Découpage géographique officiel",
    statut: "à clarifier",
    contenu: "Le DAO cite 300 agences et un découpage régional. La correspondance région/district/commune utilisée dans cette démo est issue des données publiques de Madagascar — à confirmer par PAOMA."
  },
  {
    num: 4,
    title: "Workflows de validation agences",
    statut: "à clarifier",
    contenu: "Le workflow de validation (proposition > validation référentiel > ouverture > fermeture) est une proposition. Les acteurs, délais et documents requis doivent être fournis par PAOMA."
  },
  {
    num: 5,
    title: "Modèle RBAC (rôles, périmètres, délégations)",
    statut: "proposition à valider",
    contenu: "19 rôles candidats proposés. Les périmètres (global, organ, direction, agency, counter), délégations, incompatibilités et suppléances doivent être définis par PAOMA."
  },
  {
    num: 6,
    title: "Règles comptables (PCOP 2006)",
    statut: "à clarifier",
    contenu: "Le référentiel PCOP 2006 est utilisé comme cadrage provisoire. PAOMA doit confirmer si PCOP 2006, PCG ou un référentiel hybride s'applique, et fournir les schémas débit/crédit par opération."
  },
  {
    num: 7,
    title: "Transactions financières postales",
    statut: "à clarifier",
    contenu: "Montants maximum autorisés (numéraire, VP, ME), devises acceptées, limites par guichet et règles de billetage doivent être fournis par PAOMA."
  },
  {
    num: 8,
    title: "Interopérabilité Lot 1 / Lot 2",
    statut: "à clarifier",
    contenu: "Les flux entre Lot 1 (trésorerie) et Lot 2 (opérations agences) — virements, AC, rapatriements — nécessitent une définition contractuelle des interfaces."
  },
  {
    num: 9,
    title: "Gestion des incidents et audit",
    statut: "partiel",
    contenu: "La piste d'audit est implémentée (trigger-protected). Les règles de conservation, accès et export des journaux d'audit doivent être validées par PAOMA."
  },
  {
    num: 10,
    title: "Processus de clôture d'agence",
    statut: "partiel",
    contenu: "La fermeture technique est implémentée. Le processus métier (transfert de valeurs, rapatriement, soldes, G59/G60, archivage) doit être fourni par PAOMA."
  },
  {
    num: 11,
    title: "Reporting réglementaire",
    statut: "absent",
    contenu: "Les modèles de rapports officiels (formats, fréquences, destinataires) ne sont pas dans le DAO. PAOMA doit fournir les gabarits G59, G60 et les règles d'envoi."
  },
  {
    num: 12,
    title: "Intégration systèmes externes",
    statut: "absent",
    contenu: "Les intégrations BCM, banques, CCP, plateforme de paiement mobile ne sont pas couvertes. Les contrats d'interface (formats, protocoles, fréquences) sont à définir."
  },
  {
    num: 13,
    title: "Protection des données personnelles",
    statut: "à clarifier",
    contenu: "La législation applicable à Madagascar (loi n°2014-038 sur la protection des données) et les règles de conservation, accès et suppression doivent être intégrées."
  }
];

function PointsAClarifier({ lot }: { lot: "lot1" | "lot2" }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="panel">
      <h2>Points à clarifier avec PAOMA</h2>
      <p className="muted">
        Ces points sont des blocages ou propositions identifiés lors de l'analyse du DAO {lot === "lot1" ? "Lot 1 (Trésorerie)" : "Lot 2 (Opérations)"}.
        Ils ne peuvent pas être traités sans décision formelle de PAOMA.
      </p>
      <Message type="info">
        Le DAO reste la référence contractuelle. Aucune de ces propositions n'est implémentée comme règle définitive.
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
              <p>{section.contenu}</p>
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
