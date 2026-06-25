# Cadrage comptable PCOP 2006 pour PAOMA

Référence contractuelle principale : `DAOO n°26/005-PAOSITRA/DG/PRMP/AOO`.

Le DAO constitue la base contractuelle du projet. Le PCOP 2006 est utilisé
comme référentiel de cadrage comptable public proposé, sous réserve de
confirmation par PAOMA. Les comptes, journaux, schémas d'écritures, circuits de
validation et modèles de rapports devront être validés officiellement avant
activation des modules comptables en production.

## Position de cadrage

- Le DAO décrit les fonctions attendues pour les deux lots.
- Le PCOP 2006 et son guide d'application ne remplacent pas le DAO.
- Le PCOP 2006 sert uniquement d'hypothèse de cadrage comptable public.
- Toute hypothèse comptable doit rester marquée `Proposition KCI / hypothèse
  PCOP à valider`.
- Toute règle absente du DAO et non validée par PAOMA reste `À clarifier avec
  PAOMA`.
- Aucune exigence n'est marquée `Implémenté`.

À confirmer avec PAOMA : le référentiel réellement applicable à PAOMA, les
responsables habilités à valider ce référentiel, les comptes, journaux, schémas
d'écritures, pièces justificatives, circuits de validation et modèles de
rapports.

## Nature des éléments

| Nature | Définition | Exemple | Statut autorisé |
|---|---|---|---|
| Exigence DAO | Fonction explicitement demandée dans le DAOO | Placements, caisse, validation journalière, audit, identifiant unique | `À faire`, `En cours`, `À clarifier` |
| Hypothèse PCOP 2006 | Cadrage déduit du PCOP 2006 ou du guide | Comptabilité d'exercice, droits et obligations constatés, classes de comptes, comptes financiers | `Proposition KCI / hypothèse PCOP à valider` |
| Choix technique KCI | Moyen technique proposé pour construire le logiciel | Tables configurables, statuts `proposed/validated`, moteur de règles | `Choix technique interne` |
| Point à clarifier | Information absente ou insuffisante | Schéma exact d'écriture, formule d'intérêt, modèle G59/G60 | `À clarifier avec PAOMA` |

## Constats issus des documents

### DAO

Le DAO demande notamment :

- Lot 1 : placements, facturation et recouvrement, comptes, comptes courants,
  mandatement, paiement, chèques, rapprochement bancaire, budget, reporting,
  audit et API.
- Lot 2 : agences, portefeuilles, valeurs, opérations inter-agences, caisses,
  validation journalière, vérification, accusés de crédit, mise à disposition de
  fonds, produits/services, valeurs postales, reporting, audit et API.
- Commun : SSO/2FA à préciser, piste d'audit inaltérable, sauvegarde,
  restauration, identifiant unique de transaction reflétant le type et l'heure.

### PCOP 2006 et guide

Le PCOP 2006 fournit un cadre de comptabilité publique compatible avec :

- comptabilité d'exercice;
- constatation des droits et obligations;
- recettes et dépenses;
- opérations de trésorerie;
- responsabilités de l'ordonnateur et du comptable;
- justifications des opérations;
- opérations de fin d'année;
- comptes financiers, caisse, banques, chèques postaux, placements de
  trésorerie autorisés, avances et virements internes.

Ces éléments ne suffisent pas à valider les comptes PAOMA. Ils orientent
l'architecture, mais les imputations définitives doivent être validées par
PAOMA.

## Modules DAO avec impact comptable

