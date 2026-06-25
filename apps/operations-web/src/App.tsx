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
    title: "Tableau de bord Opérations",
    dao: "Vue d'ensemble, consolidation, anomalies, mises à disposition et documents mensuels",
    status: "vide",
    api: "Agrégats réels à définir",
    missing: "Modèles, seuils, calculs et données validées"
  },
  {
    id: "agencies",
    label: "Agences",
    title: "Agences",
    dao: "Gestion, consultation, ouverture, fermeture, rattachement et paramètres agence",
    status: "partiel",
    api: "/api/v1/operations/agencies",
    missing: "Codiques, seuils, profils et référentiels validés"
  },
  {
    id: "my-agency",
    label: "Mon agence",
    title: "Mon agence",
    dao: "Gestion des opérations dans une agence",
    status: "vide",
    api: "/api/v1/operations/agencies",
    missing: "Rattachement utilisateur/agence et profils"
  },
  {
    id: "day-situation",
    label: "Situation du jour",
    title: "Situation du jour",
    dao: "Situation comptable et encaisses d'une agence",
    status: "bloqué",
    api: "À définir",
    missing: "Règles comptables, journée et caisse"
  },
  {
    id: "agency-wallet",
    label: "Portefeuille agence",
    title: "Gestion portefeuille agence",
    dao: "Initialisation portefeuille, report numéraire, ME, encaisses et stock VP",
    status: "vide",
    api: "À définir",
    missing: "Règles de portefeuille, valeurs postales et référentiels"
  },
  {
    id: "open-agency",
    label: "Ouverture agence",
    title: "Ouverture agence",
    dao: "Ouverture agence et paramétrage max autorisé, numéraire, VP, ME, codique, zone et rattachement",
    status: "partiel",
    api: "/api/v1/operations/agencies",
    missing: "Codique, profils et référentiels validés"
  },
  {
    id: "close-agency",
    label: "Fermeture agence",
    title: "Fermeture agence",
    dao: "Fermeture agence, transfert des valeurs, rapatriement ou réintégration",
    status: "partiel",
    api: "/api/v1/operations/agencies/:id/close",
    missing: "Séquence métier et habilitations"
  },
  {
    id: "management-cut",
    label: "Coupure de gestion",
    title: "Coupure de gestion",
    dao: "Coupure de gestion",
    status: "vide",
    api: "À définir",
    missing: "Définition opérationnelle de la coupure"
  },
  {
    id: "inter-agencies",
    label: "Inter-agences",
    title: "Opérations inter-agences",
    dao: "Opérations entre agences, historiques et notifications",
    status: "vide",
    api: "À définir",
    missing: "Règles de transfert et validation"
  },
  {
    id: "fund-requests",
    label: "Demandes de valeurs",
    title: "Demande de fonds / demande de valeurs",
    dao: "Demandes de valeurs, notifications et versements/rapatriements",
    status: "vide",
    api: "À définir",
    missing: "Seuils, destinataires et autorisations"
  },
  {
    id: "remittances",
    label: "Versements",
    title: "Versements / rapatriements",
    dao: "Versements, rapatriements et réintégration",
    status: "vide",
    api: "À définir",
    missing: "Règles comptables et justificatifs"
  },
  {
    id: "attachments",
    label: "Pièces justificatives",
    title: "Pièces justificatives",
    dao: "Téléversement images pièces justificatives G59-G60",
    status: "vide",
    api: "À définir",
    missing: "Formats, conservation, contrôle et sécurité fichier"
  },
  {
    id: "counters",
    label: "Guichets et caisses",
    title: "Guichets et caisses",
    dao: "300 agences, 1500 caisses et opérations effectuées à la caisse",
    status: "vide",
    api: "À définir",
    missing: "Référentiel caisses et règles de guichet"
  },
  {
    id: "open-cashdesk",
    label: "Ouverture caisse",
    title: "Ouverture de caisse",
    dao: "Opérations effectuées à la caisse et encaisse",
    status: "bloqué",
    api: "À définir",
    missing: "Procédure d'ouverture et règles de numéraire"
  },
  {
    id: "cash-operations",
    label: "Opérations caisse",
    title: "Opérations caisse",
    dao: "Registre recettes/dépenses, tickets, levées et situation des envois",
    status: "bloqué",
    api: "À définir",
    missing: "Produits, services, règles comptables et privilèges"
  },
  {
    id: "close-cashdesk",
    label: "Fermeture caisse",
    title: "Fermeture de caisse",
    dao: "Validation journée et opérations non modifiables après validation",
    status: "bloqué",
    api: "À définir",
    missing: "Règles de fermeture et délégations"
  },
  {
    id: "daily-validation",
    label: "Validation journalière",
    title: "Validation journalière",
    dao: "Validation journée uniquement par Chef d'Agence",
    status: "bloqué",
    api: "À définir",
    missing: "Profil exact Chef d'Agence et suppléance"
  },
  {
    id: "verification",
    label: "Vérification",
    title: "Vérification",
    dao: "Résultat de vérification au fur et à mesure, déficit ou excédent",
    status: "vide",
    api: "À définir",
    missing: "Traitement des écarts et responsabilités"
  },
  {
    id: "credit-ack",
    label: "Accusés de crédit",
    title: "Accusés de crédit",
    dao: "Accusé de crédit",
    status: "vide",
    api: "À définir",
    missing: "Modèle officiel et workflow"
  },
  {
    id: "fund-availability",
    label: "Mise à disposition",
    title: "Mise à disposition de fonds",
    dao: "Mise à disposition de fonds",
    status: "vide",
    api: "À définir",
    missing: "Autorisations et règles comptables"
  },
  {
    id: "reporting",
    label: "Reporting",
    title: "Reporting",
    dao: "Exports CSV/Excel/PDF, CA, produit/région, performance et anomalies",
    status: "vide",
    api: "À définir",
    missing: "Données réelles, modèles, seuils et calculs"
  },
  {
    id: "products",
    label: "Produits & services",
    title: "Produits & services",
    dao: "Nouveaux produits/services et retrait sans suppression en base",
    status: "vide",
    api: "À définir",
    missing: "Référentiel, tarifs et modes de comptabilisation"
  },
  {
    id: "postal-values",
    label: "Valeurs postales",
    title: "Valeurs postales",
    dao: "Valeurs postales et activation types VP",
    status: "vide",
    api: "À définir",
    missing: "Types VP et règles de stock"
  },
  {
    id: "settings",
    label: "Paramètres",
    title: "Paramètres",
    dao: "Agences, pièces, registres, articles, règles comptables, calendriers",
    status: "vide",
    api: "À définir",
    missing: "Référentiels validés"
  },
  {
    id: "users",
    label: "Utilisateurs",
    title: "Utilisateurs / profils / habilitations",
    dao: "Utilisateurs, profils, rattachements et habilitations",
    status: "bloqué",
    api: "/api/v1/platform/users",
    missing: "Matrice contractuelle des rôles et périmètres"
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
    dao: "Comptabilité publique proposée pour cadrer agences, caisses, valeurs, transferts et régularisations",
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
    return <LoginPage applicationName="Gestion des opérations" />;
  }
  if (auth.user.mustChangePassword) {
    return <ChangePasswordPage applicationName="Gestion des opérations" />;
  }
  return (
    <AppShell title="Gestion des opérations">
      {DEMO_MODE ? <OperationsDemoWorkspace /> : <AgenciesWorkspace />}
    </AppShell>
  );
}

function OperationsDemoWorkspace() {
  const firstScreen = demoScreens[0]!;
  const [activeId, setActiveId] = useState(firstScreen.id);
  const active = demoScreens.find((screen) => screen.id === activeId) ?? firstScreen;

  return (
    <>
      <div className="demo-banner">DÉMONSTRATION PROVISOIRE — CONFORME DAO — DONNÉES MÉTIER À VALIDER</div>
      <div className="presentation-layout">
        <nav className="side-menu" aria-label="Écrans de démonstration Opérations">
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
          <p className="breadcrumb">Lot 2 / Opérations / {active.label}</p>
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
                "Aucune donnée réelle disponible pour cette démonstration. Aucun chiffre d'affaires, stock VP, déficit, excédent ou mouvement de caisse n'est simulé."}
            </Message>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span>Données réelles chargées</span>
                <strong>0</strong>
                <small>Démo sans données métier</small>
              </div>
              <div className="kpi-card">
                <span>Actions activées</span>
                <strong>—</strong>
                <small>Après validation Paositra</small>
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
