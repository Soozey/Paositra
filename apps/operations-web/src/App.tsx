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

const operationsBlueprints: Record<string, DemoBlueprint> = {
  dashboard: {
    tableTitle: "Indicateurs opérations prévus",
    columns: ["Indicateur", "Agence", "Période", "Source", "Valeur"],
    formTitle: "Filtres tableau de bord",
    fields: ["Période", "Région", "Agence", "Produit/service", "Statut"],
    documentTitle: "Vue consolidée agences",
    documentLines: ["Activité agences", "Anomalies", "Mises à disposition", "Documents mensuels"],
    workflowTitle: "Chaîne de consolidation",
    workflowSteps: ["Données agence", "Contrôle RBAC", "Agrégation backend", "Validation modèle", "Affichage"]
  },
  agencies: {
    tableTitle: "Agences enregistrées",
    columns: ["Codique", "Agence", "Zone", "Rattachement", "Statut", "Chef d'agence", "Audit"],
    formTitle: "Fiche agence",
    fields: ["Codique", "Nom agence", "Zone", "Rattachement", "Max numéraire", "Max VP", "Max ME"],
    documentTitle: "Fiche agence vide",
    documentLines: ["Identification", "Rattachement", "Seuils", "Responsables", "Historique"],
    workflowTitle: "Cycle agence",
    workflowSteps: ["Proposition", "Validation référentiel", "Ouverture", "Coupure", "Fermeture", "Archivage"]
  },
  "agency-wallet": {
    tableTitle: "Portefeuille agence",
    columns: ["Agence", "Numéraire", "ME", "Stock VP", "Dernière coupure", "Statut"],
    formTitle: "Initialisation portefeuille",
    fields: ["Agence", "Report numéraire", "Montant ME", "Types VP", "Stock VP", "Justificatif"],
    documentTitle: "Situation portefeuille",
    documentLines: ["Numéraire", "Monnaie électronique", "Valeurs postales", "Écarts", "Validation"],
    workflowTitle: "Contrôles portefeuille",
    workflowSteps: ["Initialiser", "Contrôler", "Transférer", "Rapatrier", "Auditer"]
  },
  "open-agency": {
    tableTitle: "Paramètres d'ouverture",
    columns: ["Champ", "Obligatoire", "Source", "Validation", "Statut"],
    formTitle: "Ouverture agence",
    fields: ["Codique", "Agence", "Zone", "Rattachement", "Max numéraire", "Max VP", "Max ME", "Date début chef"],
    documentTitle: "Procès-verbal d'ouverture",
    documentLines: ["Agence", "Codique", "Portefeuille initial", "Chef d'agence", "Validation"],
    workflowTitle: "Contrôles avant ouverture",
    workflowSteps: ["Référentiel validé", "Seuils validés", "Chef désigné", "Audit", "Activation"]
  },
  attachments: {
    tableTitle: "Pièces justificatives",
    columns: ["Référence", "Type", "Dossier", "Format", "Taille", "Statut sécurité"],
    formTitle: "Téléversement G59-G60",
    fields: ["Dossier", "Type pièce", "Fichier", "Date pièce", "Émetteur", "Note"],
    documentTitle: "Bordereau pièces",
    documentLines: ["G59", "G60", "Pièce d'identité", "Contrôle format", "Conservation"],
    workflowTitle: "Sécurité fichier",
    workflowSteps: ["Contrôle type", "Contrôle taille", "Stockage persistant", "Droits d'accès", "Audit"]
  },
  "cash-operations": {
    tableTitle: "Opérations caisse",
    columns: ["Référence", "Heure", "Caisse", "Type", "Mode paiement", "Montant", "Statut"],
    formTitle: "Saisie opération caisse",
    fields: ["Caisse", "Produit/service", "Client", "Montant", "Mode paiement", "Pièce", "Motif"],
    documentTitle: "Ticket de caisse vide",
    documentLines: ["Référence transaction", "Agence", "Caisse", "Opération", "Montant", "Signature"],
    workflowTitle: "Cycle opération caisse",
    workflowSteps: ["Saisie", "Contrôle privilège", "Ticket", "Modification même journée selon droit", "Validation journée"]
  },
  "daily-validation": {
    tableTitle: "Journées à valider",
    columns: ["Agence", "Date", "Caisse", "Recettes", "Dépenses", "Écart", "Statut"],
    formTitle: "Validation journalière",
    fields: ["Agence", "Date", "Chef d'agence", "Observations", "Motif écart", "Pièces"],
    documentTitle: "Arrêté journalier vide",
    documentLines: ["Billetage", "Recettes", "Dépenses", "Écarts", "Certification chef d'agence"],
    workflowTitle: "Verrouillage journée",
    workflowSteps: ["Contrôler caisses", "Vérifier écarts", "Chef d'agence valide", "Verrouiller", "Auditer"]
  },
  "credit-ack": {
    tableTitle: "Accusés de crédit",
    columns: ["Référence AC", "Agence", "Date", "Montant", "Objet", "Statut"],
    formTitle: "Demande d'accusé de crédit",
    fields: ["Agence", "Période", "Objet", "Montant", "Justificatifs", "Validateur"],
    documentTitle: "Gabarit accusé de crédit",
    documentLines: ["Agence", "Situation comptable", "Encaisse", "Montant", "Validation"],
    workflowTitle: "Production AC",
    workflowSteps: ["Calcul validé", "Vérification", "Génération", "Signature", "Archivage"]
  },
  products: {
    tableTitle: "Produits et services",
    columns: ["Code", "Libellé", "Famille", "Tarif", "Compte proposé", "Statut"],
    formTitle: "Fiche produit/service",
    fields: ["Code", "Libellé", "Famille", "Tarif", "Règle comptable", "Statut"],
    documentTitle: "Référentiel produits",
    documentLines: ["Produit", "Tarif", "Comptabilisation", "Retrait sans suppression", "Historique"],
    workflowTitle: "Gestion référentiel",
    workflowSteps: ["Proposer", "Valider", "Activer", "Retirer de l'interface", "Conserver historique"]
  },
  "postal-values": {
    tableTitle: "Valeurs postales",
    columns: ["Type VP", "Agence", "Stock", "Seuil", "Statut", "Dernier mouvement"],
    formTitle: "Activation valeur postale",
    fields: ["Type VP", "Agence", "Stock initial", "Seuil", "Justificatif", "Statut"],
    documentTitle: "Situation stock VP",
    documentLines: ["Type", "Stock", "Entrées", "Sorties", "Écart", "Validation"],
    workflowTitle: "Cycle VP",
    workflowSteps: ["Référentiel", "Initialisation", "Mouvement", "Inventaire", "Rapprochement"]
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

const defaultOperationsBlueprint: DemoBlueprint = {
  tableTitle: "Registre prévu",
  columns: ["Référence", "Date", "Agence", "Type", "Montant", "Statut", "Audit"],
  formTitle: "Formulaire prévu",
  fields: ["Agence", "Date", "Type", "Montant", "Pièce justificative", "Commentaire", "Statut"],
  documentTitle: "Gabarit document vide",
  documentLines: ["En-tête", "Référence", "Données opération", "Validation", "Mentions et signatures"],
  workflowTitle: "Workflow à valider",
  workflowSteps: ["Saisie", "Contrôle", "Validation", "Audit", "Export"]
};

function getOperationsBlueprint(screen: DemoScreen) {
  return operationsBlueprints[screen.id] ?? defaultOperationsBlueprint;
}

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
      {DEMO_MODE && (
        <div className="demo-banner">
          MODE PRÉSENTATION — MODULES CONNECTÉS API UNIQUEMENT — AUCUNE DONNÉE MÉTIER FICTIVE
        </div>
      )}
      <AgenciesWorkspace />
    </AppShell>
  );
}

