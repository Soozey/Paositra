# Mise en œuvre conforme au DAOO 26/005

> Plan initial conservé pour traçabilité. Il décrit l'état du dossier avant la
> création du socle et ne constitue ni un état d'avancement actuel, ni une
> extension des exigences du DAO. Les documents actifs se trouvent dans
> `docs/`.

## Synthèse
- Le dossier contient uniquement le DAO de 111 pages. Aucun code, schéma PostgreSQL, API, écran, test ou document de suivi n’existe.
- Construire un monorepo TypeScript avec deux applications distinctes, Trésorerie et Opérations, reposant sur un socle commun.
- Utiliser React, NestJS, PostgreSQL, migrations versionnées, conteneurs et API REST documentées par OpenAPI.
- Ne jamais marquer une exigence « Implémenté » avant validation complète API, base, frontend, RBAC, audit, exports et tests.

## Mise En Œuvre

### 1. Gouvernance et conformité
- Créer une matrice traçable avec: référence/page DAO, exigence exacte, lot, module, API, tables, écran, export, audit, tests, statut et preuve.
- Initialiser les exigences vérifiables à « À faire » et les informations insuffisantes à « À clarifier ».
- Créer un journal sobre des décisions techniques, écarts, risques et validations.
- Signaler l’incohérence « Epargne Tsinjo » des pages 73 et 79 sans créer ce module.

### 2. Socle commun
- Organiser le monorepo en deux frontends, deux domaines backend et des bibliothèques partagées pour authentification, RBAC, audit, fichiers, exports, notifications et validation.
- Isoler les données en schémas PostgreSQL `platform`, `treasury` et `operations`, avec migrations non destructives et contraintes d’intégrité.
- Fournir pagination, filtres, recherche, transactions, verrouillage cohérent, idempotence des actions critiques et gestion des accès concurrents.
- Implémenter une authentification compatible OIDC/SSO, une extension 2FA, des politiques de mots de passe et des sessions inactives configurables.
- Implémenter un RBAC configurable avec périmètres organe, direction, agence et guichet. N’attribuer que les permissions explicitement établies par le DAO.
- Créer une piste d’audit append-only avec acteur, session, IP, outil d’accès, horodatage, objet, action et états avant/après. Interdire les mises à jour et suppressions au rôle applicatif.
- Sécuriser pièces jointes et imports: types, taille configurable, stockage persistant privé, contrôle d’accès, empreinte, rattachement métier et journalisation.
- Tracer les exports et utiliser des erreurs API structurées sans information sensible.

### 3. Domaines métier
- Lot 1: placements, facturation et recouvrement, comptes en devises et opérationnels, portefeuille électronique, comptes courants, élaboration et exécution budgétaires, reporting, paramètres et utilisateurs.
- Lot 2: agences et portefeuilles, opérations inter-agences, guichets et caisses, vérification et comptabilité, reporting, paramètres, produits/services et utilisateurs.
- Implémenter les annulations et archivages sans suppression physique, avec motif, auteur, date et historique.
- Protéger les validations journalières, rapprochements, paiements, mandats, mouvements de caisse et portefeuille par transactions PostgreSQL.
- Produire uniquement les indicateurs et documents explicitement demandés, à partir des données réelles.
- Prévoir CSV/Excel/PDF et Word uniquement pour les rapports auxquels le DAO l’impose.
- Utiliser des UUID internes. L’identifiant métier visible restera « À clarifier » tant que son format prédéfini n’est pas fourni.

### 4. Exploitation et livraison
- Fournir environnements local, test et préproduction reproductibles, healthchecks, logs structurés et observabilité.
- Préparer un déploiement horizontal portable avec gestion de charge pour 300 agences, 1 500 caisses et 2 000 connexions simultanées.
- Ajouter sauvegarde automatique PostgreSQL, fichiers et paramètres, restauration testable, archivage configurable et procédure de basculement.
- Livrer code source, manuels utilisateur et développeur, architecture, schéma de données, documentation API et rapports de tests.
- Prévoir la garantie de 24 mois, puis l’assistance sur commande selon le CCAP, et l’accompagnement minimal d’un an indiqué dans les spécifications.
- Le fournisseur devra assurer l’hébergement cloud et au moins trois comptes GitHub Team pendant un an conformément au DAO.

## Interfaces Publiques
- API versionnées sous `/api/v1/treasury` et `/api/v1/operations`.
- Contrats OpenAPI générés depuis des DTO validés côté serveur.
- Pagination et filtres uniformes, erreurs au format Problem Details, contrôle RBAC sur chaque route.
- Clé d’idempotence obligatoire pour les écritures financières et validations.
- Adaptateurs dédiés aux intégrations CPS, plateforme X, SSO, courriel et services partenaires, sans simuler les systèmes absents.

## Tests Et Acceptation
- Tests unitaires: calculs documentés, validations, permissions, transitions et identifiants.
- Tests intégrés avec PostgreSQL réel: API, transactions, verrous, audit, imports, exports et fichiers.
- Tests de workflow: validation, rejet, annulation, clôture, rapprochement et validation de journée.
- Tests RBAC couvrant accès direct aux routes et cloisonnement direction/agence/guichet.
- Tests de charge Lot 2 aux volumes nominaux et aux pointes supérieures à 250 opérations par agence et par jour.
- Tests de sauvegarde/restauration et vérification de l’inaltérabilité de l’audit.
- Builds frontend, tests responsive et absence d’erreurs console avant toute livraison.

## Informations Absentes
Les profils complets, matrices de droits, statuts, règles comptables, formules d’intérêts, modèles officiels, formats CPS/plateforme X, format des références, fournisseur SSO, durées RGPD, RPO/RTO et fournisseur cloud ne sont pas définis.

Je ne peux pas traiter cette partie car l'information requise est absente des données fournies.

Ces éléments resteront « À clarifier » et aucune règle ou donnée fictive ne sera créée pour les remplacer.
