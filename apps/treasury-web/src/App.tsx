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

interface DemoScreen {
  id: string;
  label: string;
  title: string;
  dao: string;
  status: "visible" | "partiel" | "vide" | "bloqué" | "proposition";
  api: string;
  missing: string;
  message?: string;
  details?: DemoDetail[];
}

interface DemoDetail {
  subject: string;
  missing: string;
  risk: string;
  hypothesis: string;
  expected: string;
}

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

const paomaClarifications: DemoDetail[] = [
  {
    subject: "Matrice des rôles",
    missing: "Profils, périmètres, délégations et incompatibilités",
    risk: "Droits excessifs ou blocage des utilisateurs",
    hypothesis: "RBAC technique provisoire avec refus par défaut",
    expected: "Matrice contractuelle validée"
  },
  {
    subject: "Workflows et statuts",
    missing: "Transitions exactes, motifs, rejets et validations",
    risk: "Workflow inventé ou impossible à recetter",
    hypothesis: "Statuts techniques minimaux",
    expected: "Diagrammes et statuts officiels"
  },
  {
    subject: "Référentiel comptable",
    missing: "PCOP 2006, PCG, procédure interne ou référentiel hybride",
    risk: "Comptabilité non conforme",
    hypothesis: "PCOP 2006 comme cadrage provisoire",
    expected: "Référentiel applicable à PAOMA"
  },
  {
    subject: "Schémas d'écritures",
    missing: "Débits, crédits, journaux et pièces par opération",
    risk: "Écritures invalides",
    hypothesis: "Règles proposed non publiables",
    expected: "Schémas validés"
  },
  {
    subject: "Données initiales",
    missing: "Agences, comptes, organes, produits, VP et utilisateurs",
    risk: "Données fictives",
    hypothesis: "Aucun seed métier",
    expected: "Référentiels officiels"
  },
  {
    subject: "Calculs de placements",
    missing: "Jours, intérêts, arrondis, fiscalité, pénalités",
    risk: "Calcul financier faux",
    hypothesis: "Moteur paramétrable désactivé",
    expected: "Règles financières validées"
  },
  {
    subject: "Imports et intégrations",
    missing: "CPS, banques, CCP, plateforme X et reprise",
    risk: "Rapprochements faux",
    hypothesis: "Adaptateurs à définir",
    expected: "Contrats et jeux de tests"
  },
  {
    subject: "Documents officiels",
    missing: "Rapports, factures, tickets, AC, G59/G60",
    risk: "Documents rejetés",
    hypothesis: "Exports modèles à valider",
    expected: "Gabarits officiels"
  },
  {
    subject: "Caisse et agences",
    missing: "Billetage, seuils, journée, écarts et délégations",
    risk: "Soldes ou verrouillages faux",
    hypothesis: "Validation désactivée",
    expected: "Procédures signées"
  },
  {
    subject: "Sécurité opérationnelle",
    missing: "SSO, 2FA, sessions, clés, journaux",
    risk: "Accès non conforme",
    hypothesis: "Auth locale contrôlée pour démo",
    expected: "Architecture IAM"
  },
  {
    subject: "Identifiant transaction",
    missing: "Format, séquence, entité et non-réutilisation",
    risk: "Traçabilité contestable",
    hypothesis: "[LOT]-[MODULE]-[TYPE]-[YYYYMMDDHHMMSS]-[ENTITE]-[SEQUENCE]",
    expected: "Format définitif"
  },
  {
    subject: "Cloud et PRA/PCA",
    missing: "Fournisseur, RPO/RTO, sauvegarde et recette",
    risk: "Déploiement non recevable",
    hypothesis: "Scripts locaux provisoires",
    expected: "Cible d'exploitation"
  }
];

const pcopDetails: DemoDetail[] = [
  {
    subject: "Référentiel",
    missing: "Confirmation officielle du référentiel applicable",
    risk: "Utiliser un plan comptable non applicable",
    hypothesis: "PCOP 2006 — Plan Comptable des Opérations Publiques",
    expected: "Décision PAOMA"
  },
  {
    subject: "Plan de comptes",
    missing: "Comptes PAOMA validés",
    risk: "Imputations fausses",
    hypothesis: "Structure importable en statut proposed",
    expected: "Plan validé"
  },
  {
    subject: "Journaux",
    missing: "Journaux officiels",
    risk: "Journalisation non conforme",
    hypothesis: "Journaux candidats tous proposed",
    expected: "Liste des journaux à activer"
  },
  {
    subject: "Règles",
    missing: "Schémas débit/crédit",
    risk: "Écritures comptables invalides",
    hypothesis: "Règles proposed non publiables",
    expected: "Règles validées par opération"
  }
];

