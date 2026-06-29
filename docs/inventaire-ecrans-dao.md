# Inventaire des écrans DAO

Référence unique : `DAOO n°26/005-PAOSITRA/DG/PRMP/AOO`.

Cet inventaire ne crée aucun écran et ne vaut pas validation fonctionnelle. Il
sert à distinguer ce qui est visible aujourd'hui, ce qui est partiel, ce qui est
absent et ce qui reste bloqué par clarification. Aucun écran ne doit être rempli
avec des données fictives.

Statuts : `existant`, `partiel`, `absent`, `à clarifier`.

## État des lieux DAO au 26 juin 2026 (branche demo-paoma-agences-roles-operationnel)

Aucune exigence DAO n'est marquée `Implémenté`. Le socle permet une
démonstration provisoire, mais les modules métier ne sont pas finalisés.

### Ce qui est en place

- Socle web séparé pour le Lot 1 Trésorerie et le Lot 2 Opérations.
- Connexion locale provisoire avec compte technique contrôlé pour la démo.
- Navigation de démonstration avec bannière `DÉMONSTRATION PROVISOIRE — NON CONTRACTUELLE`.
- États vides propres, sans agence, caisse, placement, opération, chiffre
  d'affaires ou statistique fictive.
- API versionnée `/api/v1`, erreurs structurées, pagination de base et OpenAPI
  versionné dans `docs/openapi/openapi.json`.
- PostgreSQL avec migrations versionnées, rôles séparés migration/application
  et protection de la table d'audit contre `UPDATE`, `DELETE`, `TRUNCATE`,
  désactivation de trigger et `DROP` par le rôle applicatif.
- RBAC technique provisoire avec refus par défaut et périmètres techniques
  `global`, `organ`, `direction`, `agency`, `counter`.
- Idempotence technique pour écritures critiques avec états `processing`,
  `completed`, `failed` et `expired`.
- Tests unitaires API, tests frontend réels minimaux et tests intégrés
  PostgreSQL éphémères.

### Ce qui est partiel

- Lot 1 : institutions financières et placements existent seulement comme flux
  partiels. Les règles de calcul, renouvellement, rapatriement, fermeture,
  statuts et habilitations ne sont pas validés.
- Lot 2 : agences existe seulement comme flux partiel. Les règles de codique,
  ouverture, fermeture, coupure de gestion, transfert, rattachement et profils
  ne sont pas validées.
- Audit : la base et les protections existent, mais l'écran d'administration
  complet, les exports d'audit et les habilitations définitives restent à faire.
- Utilisateurs : création contrôlée sans attribution automatique de permissions;
  la matrice contractuelle des rôles et délégations reste absente.
- Reporting : les écrans de démonstration affichent des états vides; aucun
  calcul ou indicateur métier n'est activé.

### Ce qui manque par rapport au DAO

- Lot 1 : facturation et recouvrement, créances, virements de régularisation,
  comptes en devises, comptes opérationnels, portefeuille électronique,
  comptes courants, mandatement, paiements, chèques, rapprochement bancaire,
  budget, exécution budgétaire, reporting complet, paramètres validés,
  utilisateurs/profils/habilitations définitifs.
- Lot 2 : portefeuilles agences, opérations inter-agences, demandes de valeurs,
  versements, rapatriements, pièces justificatives, guichets et caisses,
  opérations caisse, fermeture de caisse, validation journalière, vérification,
  accusés de crédit, mise à disposition de fonds, produits/services, valeurs
  postales, reporting complet, paramètres validés, utilisateurs/profils/
  habilitations définitifs.
- Commun : SSO, 2FA pour utilisateurs avec pouvoir lorsque applicable,
  chiffrement au repos démontré, préproduction, cloud d'exploitation, tests de
  charge Lot 2, rapports de tests complets, manuels, architecture finalisée,
  sauvegarde/restauration industrialisée et preuves d'hébergement.

### Informations bloquantes à clarifier

Je ne peux pas traiter cette partie car l'information requise est absente des données fournies.

Cela concerne notamment : matrice complète des rôles et permissions, statuts
métier exacts, règles comptables, formules d'intérêts, formats CPS/plateforme X,
modèles officiels de rapports, format définitif des références et identifiants
de transaction, fournisseur SSO, durées de conservation, RPO/RTO et fournisseur
cloud.

### Prochaines étapes recommandées

1. Valider humainement la matrice `docs/conformite-dao.md`.
2. Valider ou corriger les clarifications listées dans `docs/a-clarifier.md`.
3. Valider la matrice RBAC contractuelle avant d'activer les actions métier.
4. Choisir un module pilote Lot 1 et un module pilote Lot 2 uniquement après
   clarification des règles nécessaires.
5. Remplacer progressivement les écrans de démonstration par des écrans réels
   connectés API, PostgreSQL, RBAC, audit, exports et tests.

