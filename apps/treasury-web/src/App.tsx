import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CurrentAccountsModule } from "./CurrentAccountsModule";
import { BudgetModule } from "./BudgetModule";
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

interface DemoBlueprint {
  tableTitle: string;
  columns: string[];
  formTitle: string;
  fields: string[];
  documentTitle: string;
  documentLines: string[];
  workflowTitle: string;
  workflowSteps: string[];
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

const emptyUserForm = {
  email: "",
  displayName: "",
  password: "",
  mustChangePassword: true
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

const treasuryBlueprints: Record<string, DemoBlueprint> = {
  dashboard: {
    tableTitle: "Indicateurs prévus",
    columns: ["Indicateur", "Périmètre", "Période", "Source", "Valeur"],
    formTitle: "Filtres du tableau de bord",
    fields: ["Période", "Direction", "Compte", "Institution", "Statut"],
    documentTitle: "Vue consolidée prévue",
    documentLines: ["Soldes", "Crédits", "Dossiers reçus", "Dossiers traités", "Délais"],
    workflowTitle: "Chaîne de calcul",
    workflowSteps: ["Source réelle", "Règle validée", "Agrégation backend", "Contrôle RBAC", "Affichage"]
  },
  placements: {
    tableTitle: "Placements enregistrés",
    columns: ["Référence", "Institution", "Montant", "Devise", "Taux", "Début", "Échéance", "Statut"],
    formTitle: "Structure d'un placement",
    fields: ["Institution", "Montant principal", "Devise", "Taux", "Durée", "Mode dépôt", "Mode calcul", "Date début"],
    documentTitle: "Journal des placements",
    documentLines: ["Ouverture", "Renouvellement", "Rapatriement principal", "Rapatriement intérêts", "Clôture"],
    workflowTitle: "Actions prévues",
    workflowSteps: ["Créer", "Modifier selon profil", "Notifier", "Rapatrier", "Clôturer", "Historiser"]
  },
  institutions: {
    tableTitle: "Institutions financières",
    columns: ["Code", "Nom", "Type", "Compte associé", "Statut", "Date validation"],
    formTitle: "Fiche institution",
    fields: ["Nom", "Type", "Coordonnées", "Compte bancaire", "Statut", "Note de validation"],
    documentTitle: "Référentiel institutions",
    documentLines: ["Institution validée", "Compte associé", "Périmètre autorisé", "Historique des changements"],
    workflowTitle: "Contrôle référentiel",
    workflowSteps: ["Proposition", "Validation PAOMA", "Activation", "Archivage sans suppression"]
  },
  "new-placement": {
    tableTitle: "Paramètres nécessaires",
    columns: ["Paramètre", "Source", "Obligatoire", "Statut", "Commentaire"],
    formTitle: "Formulaire d'ouverture",
    fields: ["Institution", "Montant", "Devise", "Taux", "Durée", "Mode dépôt", "Mode calcul", "Justificatif"],
    documentTitle: "Bordereau d'ouverture",
    documentLines: ["Référence transaction", "Données placement", "Validation", "Pièces jointes", "Audit"],
    workflowTitle: "Contrôles avant enregistrement",
    workflowSteps: ["Institution active", "Droits utilisateur", "Idempotence", "Audit", "Règle comptable validée"]
  },
  billing: {
    tableTitle: "Factures et recouvrements",
    columns: ["Facture", "Client", "Période", "Montant", "Créance liée", "Statut", "Échéance"],
    formTitle: "Dossier facture",
    fields: ["Client", "Période", "CPS source", "Montant", "Pièces", "Motif réclamation", "Statut"],
    documentTitle: "Gabarit facture vide",
    documentLines: ["En-tête PAOMA", "Client", "Période facturée", "Lignes de facturation", "Total", "Mentions à valider"],
    workflowTitle: "Workflow facturation",
    workflowSteps: ["Importer CPS", "Vérifier", "Rapprocher créance", "Émettre facture", "Relancer", "Recouvrer"]
  },
  reporting: {
    tableTitle: "Rapports disponibles",
    columns: ["Rapport", "Période", "Format", "Source", "Statut modèle"],
    formTitle: "Paramètres d'export",
    fields: ["Rapport", "Période", "Filtre", "Format", "Destinataire"],
    documentTitle: "Marquage export",
    documentLines: ["DÉMO — NON CONTRACTUEL — MODÈLE À VALIDER PAR PAOMA", "Filtres", "Colonnes", "Signature", "Horodatage"],
    workflowTitle: "Contrôles export",
    workflowSteps: ["Données réelles", "RBAC", "Traçabilité", "Modèle validé", "Génération"]
  },
  "pcop-accounting": {
    tableTitle: "Objets comptables configurables",
    columns: ["Objet", "Statut", "Source", "Validation requise", "Utilisation"],
    formTitle: "Référence comptable",
    fields: ["Référentiel", "Version", "Source", "Statut", "Validateur", "Note"],
    documentTitle: "Schéma comptable proposé",
    documentLines: ["Référentiel PCOP 2006 à confirmer", "Journal proposé", "Débit proposé", "Crédit proposé", "Validation PAOMA"],
    workflowTitle: "Publication d'écriture",
    workflowSteps: ["Règle proposed", "Validation PAOMA", "Compte actif", "Débit = crédit", "Postage", "Contrepassation si correction"]
  },
  "paoma-clarifications": {
    tableTitle: "Décisions attendues",
    columns: ["Point", "Responsable", "Document attendu", "Risque", "Statut"],
    formTitle: "Fiche de clarification",
    fields: ["Sujet", "Question", "Impact", "Hypothèse KCI", "Décision PAOMA"],
    documentTitle: "Compte-rendu de clarification",
    documentLines: ["Décision", "Responsable", "Date", "Impacts front/back/API/base", "Pièces associées"],
    workflowTitle: "Traitement d'une clarification",
    workflowSteps: ["Identifier", "Documenter", "Valider PAOMA", "Mettre à jour matrice", "Implémenter"]
  }
};

const defaultTreasuryBlueprint: DemoBlueprint = {
  tableTitle: "Registre prévu",
  columns: ["Référence", "Date", "Libellé", "Montant", "Statut", "Validateur", "Audit"],
  formTitle: "Formulaire prévu",
  fields: ["Référence", "Date", "Libellé", "Montant", "Pièce justificative", "Commentaire", "Statut"],
  documentTitle: "Gabarit document vide",
  documentLines: ["En-tête", "Référence", "Données métier", "Validation", "Mentions et signatures"],
  workflowTitle: "Workflow à valider",
  workflowSteps: ["Saisie", "Contrôle", "Validation", "Audit", "Export"]
};

function getTreasuryBlueprint(screen: DemoScreen) {
  return treasuryBlueprints[screen.id] ?? defaultTreasuryBlueprint;
}

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
      {DEMO_MODE && (
        <div className="demo-banner">
          MODE PRÉSENTATION — MODULES CONNECTÉS API UNIQUEMENT — AUCUNE DONNÉE MÉTIER FICTIVE
        </div>
      )}
      <TreasuryWorkspace />
    </AppShell>
  );
}

