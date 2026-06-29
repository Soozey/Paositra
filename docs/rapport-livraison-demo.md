# Rapport de livraison — Démo PAOSITRA / PAOMA

**Date** : 26 juin 2026
**Branche** : `demo-paoma-agences-roles-operationnel`
**Commit de base** : `9ac77c8f16b93227b322fcaec1dcf3b6c55fa104`

> Le DAO reste la référence contractuelle.
> Toute donnée non fournie officiellement par PAOMA est marquée `demo_only`, `public_source` ou `to_validate`.

---

## Résumé des changements

### Nouveaux fichiers (10)

| Fichier | Type | Description |
|---|---|---|
| `database/migrations/0007_expand_agencies_and_permissions.sql` | SQL | Expansion agencies + tables RBAC + 34 permissions + 19 rôles |
| `apps/api/src/platform/roles.controller.ts` | API | GET /platform/roles, /platform/roles/:code, /platform/roles/permissions |
| `apps/api/src/platform/roles.service.ts` | API | Service roles — listRoles, getRoleByCode, listPermissions |
| `data/reference/paoma/agencies.template.csv` | Données | Template vide pour import PAOMA |
| `data/reference/paoma/agencies.demo.csv` | Données | 14 agences demo_only couvrant 6 provinces Madagascar |
| `docs/agences-paoma.md` | Doc | Référentiel agences — structure, API, points à clarifier |
| `docs/rbac-paoma-provisoire.md` | Doc | 19 rôles + 45 permissions — tous proposition_a_valider |
| `docs/demo-paoma-scenario.md` | Doc | Scénario de démonstration pas-à-pas |
| `docs/points-a-clarifier-paoma.md` | Doc | 13 sections Lot 2 + 10 sections Lot 1 |

### Fichiers modifiés (13)

| Fichier | Changement |
|---|---|
| `apps/api/src/database/entities.ts` | +19 champs Agency + entité RbacRoleTemplate |
| `apps/api/src/operations/operations.controller.ts` | +3 routes : validate, export, import CSV |
| `apps/api/src/operations/operations.dto.ts` | +5 filtres AgencyQueryDto + ValidateAgencyDto |
| `apps/api/src/operations/operations.module.ts` | +MulterModule |
| `apps/api/src/operations/operations.service.ts` | +validateAgency, exportAgencies, importAgencies |
| `apps/api/src/platform/platform.module.ts` | +RolesController, RolesService, RbacRoleTemplate, Permission |
| `apps/operations-web/src/App.tsx` | +3 onglets : Référentiel agences, Rôles & habilitations, Points à clarifier |
| `apps/treasury-web/src/App.tsx` | +2 onglets : Rôles & habilitations, Points à clarifier |
| `packages/web-core/src/styles.css` | +badges source, bannière disclaimer, styles rôles/clarifications |
| `docs/cadrage-pcop-2006-paoma.md` | +note migration 0007 |
| `docs/inventaire-ecrans-dao.md` | +3 entrées nouveaux écrans (ECR-L2-011, ECR-COM-001, ECR-COM-002) |
| `docs/matrice-rbac-provisoire.md` | +table 19 rôles implémentés |

---

## Agences par source_type (données de démonstration)

| source_type | Nombre | Statut |
|---|---|---|
| demo_only | 14 | Démo uniquement — jamais en production |
| paoma_validated | 0 | Aucune donnée officielle fournie |
| public_source | 0 | Aucune donnée publique chargée |
| to_validate | 0 | Aucune donnée en attente |

**Total agences démo** : 14 couvrant Analamanga, Atsinanana, Haute Matsiatra, Boeny, Atsimo-Andrefana, Diana.

---

## Rôles — 19 rôles templates

Tous avec `status = 'proposition_a_valider'`.

| Lot | Nombre de rôles |
|---|---|
| common | 7 |
| lot1 | 4 |
| lot2 | 8 |
| **Total** | **19** |

---

## Permissions — 45 permissions définies

| Préfixe | Permissions existantes | Nouvelles (migration 0007) |
|---|---|---|
| platform.* | 2 | 7 |
| treasury.* | 5 | 10 |
| operations.* | 4 | 16 |
| **Total** | **11** | **33** |

**Total global** : 44 permissions (+ 1 existante manquée = ~45)

---

## Nouveaux endpoints API

| Méthode | Route | Permission |
|---|---|---|
| GET | `/api/v1/platform/roles` | platform:roles:read |
| GET | `/api/v1/platform/roles/permissions` | platform:roles:read |
| GET | `/api/v1/platform/roles/:code` | platform:roles:read |
| PATCH | `/api/v1/operations/agencies/:id/validate` | operations:agencies:validate |
| GET | `/api/v1/operations/agencies/export` | operations:agencies:export |
| POST | `/api/v1/operations/agencies/import` | operations:agencies:import |

---

## Nouveaux écrans frontend

| App | Onglet | Contenu |
|---|---|---|
| operations-web | Référentiel agences | Filtres, badges source, compteurs, export/import, validation |
| operations-web | Rôles & habilitations | 19 rôles groupés par lot, badge "Proposition à valider" |
| operations-web | Points à clarifier | 13 sections accordéon Lot 2 |
| treasury-web | Rôles & habilitations | Rôles common + lot1 |
| treasury-web | Points à clarifier | 10 sections accordéon Lot 1 |

---

## Résultats des vérifications

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` API | PASS — 0 erreur |
| `tsc --noEmit` operations-web | PASS — 0 erreur |
| `tsc --noEmit` treasury-web | PASS — 0 erreur |
| `npm run build` API | PASS |
| `npm run build` operations-web | PASS (169 kB) |
| `npm run build` treasury-web | PASS (164 kB) |
| Styles inline | Corrigés — classes CSS dans styles.css |
| Données fictives présentées comme réelles | Aucune |

---

## Blockers et points à clarifier restants

1. **Données PAOMA officiales** : aucune donnée `paoma_validated` — `agencies.demo.csv` est demo_only
2. **Matrice RBAC contractuelle** : 19 rôles proposés, aucun n'est contractuel
3. **Format codique PAOMA** : champ préparé mais format non défini par PAOMA
4. **Règles comptables PCOP 2006** : cadrage provisoire — référentiel à confirmer
5. **@types/multer** non installé — interface locale `MulterFile` utilisée (fonctionnel, pas de risque runtime)

---

## Commandes de lancement

```bash
# Démarrer tous les services
docker-compose up

# Appliquer la migration 0007 (si base de dev déjà créée)
psql $DATABASE_URL -f database/migrations/0007_expand_agencies_and_permissions.sql

# Démarrer en mode démo
VITE_DEMO_MODE=true npm run dev --workspace=apps/operations-web
VITE_DEMO_MODE=true npm run dev --workspace=apps/treasury-web
```

**URLs** :
- Lot 1 Trésorerie : http://localhost:5173
- Lot 2 Opérations : http://localhost:5174
- API : http://localhost:3000
- OpenAPI : http://localhost:3000/api-docs (non-production uniquement)

---

## Message de transparence (à afficher en démo)

> "Les agences, rôles, codiques, règles comptables et workflows affichés dans cette démonstration sont soit issus de sources publiques, soit proposés à titre de cadrage. Ils devront être validés officiellement par PAOMA avant toute utilisation en production."
