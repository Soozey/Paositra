# RBAC PAOMA — Rôles et permissions (provisoire)

> **Statut : Proposition KCI — à valider par PAOMA avant toute utilisation en production.**
> Le DAO reste la référence contractuelle.

---

## 19 rôles candidats

Tous les rôles ont le statut `proposition_a_valider`.

### Commun (Lot 1 & Lot 2)

| Code | Libellé | Périmètre |
|---|---|---|
| `dg` | Directeur Général | global |
| `dga` | Directeur Général Adjoint | global |
| `auditeur_interne` | Auditeur Interne | global |
| `responsable_conformite` | Responsable Conformité | global |
| `admin_systeme` | Administrateur Système | global |
| `responsable_reporting` | Responsable Reporting | global |
| `lecteur_audit` | Lecteur Audit | global |

### Lot 1 — Trésorerie

| Code | Libellé | Périmètre |
|---|---|---|
| `directeur_tresorerie` | Directeur Trésorerie | direction |
| `gestionnaire_placement` | Gestionnaire Placements | organ |
| `tresorier` | Trésorier | organ |
| `controleur_financier` | Contrôleur Financier | organ |

### Lot 2 — Opérations

| Code | Libellé | Périmètre |
|---|---|---|
| `directeur_operations` | Directeur Opérations | direction |
| `chef_agence` | Chef d'Agence | agency |
| `gestionnaire_agence` | Gestionnaire Agence | agency |
| `agent_guichet` | Agent de Guichet | counter |
| `agent_courrier` | Agent Courrier | agency |
| `agent_financier` | Agent Financier Postal | counter |
| `superviseur_regional` | Superviseur Régional | direction |
| `chef_district` | Chef de District Postal | direction |

---

## Périmètres de scope

| Scope | Description |
|---|---|
| `global` | Accès toutes entités |
| `organ` | Accès à un organe (direction centrale) |
| `direction` | Accès à une direction régionale |
| `agency` | Accès à une agence spécifique |
| `counter` | Accès à un guichet/caisse spécifique |

---

## ~45 permissions définies

### platform.*

| Code | Description |
|---|---|
| `platform:users:manage` | Gérer les utilisateurs |
| `platform:audit:read` | Consulter l'audit |
| `platform:roles:read` | Consulter les rôles |
| `platform:roles:manage` | Gérer les rôles |
| `platform:agencies:validate` | Valider une agence |
| `platform:config:read` | Consulter la configuration |
| `platform:config:manage` | Gérer la configuration |
| `platform:notifications:read` | Consulter les notifications |
| `platform:dashboard:read` | Tableau de bord plateforme |

### treasury.*

| Code | Description |
|---|---|
| `treasury:institutions:read` | Consulter les institutions |
| `treasury:institutions:write` | Créer/modifier les institutions |
| `treasury:institutions:export` | Exporter les institutions |
| `treasury:institutions:validate` | Valider une institution |
| `treasury:placements:read` | Consulter les placements |
| `treasury:placements:write` | Créer un placement |
| `treasury:placements:cancel` | Annuler un placement |
| `treasury:placements:close` | Clôturer un placement |
| `treasury:placements:export` | Exporter les placements |
| `treasury:placements:approve` | Approuver un placement |
| `treasury:accounts:read` | Consulter les comptes |
| `treasury:accounts:manage` | Gérer les comptes |
| `treasury:flows:read` | Consulter les flux |
| `treasury:flows:manage` | Gérer les flux |
| `treasury:reports:read` | Consulter les rapports |
| `treasury:reports:export` | Exporter les rapports |
| `treasury:dashboard:read` | Tableau de bord trésorerie |

### operations.*

| Code | Description |
|---|---|
| `operations:agencies:read` | Consulter les agences |
| `operations:agencies:write` | Créer/modifier les agences |
| `operations:agencies:close` | Fermer une agence |
| `operations:agencies:validate` | Valider une agence |
| `operations:agencies:import` | Importer des agences CSV |
| `operations:agencies:export` | Exporter les agences CSV |
| `operations:counters:read` | Consulter les guichets |
| `operations:counters:manage` | Gérer les guichets |
| `operations:postal:read` | Consulter les opérations postales |
| `operations:postal:manage` | Gérer les opérations postales |
| `operations:parcels:read` | Consulter les colis |
| `operations:parcels:manage` | Gérer les colis |
| `operations:transfers:read` | Consulter les transferts |
| `operations:transfers:manage` | Gérer les transferts |
| `operations:financial:read` | Consulter les op. financières |
| `operations:financial:manage` | Gérer les op. financières |
| `operations:reports:read` | Consulter les rapports |
| `operations:reports:export` | Exporter les rapports |
| `operations:dashboard:read` | Tableau de bord opérations |

---

## Points à valider PAOMA

- Matrice rôles ↔ permissions (quels rôles ont quelles permissions)
- Règles d'incompatibilité entre rôles
- Délégations et suppléances
- Périmètres d'attribution (qui peut attribuer quel rôle)
- Durée et renouvellement des habilitations
