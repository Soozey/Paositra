# Matrice RBAC technique provisoire

Cette matrice n'est pas contractuelle. Elle sert uniquement à cadrer la démo et
à préparer la discussion avec PAOMA.

Règles générales :

- refus par défaut;
- aucune auto-attribution de permissions;
- aucune attribution supérieure aux droits du délégant;
- séparation création, validation, vérification, comptabilisation et audit;
- permissions sensibles contrôlées côté backend;
- audit obligatoire pour création, modification, annulation, validation,
  postage, changement de rôle, upload, export, sauvegarde et restauration.

## Profils candidats à valider

| Périmètre | Profil candidat | Rôle attendu | Statut |
|---|---|---|---|
| Commun | Administrateur système | Comptes, sécurité, audit, sauvegardes, paramètres techniques | Proposition KCI à valider |
| Commun | Superviseur | Consultation consolidée selon périmètre | Proposition KCI à valider |
| Commun | Auditeur | Consultation audit et exports autorisés | Proposition KCI à valider |
| Commun | Consultation | Lecture seule | Proposition KCI à valider |
| Commun | Validateur | Validation métier selon module | Proposition KCI à valider |
| Commun | Paramétreur | Référentiels validés | Proposition KCI à valider |
| Lot 1 | Agent Trésorerie | Saisie et consultation Trésorerie | Proposition KCI à valider |
| Lot 1 | Responsable Trésorerie | Validation et supervision Trésorerie | Proposition KCI à valider |
| Lot 1 | Comptable | Comptabilité et rapprochements | Proposition KCI à valider |
| Lot 1 | Responsable Budget | Budget et exécution budgétaire | Proposition KCI à valider |
| Lot 1 | Vérificateur | Vérification de dossiers | Proposition KCI à valider |
| Lot 1 | Décideur | Décision selon délégation validée | Proposition KCI à valider |
| Lot 2 | Agent guichet | Saisie opérations guichet | Proposition KCI à valider |
| Lot 2 | Caissier | Opérations caisse selon habilitation | Proposition KCI à valider |
| Lot 2 | Chef d'agence | Validation journalière si confirmé par PAOMA | Proposition KCI à valider |
| Lot 2 | Vérificateur | Vérification opérations et écarts | Proposition KCI à valider |
| Lot 2 | Comptable siège | Contrôle comptable siège | Proposition KCI à valider |
| Lot 2 | Responsable régional | Supervision régionale | Proposition KCI à valider |
| Lot 2 | Superviseur opérations | Pilotage opérations | Proposition KCI à valider |

## Rôles techniques implémentés (migration 0007 — branche demo-paoma-agences-roles-operationnel)

Table `platform.rbac_role_templates` créée. 19 rôles insérés, tous avec `status = 'proposition_a_valider'`.

| Code | Libellé | Lot | Scope | Statut |
|---|---|---|---|---|
| dg | Directeur Général | common | global | Proposition KCI à valider |
| dga | Directeur Général Adjoint | common | global | Proposition KCI à valider |
| auditeur_interne | Auditeur Interne | common | global | Proposition KCI à valider |
| responsable_conformite | Responsable Conformité | common | global | Proposition KCI à valider |
| admin_systeme | Administrateur Système | common | global | Proposition KCI à valider |
| responsable_reporting | Responsable Reporting | common | global | Proposition KCI à valider |
| lecteur_audit | Lecteur Audit | common | global | Proposition KCI à valider |
| directeur_tresorerie | Directeur Trésorerie | lot1 | direction | Proposition KCI à valider |
| gestionnaire_placement | Gestionnaire Placements | lot1 | organ | Proposition KCI à valider |
| tresorier | Trésorier | lot1 | organ | Proposition KCI à valider |
| controleur_financier | Contrôleur Financier | lot1 | organ | Proposition KCI à valider |
| directeur_operations | Directeur Opérations | lot2 | direction | Proposition KCI à valider |
| chef_agence | Chef d'Agence | lot2 | agency | Proposition KCI à valider |
| gestionnaire_agence | Gestionnaire Agence | lot2 | agency | Proposition KCI à valider |
| agent_guichet | Agent de Guichet | lot2 | counter | Proposition KCI à valider |
| agent_courrier | Agent Courrier | lot2 | agency | Proposition KCI à valider |
| agent_financier | Agent Financier Postal | lot2 | counter | Proposition KCI à valider |
| superviseur_regional | Superviseur Régional | lot2 | direction | Proposition KCI à valider |
| chef_district | Chef de District Postal | lot2 | direction | Proposition KCI à valider |

API disponible : `GET /api/v1/platform/roles` (permission `platform:roles:read` requise)

## Points à confirmer

1. Profils exacts et libellés officiels.
2. Périmètres : global, direction, organe, agence, caisse, guichet.
3. Délégations, suppléances et incompatibilités.
4. Profils soumis à 2FA.
5. Droits de création, modification, annulation, validation et export.
6. Droits de postage comptable et de contrepassation.
7. Droits de consultation des pièces sensibles.
8. Droits sur sauvegarde, restauration, audit et sécurité.
9. Matrice rôles ↔ permissions (table `platform.rbac_role_permissions` prête, liaisons à valider).