function TreasuryDemoWorkspace() {
  const firstScreen = demoScreens[0]!;
  const [activeId, setActiveId] = useState(firstScreen.id);
  const active = demoScreens.find((screen) => screen.id === activeId) ?? firstScreen;
  const blueprint = getTreasuryBlueprint(active);

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
            <DemoPreview blueprint={blueprint} screen={active} />
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
          </div>
        </section>
      </div>
    </>
  );
}

function DemoPreview({
  blueprint,
  screen
}: {
  blueprint: DemoBlueprint;
  screen: DemoScreen;
}) {
  return (
    <div className="module-demo">
      <section className="capability-board" aria-label="Lecture métier de l'écran">
        <article>
          <h3>Visible aujourd'hui</h3>
          <ul>
            <li>{blueprint.tableTitle}</li>
            <li>{blueprint.formTitle}</li>
            <li>{blueprint.documentTitle}</li>
            <li>État vide réel sans données inventées</li>
          </ul>
        </article>
        <article>
          <h3>Demandé par le DAO</h3>
          <ul>
            <li>{screen.dao}</li>
            <li>Registre, saisie, historique, contrôles et export selon le module</li>
            <li>{blueprint.workflowTitle}</li>
          </ul>
        </article>
        <article>
          <h3>À valider PAOMA</h3>
          <ul>
            <li>{screen.missing}</li>
            <li>Activation API : {screen.api}</li>
            <li>Aucun traitement métier définitif sans validation</li>
          </ul>
        </article>
      </section>

      <section className="demo-preview module-surface" aria-labelledby={`${screen.id}-surface`}>
        <div className="surface-heading">
          <div>
            <h3 id={`${screen.id}-surface`}>{blueprint.tableTitle}</h3>
            <p className="muted">Les colonnes et champs montrent le périmètre attendu, sans créer de donnée métier.</p>
          </div>
          <span className="badge warning">modèle à valider</span>
        </div>
        <div className="surface-grid">
          <div className="surface-block wide">
            <h4>{blueprint.tableTitle}</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {blueprint.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={blueprint.columns.length} className="empty-row">
                      Aucune donnée réelle disponible. Le tableau montre uniquement la structure attendue.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="surface-block">
            <h4>{blueprint.formTitle}</h4>
            <div className="form-skeleton compact">
              {blueprint.fields.map((field) => (
                <label key={field}>
                  {field}
                  <input disabled placeholder="À valider PAOMA" />
                </label>
              ))}
            </div>
          </div>
          <div className="surface-block document-preview">
            <h4>{blueprint.documentTitle}</h4>
            <div className="document-sheet compact">
              <div>
                <strong>PAOSITRA MALAGASY</strong>
                <span>DÉMO — NON CONTRACTUEL</span>
              </div>
              {blueprint.documentLines.map((line) => (
                <p key={line}>
                  <span>{line}</span>
                  <em>À compléter après validation</em>
                </p>
              ))}
            </div>
          </div>
          <div className="surface-block">
            <h4>{blueprint.workflowTitle}</h4>
            <ol className="workflow-list">
              {blueprint.workflowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="contract-panel">
              <strong>Front / back / audit</strong>
              <span>Route ou API prévue : {screen.api}</span>
              <span>Condition d'activation : {screen.missing}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TreasuryWorkspace() {
  const auth = useAuth();
  const [tab, setTab] = useState<"institutions" | "placements" | "receivables" | "accounts" | "budget" | "roles" | "clarifications" | "users" | "audit">("placements");
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
      <section className="panel module-home">
        <div>
          <p className="eyebrow">LOT 1 — TRÉSORERIE</p>
          <h2>Modules opérationnels connectés au backend</h2>
          <p className="muted">
            Cette vue affiche uniquement les fonctions réellement reliées à l'API, aux permissions et à l'audit.
            Les modules DAO non couverts par une route backend ne sont pas présentés comme utilisables.
          </p>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>Institutions financières</span>
            <strong>{institutions.length}</strong>
            <small>Données lues depuis /api/v1/treasury/institutions</small>
          </div>
          <div className="kpi-card">
            <span>Placements</span>
            <strong>{placements.length}</strong>
            <small>Données lues depuis /api/v1/treasury/placements</small>
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
      <nav className="tabs" aria-label="Modules de trésorerie">
        <button className={tab === "placements" ? "active" : ""} onClick={() => setTab("placements")}>
          Placements
        </button>
        <button className={tab === "receivables" ? "active" : ""} onClick={() => setTab("receivables")}>
          Créances
        </button>
        <button className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}>
          Comptes courants
        </button>
        <button className={tab === "budget" ? "active" : ""} onClick={() => setTab("budget")}>
          Budget
        </button>
        <button className={tab === "institutions" ? "active" : ""} onClick={() => setTab("institutions")}>
          Institutions
        </button>
        <button className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>
          Rôles &amp; habilitations
        </button>
        <button className={tab === "clarifications" ? "active" : ""} onClick={() => setTab("clarifications")}>
          Points à clarifier
        </button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          Utilisateurs
        </button>
        <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>
          Audit
        </button>
      </nav>
      {message && <Message type={message.type}>{message.text}</Message>}
      {tab === "budget" ? (
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
            {placements.length === 0 ? <p className="empty">Aucun placement enregistré.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Institution</th><th>Montant</th><th>Début</th><th>Durée</th><th>Échéance</th><th>État</th><th>Actions</th></tr></thead>
                  <tbody>
                    {placements.map((item) => {
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
            )}
          </section>
        </div>
      )}
    </>
  );
}

function TreasuryRolesHabilitations({ roles }: { roles: RbacRole[] }) {
  const filtered = roles.filter((r) => r.lot === "common" || r.lot === "lot1");
  const byLot = (l: string) => filtered.filter((r) => r.lot === l);

  return (
    <section className="panel">
      <h2>Rôles &amp; habilitations</h2>
      <div className="roles-table-notice">
        Proposition KCI — tous les rôles et périmètres listés sont des propositions à valider par PAOMA avant toute utilisation en production.
        Le DAO reste la référence contractuelle.
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

const treasuryClarifications = [
  { num: 1, title: "Matrice des rôles Lot 1", statut: "à clarifier", contenu: "Profils Lot 1 (directeur trésorerie, gestionnaire placement, trésorier, contrôleur), périmètres d'organe et délégations à définir contractuellement par PAOMA." },
  { num: 2, title: "Calculs financiers placements", statut: "à clarifier", contenu: "Formules d'intérêts (exact/365, 30/360, etc.), arrondi, fiscalité et pénalités de rupture non définies dans le DAO. À valider avant activation du moteur." },
  { num: 3, title: "Référentiel institutions financières", statut: "absent", contenu: "La liste des banques et institutions autorisées pour les placements PAOMA doit être fournie officiellement. Aucun seed métier n'est présent." },
  { num: 4, title: "Workflows de placement", statut: "partiel", contenu: "Ouverture et annulation sont implémentés. Renouvellement, rapatriement principal/intérêts et prolongation nécessitent des règles métier validées." },
  { num: 5, title: "Référentiel comptable trésorerie", statut: "à clarifier", contenu: "PCOP 2006 utilisé comme cadrage. Comptes, journaux et schémas débit/crédit pour placements, virements et rapprochements doivent être validés par PAOMA." },
  { num: 6, title: "Facturation et recouvrement", statut: "absent", contenu: "Module non couvert par une route backend. CPS, modèles de factures, workflow de réclamation et règles de rapprochement à définir." },
  { num: 7, title: "Comptes en devises", statut: "absent", contenu: "Comptes réels, taux de change, règles comptables et formats d'import bancaire à fournir par PAOMA." },
  { num: 8, title: "Rapprochement bancaire", statut: "absent", contenu: "Formats des relevés bancaires (SWIFT, MT940, CSV banque), tolérances et règles de traitement des anomalies à définir." },
  { num: 9, title: "Reporting réglementaire Lot 1", statut: "absent", contenu: "Modèles de rapports officiels (périodicité, format, destinataires institutionnels) non définis dans le DAO." },
  { num: 10, title: "Interopérabilité Lot 1 / Lot 2", statut: "à clarifier", contenu: "Les flux AC (accusés de crédit), rapatriements et virements entre trésorerie centrale et agences nécessitent une définition contractuelle des interfaces." }
];

function TreasuryPointsAClarifier() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="panel">
      <h2>Points à clarifier avec PAOMA — Lot 1 Trésorerie</h2>
      <p className="muted">
        Ces points sont des blocages ou propositions identifiés lors de l'analyse du DAO Lot 1.
        Ils ne peuvent pas être traités sans décision formelle de PAOMA.
      </p>
      <Message type="info">
        Le DAO reste la référence contractuelle. Aucune de ces propositions n'est implémentée comme règle définitive.
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
            <label>Montant<input inputMode="decimal" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label>Devise<input maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></label>
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
        {items.length === 0 ? <p className="empty">Aucune créance enregistrée.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Débiteur</th><th>Montant</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((r) => {
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
        )}
      </section>
    </div>
  );
}