| ID | Exigence DAO liée | Lot | Écran | Statut actuel | API liée | Données nécessaires | Blocage | État vide réel possible | Risque sans clarification |
|---|---|---|---|---|---|---|---|---|---|
| ECR-L1-001 | Connexion multi-utilisateur | Commun/Lot 1 | Connexion Trésorerie | existant | `/api/v1/auth/login` | Compte provisionné de manière contrôlée | SSO/2FA à clarifier | Sans objet | Présenter l'authentification locale comme solution finale |
| ECR-L1-002 | Placements - ouverture, consultation, historique, annulation, clôture | 1 | Placements | partiel | `/api/v1/treasury/placements` | Institutions réelles, règles de calcul, statuts validés | Formules, statuts, profils, renouvellement et rapatriement | Oui | Inventer des calculs, statuts ou workflows |
| ECR-L1-003 | Configuration banques/institutions | 1 | Institutions financières | partiel | `/api/v1/treasury/institutions` | Institutions réelles validées | Référentiel initial absent | Oui | Créer de fausses institutions |
| ECR-L1-004 | Facturation et recouvrement | 1 | Factures, créances, relances, virements | absent | À définir | CPS, modèles de factures, créances réelles | Formats CPS, modèles, workflows | Oui | Inventer des factures ou créances |
| ECR-L1-005 | Comptes en devises, comptes opérationnels, portefeuille électronique | 1 | Comptes et mouvements | absent | À définir | Comptes réels, règles comptables | Règles comptables et référentiels | Oui | Produire des soldes ou mouvements fictifs |
| ECR-L1-006 | Comptes courants, mandats, paiements, chèques, rapprochement | 1 | Comptes courants et rapprochement | absent | À définir | Relevés, mandats, paiements, chèques réels | Formats bancaires/CCP, transitions | Oui | Inventer des anomalies ou soldes |
| ECR-L1-007 | Budget et exécution budgétaire | 1 | Dossiers budgétaires | absent | À définir | Crédits, dossiers, étapes, pièces | Workflow, vérificateurs, références | Oui | Figer un processus non validé |
| ECR-L1-008 | Reporting Trésorerie | 1 | Tableaux de bord et rapports | absent | À définir | Données réelles agrégées | Modèles officiels et règles de calcul | Oui | Afficher des statistiques fictives |
| ECR-L1-009 | Paramètres et utilisateurs | 1 | Paramètres, profils, habilitations | partiel | `/api/v1/platform` | Matrice RBAC, référentiels validés | Rôles, statuts, organes | Oui | Créer une matrice de droits inventée |
| ECR-L2-001 | Connexion multi-utilisateur | Commun/Lot 2 | Connexion Opérations | existant | `/api/v1/auth/login` | Compte provisionné de manière contrôlée | SSO/2FA à clarifier | Sans objet | Présenter l'authentification locale comme solution finale |
| ECR-L2-002 | Ouverture, fermeture, coupure de gestion agence | 2 | Agences | partiel | `/api/v1/operations/agencies` | Agences réelles, règles de gestion | Codique, profils, séquences de fermeture | Oui | Créer de fausses agences |
| ECR-L2-003 | Portefeuille agence, valeurs, versements, rapatriements | 2 | Portefeuilles et demandes de valeurs | absent | À définir | Soldes, valeurs postales, demandes réelles | Règles et autorisations | Oui | Inventer des mouvements ou soldes |
| ECR-L2-004 | Pièces justificatives G59-G60 et pièces d'identité | 2 | Pièces et téléversement | absent | À définir | Modèles, fichiers réels, conservation | Formats, sécurité, conservation | Oui | Stocker des pièces sans règles |
| ECR-L2-005 | Guichets, caisses, opérations caisse | 2 | Caisse et opérations | absent | À définir | Caisses, opérations réelles | Privilèges, journée, règles comptables | Oui | Simuler des opérations caisse |
| ECR-L2-006 | Validation journée par Chef d'Agence | 2 | Validation journalière | absent | À définir | Journées et opérations réelles | Profil exact, délégation, verrouillage | Oui | Inventer la validation ou la délégation |
| ECR-L2-007 | Vérification, déficit/excédent, accusé de crédit | 2 | Vérification et comptabilité | absent | À définir | Opérations, écarts, AC réels | Traitement des écarts, responsabilités | Oui | Inventer des écarts ou documents |
| ECR-L2-008 | Mise à disposition de fonds | 2 | Mise à disposition | absent | À définir | Autorisations et fonds réels | Règles comptables et profils | Oui | Créer des autorisations fictives |
| ECR-L2-009 | Reporting Opérations | 2 | Tableaux de bord agences | absent | À définir | Activités réelles, anomalies réelles | Modèles, calculs, seuils | Oui | Afficher CA ou anomalies fictifs |
| ECR-L2-010 | Paramètres, produits/services, valeurs postales | 2 | Paramètres Opérations | absent | À définir | Référentiels validés | Produits, règles de comptabilisation | Oui | Créer des produits ou tarifs inventés |
| ECR-L2-011 | Référentiel agences avec codiques, source et validation | 2 | Référentiel agences | partiel | `/api/v1/operations/agencies` + export/import/validate | Données officielles PAOMA | Codiques, géographie officielle | Oui — données demo_only tracées | Présenter les données démo comme officielles |
| ECR-COM-001 | Rôles, profils et habilitations | Commun | Rôles & habilitations (Lot 1 & 2) | proposition à valider | `/api/v1/platform/roles` | Matrice contractuelle PAOMA | Matrice RBAC officielle absente | Oui — avec badge "Proposition à valider" | Présenter les rôles proposés comme contractuels |
| ECR-COM-002 | Décisions et clarifications PAOMA | Commun | Points à clarifier (Lot 1 & 2) | existant | Sans objet | Décisions PAOMA | Sans objet | Oui | — |

## Stratégie écran vide conforme

Avant validation métier, un écran peut seulement afficher :

- un titre issu du DAO ;
- les actions réellement reliées à une API, un RBAC, un audit et des tests ;
- un état vide explicite lorsque la base ne contient aucune donnée réelle ;
- un message `À clarifier` quand les règles nécessaires sont absentes.

Les tableaux de bord ne doivent afficher aucun chiffre tant que les données
réelles et les règles de calcul ne sont pas validées.