const demoScreens: DemoScreen[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    title: "Tableau de bord Trésorerie",
    dao: "Reporting, soldes, crédits, dossiers et délais explicitement listés",
    status: "vide",
    api: "Agrégats réels à définir",
    missing: "Modèles, règles de calcul et données validées"
  },
  {
    id: "placements",
    label: "Placements",
    title: "Placements",
    dao: "Ouverture, modification, annulation, renouvellement, rapatriement et fermeture",
    status: "partiel",
    api: "/api/v1/treasury/placements",
    missing: "Formules d'intérêts, statuts, profils, renouvellement et rapatriement"
  },
  {
    id: "institutions",
    label: "Institutions financières",
    title: "Institutions financières",
    dao: "Configuration banques et institutions pour placements et comptes",
    status: "partiel",
    api: "/api/v1/treasury/institutions",
    missing: "Référentiel initial validé par PAOMA"
  },
  {
    id: "new-placement",
    label: "Nouveau placement",
    title: "Nouveau placement",
    dao: "Institution, taux, durée, mode de dépôt et mode de calcul des intérêts",
    status: "partiel",
    api: "/api/v1/treasury/placements",
    missing: "Référentiel institutions, taux et modes validés"
  },
  {
    id: "simulation",
    label: "Simulation",
    title: "Simulation de placement",
    dao: "Simulation et analyse des placements",
    status: "bloqué",
    api: "À définir",
    missing: "Formules d'intérêts et conventions de calcul"
  },
  {
    id: "billing",
    label: "Facturation",
    title: "Facturation & recouvrement",
    dao: "Traitement, vérification, réclamation et rapprochement des factures",
    status: "vide",
    api: "À définir",
    missing: "CPS, modèles de factures et workflow"
  },
  {
    id: "receivables",
    label: "Créances",
    title: "Suivi des créances",
    dao: "Situation des créances, relances et virements de régularisation",
    status: "vide",
    api: "À définir",
    missing: "Créances initiales, relances et règles de régularisation"
  },
  {
    id: "currency-accounts",
    label: "Comptes devises",
    title: "Comptes en devises",
    dao: "Comptes en devises, mouvements, import, extraction et rapprochement",
    status: "vide",
    api: "À définir",
    missing: "Comptes réels et règles comptables"
  },
  {
    id: "operational-accounts",
    label: "Comptes opérationnels",
    title: "Comptes opérationnels",
    dao: "Comptes opérationnels, mouvements, reversements et validations",
    status: "vide",
    api: "À définir",
    missing: "Règles d'imputation et validation"
  },
  {
    id: "wallet",
    label: "Portefeuille électronique",
    title: "Portefeuille électronique",
    dao: "Portefeuille électronique, mouvements et situations",
    status: "vide",
    api: "À définir",
    missing: "Règles de portefeuille et référentiel"
  },
  {
    id: "current-accounts",
    label: "Comptes courants",
    title: "Comptes courants",
    dao: "Encaissement, décaissement, journal, relevé bancaire/CCP",
    status: "vide",
    api: "À définir",
    missing: "Formats bancaires/CCP et règles de journal"
  },
  {
    id: "mandates",
    label: "Mandatement",
    title: "Mandatement",
    dao: "Mandatement, bordereaux, listes et historiques",
    status: "vide",
    api: "À définir",
    missing: "Workflow et références officielles"
  },
  {
    id: "payments",
    label: "Paiements",
    title: "Paiements",
    dao: "Paiement, mandats, états de paiement et contrôle",
    status: "vide",
    api: "À définir",
    missing: "Règles de paiement et validations"
  },
  {
    id: "checks",
    label: "Chèques",
    title: "Chèques",
    dao: "Chèques émis, en circulation, encaissés, annulés et expirés",
    status: "vide",
    api: "À définir",
    missing: "Numérotation, expiration et transitions"
  },
  {
    id: "bank-reconciliation",
    label: "Rapprochement",
    title: "Rapprochement bancaire",
    dao: "Comparaison solde livre / relevé bancaire, anomalies et validation",
    status: "vide",
    api: "À définir",
    missing: "Formats, tolérances et règles d'anomalies"
  },
  {
    id: "budget",
    label: "Budget",
    title: "Budget",
    dao: "Crédits, dossiers, étapes, pièces, commentaires et archivage",
    status: "vide",
    api: "À définir",
    missing: "Étapes, vérificateurs et référentiels"
  },
  {
    id: "budget-execution",
    label: "Exécution budgétaire",
    title: "Exécution budgétaire",
    dao: "Versions, justification, référence et historiques complets",
    status: "vide",
    api: "À définir",
    missing: "Références, versions et validations"
  },
  {
    id: "reporting",
    label: "Reporting",
    title: "Reporting",
    dao: "Exports CSV/Excel et statistiques par module selon utilisateur",
    status: "vide",
    api: "À définir",
    missing: "Modèles officiels et règles de calcul"
  },
  {
    id: "settings",
    label: "Paramètres",
    title: "Paramètres",
    dao: "Listes, comptes, rubriques, programmes, lignes, devises, statuts et calendrier",
    status: "vide",
    api: "À définir",
    missing: "Référentiels validés par Paositra"
  },
  {
    id: "users",
    label: "Utilisateurs",
    title: "Utilisateurs / profils / habilitations",
    dao: "Utilisateurs avec profil, organe, habilitations et privilèges",
    status: "bloqué",
    api: "/api/v1/platform/users",
    missing: "Matrice contractuelle des rôles et délégations"
  },
  {
    id: "audit",
    label: "Audit",
    title: "Audit",
    dao: "Piste d'audit complète et inaltérable",
    status: "partiel",
    api: "/api/v1/platform/audit-events",
    missing: "Écran d'administration et droits finaux"
  },
  {
    id: "pcop-accounting",
    label: "Cadrage PCOP 2006",
    title: "Cadrage comptable PCOP 2006",
    dao: "Comptabilité publique proposée pour cadrer placements, comptes, budget et rapprochements",
    status: "proposition",
    api: "Tables accounting configurables",
    missing: "Référentiel, comptes, journaux et schémas validés par PAOMA",
    message: "Schéma comptable proposé sur base PCOP 2006 — à valider par PAOMA. Aucune écriture réelle n'est générée depuis une règle proposée.",
    details: pcopDetails
  },
  {
    id: "paoma-clarifications",
    label: "Points à clarifier",
    title: "Points à clarifier avec PAOMA",
    dao: "Décisions indispensables avant activation des modules métier",
    status: "bloqué",
    api: "Sans objet",
    missing: "Décisions PAOMA",
    message: "Je ne peux pas traiter cette partie car l'information requise est absente des données fournies.",
    details: paomaClarifications
  }
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
      {DEMO_MODE ? <TreasuryDemoWorkspace /> : <TreasuryWorkspace />}
    </AppShell>
  );
}