function OperationsDemoWorkspace() {
  const firstScreen = demoScreens[0]!;
  const [activeId, setActiveId] = useState(firstScreen.id);
  const active = demoScreens.find((screen) => screen.id === activeId) ?? firstScreen;
  const blueprint = getOperationsBlueprint(active);

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
            <li>État vide réel sans agence, caisse, stock ou opération inventés</li>
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
  const [tab, setTab] = useState<"agencies" | "caisses" | "verification" | "opsdashboard" | "valeurs" | "alertes" | "referentiel" | "roles" | "clarifications" | "users" | "audit">("agencies");
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
              "/api/v1/operations/agencies?pageSize=200",
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
      <nav className="tabs" aria-label="Modules opérations">
        <button className={tab === "agencies" ? "active" : ""} onClick={() => setTab("agencies")}>
          Agences
        </button>
        <button className={tab === "caisses" ? "active" : ""} onClick={() => setTab("caisses")}>
          Caisses
        </button>
        <button className={tab === "verification" ? "active" : ""} onClick={() => setTab("verification")}>
          Vérification
        </button>
        <button className={tab === "opsdashboard" ? "active" : ""} onClick={() => setTab("opsdashboard")}>
          Tableau de bord
        </button>
        <button className={tab === "valeurs" ? "active" : ""} onClick={() => setTab("valeurs")}>
          Inter-agences
        </button>
        <button className={tab === "alertes" ? "active" : ""} onClick={() => setTab("alertes")}>
          Alertes
        </button>
        <button className={tab === "referentiel" ? "active" : ""} onClick={() => setTab("referentiel")}>
          Référentiel agences
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
      {tab === "caisses" ? (
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
