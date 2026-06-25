# Scénario de démonstration PAOMA

Durée cible : 10 à 15 minutes.

Message d'ouverture :

> Le DAO constitue la base contractuelle du projet. Le PCOP 2006 est utilisé
> comme référentiel de cadrage comptable public proposé, sous réserve de
> confirmation par PAOMA. Les comptes, journaux, schémas d'écritures, circuits de
> validation et modèles de rapports devront être validés officiellement avant
> activation des modules comptables en production.

## 1. Contexte DAOO

Présenter la référence `DAOO n°26/005-PAOSITRA/DG/PRMP/AOO`.

Dire clairement :

- aucune exigence n'est présentée comme finalisée;
- aucune donnée métier réelle n'est inventée;
- les écrans montrent la structure et les zones à valider.

## 2. Deux lots

- Lot 1 : gestion de la Trésorerie.
- Lot 2 : gestion des Opérations.

Montrer la séparation des deux frontends et l'API commune versionnée.

## 3. Socle sécurisé

Montrer :

- API `/api/v1`;
- PostgreSQL avec migrations versionnées;
- RBAC technique provisoire;
- audit append-only;
- idempotence sur écritures critiques;
- erreurs structurées;
- absence de seed métier.

## 4. Démo Lot 1

Ouvrir le Lot 1 et parcourir :

1. Tableau de bord Trésorerie.
2. Placements.
3. Simulation placement.
4. Institutions financières.
5. Facturation / recouvrement.
6. Comptes et mouvements.
7. Mandatement / paiement.
8. Chèques.
9. Rapprochement bancaire.
10. Budget / exécution budgétaire.
11. Reporting.
12. Paramètres.
13. Audit.
14. Cadrage comptable PCOP 2006.

Message à dire : les calculs de placement, statuts, journaux et écritures sont
des hypothèses à valider.

## 5. Démo Lot 2

Ouvrir le Lot 2 et parcourir :

1. Tableau de bord Opérations.
2. Agences.
3. Portefeuille agence.
4. Ouverture agence.
5. Coupure de gestion.
6. Fermeture agence.
7. Guichets / caisses.
8. Opérations caisse.
9. Validation journalière.
10. Demandes de valeurs.
11. Versements / rapatriements.
12. Pièces justificatives.
13. Vérification.
14. Accusés de crédit.
15. Mise à disposition de fonds.
16. Produits / services.
17. Valeurs postales.
18. Reporting.
19. Audit.
20. Cadrage comptable PCOP 2006.

Message à dire : aucun codique, seuil, stock VP, encaisse, produit, déficit ou
excédent n'est inventé.

## 6. Points à clarifier

Afficher la page `Points à clarifier avec PAOMA`.

Insister sur :

- matrice RBAC;
- workflows et statuts;
- référentiel comptable;
- schémas d'écritures;
- données initiales;
- rapports officiels;
- sécurité, cloud, sauvegarde et recette.

## 7. Cadrage PCOP 2006

Afficher la page `Cadrage comptable PCOP 2006`.

Dire :

- le PCOP 2006 oriente l'architecture comptable publique;
- les comptes et journaux ne sont pas définitifs;
- les règles `proposed` ne postent aucune écriture réelle;
- une écriture postée sera immuable et corrigée par contrepassation ou
  régularisation.

## 8. Audit et traçabilité

Montrer le principe :

- audit des actions sensibles;
- avant/après lorsque disponible;
- impossibilité de modification/suppression par le rôle applicatif sur l'audit;
- identifiant unique de transaction proposé mais non figé.

## 9. OpenAPI

Présenter :

- artefact `docs/openapi/openapi.json`;
- commande `npm run openapi:check`;
- Swagger runtime non exposé dans la pile Docker de production.

## 10. Prochaines étapes avec PAOMA

1. Valider le référentiel comptable applicable.
2. Valider la matrice RBAC contractuelle.
3. Fournir les données initiales et référentiels officiels.
4. Valider les règles de placement, caisse, agence, transferts et budget.
5. Valider les modèles de rapports et documents.
6. Choisir un module pilote Lot 1 et un module pilote Lot 2.
7. Activer progressivement les workflows après validation et tests.