function TreasuryDemoWorkspace() {
  const firstScreen = demoScreens[0]!;
  const [activeId, setActiveId] = useState(firstScreen.id);
  const active = demoScreens.find((screen) => screen.id === activeId) ?? firstScreen;

  return (
    <>
      <div className="demo-banner">DÉMONSTRATION PROVISOIRE — CONFORME DAO — DONNÉES MÉTIER À VALIDER</div>
      <div className="presentation-layout">
        <nav className="side-menu" aria-label="Écrans de démonstration Trésorerie">
          {demoScreens.map((screen) => (
            <button
              className={screen.id === active.id ? "active" : ""}
              key={screen.id}
              onClick={() => setActiveId(screen.id)}
              type="button"
            >
              {screen.label}
            </button>
          ))}
        </nav>
        <section className="demo-main">
          <p className="breadcrumb">Lot 1 / Trésorerie / {active.label}</p>
          <div className="panel">
            <div className="demo-title">
              <div>
                <p className="eyebrow">PAOSITRA MALAGASY</p>
                <h2>{active.title}</h2>
                <p className="muted">{active.dao}</p>
              </div>
              <span className={`badge ${active.status === "bloqué" || active.status === "proposition" ? "warning" : ""}`}>
                {active.status}
              </span>
            </div>
            <Message type="info">
              {active.message ??
                "Aucune donnée réelle disponible pour cette démonstration. Les règles métier fines, les référentiels, les modèles de rapports et les habilitations définitives doivent être validés par Paositra."}
            </Message>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span>Données réelles chargées</span>
                <strong>0</strong>
                <small>Démo sans données métier</small>
              </div>
              <div className="kpi-card">
                <span>Exports actifs</span>
                <strong>—</strong>
                <small>À activer après validation</small>
              </div>
              <div className="kpi-card">
                <span>Règles métier</span>
                <strong>—</strong>
                <small>À clarifier</small>
              </div>
            </div>
            <div className="empty-state">
              <strong>État vide réel</strong>
              <span>Aucun enregistrement réel n'est présent pour cet écran.</span>
              <span>API prévue : {active.api}</span>
              <span>Blocage : {active.missing}</span>
            </div>
            {active.details && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sujet</th>
                      <th>Ce qui manque</th>
                      <th>Risque</th>
                      <th>Hypothèse KCI</th>
                      <th>À confirmer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.details.map((item) => (
                      <tr key={item.subject}>
                        <td>{item.subject}</td>
                        <td>{item.missing}</td>
                        <td>{item.risk}</td>
                        <td>{item.hypothesis}</td>
                        <td>{item.expected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="demo-actions">
              <button className="primary" disabled title="Action à activer après validation des règles métier par Paositra" type="button">
                Nouvelle action
              </button>
              <button className="disabled-action" disabled title="Export désactivé en mode démonstration" type="button">
                Export désactivé
              </button>
              <button className="secondary" disabled title="Workflow non validé contractuellement" type="button">
                Valider après clarification
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
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