| Lot | Module DAO | Impact comptable attendu | Référentiel de cadrage proposé |
|---|---|---|---|
| 1 | Placements | Ouverture, intérêts courus, rapatriement principal/intérêts, renouvellement, clôture, annulation | DAO + PCOP 2006 à valider |
| 1 | Facturation / recouvrement | Créances, relances, virements de régularisation, rapprochement CPS | DAO + procédure interne PAOMA requise |
| 1 | Comptes en devises / opérationnels / portefeuille électronique | Mouvements financiers, rapprochements, validations | DAO + PCOP 2006 à valider |
| 1 | Comptes courants | Encaissements, décaissements, mandats, paiements, chèques | DAO + PCOP 2006 à valider |
| 1 | Rapprochement bancaire | Solde livre, solde relevé, anomalies, régularisations | DAO + procédure interne PAOMA requise |
| 1 | Budget / exécution budgétaire | Crédits, engagements, dossiers, versions, vérification | DAO + PCOP 2006 à valider |
| 2 | Agences / portefeuilles | Initialisation, numéraire, ME, VP, transfert, rapatriement | DAO + procédure interne PAOMA requise |
| 2 | Caisses / guichets | Recettes, dépenses, billetage, fermeture, validation journalière | DAO + PCOP 2006 à valider |
| 2 | Inter-agences / demandes de valeurs | Transferts, versements, rapatriements, notifications | DAO + PCOP 2006 à valider |
| 2 | Vérification / écarts | Déficits, excédents, responsabilités, régularisations | DAO + procédure interne PAOMA requise |
| 2 | Accusés de crédit / mise à disposition | Situation comptable, encaisses, fonds disponibles | DAO + procédure interne PAOMA requise |
| 2 | Produits / services / valeurs postales | Référentiels, stocks, ventes, retrait sans suppression | DAO + procédure interne PAOMA requise |

## Règles comptables manquantes

- Référentiel applicable : PCOP 2006, PCG, procédure interne PAOMA ou référentiel
  hybride validé.
- Plan de comptes exact et comptes autorisés par module.
- Journaux comptables définitifs.
- Schémas débit/crédit par type d'opération.
- Règles d'arrondi, devise, change, fiscalité, pénalités et retenues.
- Règles de rapprochement bancaire, CCP, CPS et plateformes partenaires.
- Traitement des annulations, contrepassations et régularisations.
- Périodes comptables, verrouillage, clôture et corrections après clôture.
- Habilitations exactes pour créer, vérifier, poster, annuler et auditer.
- Modèles officiels de rapports, tickets, factures, AC, G59/G60 et états.

## Architecture comptable configurable proposée

L'architecture proposée sépare les référentiels, les règles et les écritures :

- `accounting_references` : référentiels possibles, dont `PCOP_2006`, procédure
  interne PAOMA ou autre référentiel validé.
- `chart_of_accounts` : plan de comptes importable, avec statut `proposed`,
  `validated` ou `inactive`.
- `accounting_journals` : journaux candidats, initialement proposés.
- `accounting_rule_templates` : modèles d'écritures par opération.
- `accounting_entries` : écritures comptables, sans suppression après postage.
- `accounting_entry_lines` : lignes débit/crédit.
- `accounting_periods` : périodes ouvertes, verrouillées ou clôturées.
- `platform.transaction_sequences` : séquences atomiques pour l'identifiant
  technique de transaction proposé.

Règles de sécurité prévues :

- aucun import PCOP n'est considéré définitif sans validation PAOMA;
- aucune règle `proposed` ne peut poster d'écriture réelle;
- une écriture `posted` ne peut être ni modifiée ni supprimée;
- correction uniquement par contrepassation ou écriture de régularisation;
- total débit = total crédit avant postage;
- compte actif, validé et imputable requis pour poster;
- période ouverte requise pour poster;
- audit obligatoire pour les actions sensibles.
- format d'identifiant de transaction configurable, non définitif, sans
  réutilisation de séquence.

## Décisions attendues de PAOMA

1. Confirmer le référentiel comptable applicable.
2. Désigner les responsables habilités à valider les règles comptables.
3. Fournir le plan de comptes applicable ou confirmer l'import PCOP à adapter.
4. Valider les journaux comptables à activer.
5. Valider les schémas débit/crédit par type d'opération.
6. Valider les règles de placement : intérêts, jours, arrondis, retenues,
   pénalités et fiscalité.
7. Valider les règles de caisse, journée, billetage, déficit et excédent.
8. Valider les règles de transfert inter-agences, rapatriement, versement et VP.
9. Valider la matrice RBAC contractuelle.
10. Valider les modèles de rapports, factures, tickets, AC, G59/G60 et exports.
11. Valider le format de l'identifiant unique de transaction.
12. Valider les exigences d'exploitation : cloud, sauvegarde, PRA/PCA, RPO/RTO.
