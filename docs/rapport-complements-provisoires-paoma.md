# Rapport final — Compléments provisoires PAOMA
**Soozey SARL — DAOO 26/005 — NON CONTRACTUEL**

## 1. Branche
`demo-paoma-complements-provisoires` (créée depuis `demo-paoma-agences-roles-operationnel`).

## 2. Commit
`f4e868e` — « compléments provisoires : 93 postes, 19 rôles + 58 permissions + mapping, jours fériés, historical_province, fix grants RBAC (0010/0011), 5 docs ».

## 3. Résumé des changements
- Migration **0010** (schéma) : colonne `operations.agencies.historical_province` ; élargissement du périmètre RBAC pour `region` ; table `platform.public_holidays`.
- Migration **0011** : `GRANT SELECT` sur les tables catalogue RBAC au rôle applicatif (corrige un défaut latent : `/platform/roles` renvoyait « permission denied »).
- Entité `Agency` : exposition de `historicalProvince`.
- Données démo (CSV + JSON) : `data/reference/paoma/paoma_postes_demo.csv`, `roles_demo.csv`, `role_permissions_demo.csv`, `_seed_input.json`.
- Seed démo `scripts/seed-paoma-complements.mjs` (idempotent, rôle propriétaire).
- 5 documents (voir §9).
- **Aucune donnée métier en migration** : tout passe par seed démo.

## 4. Postes / agences chargés
**93** postes (codes provisoires `TMP-…`), couvrant **23 régions**.

## 5. Répartition
- `public_source` : **23** (agences PAOSITRA Finances publiques, code provisoire)
- `demo_only` : **70** (référentiel géographique de démonstration)
- `validation_status = to_validate` : **93 / 93**
- `paoma_validated` : **0** (testé)

## 6. Les 19 rôles (tous `proposition_a_valider`)
ADM_SYS, ADM_FONC, AUDIT, CONSULT, SUPPORT (commun) ; AGT_TRES, RESP_TRES, COMPT_TRES, RESP_BUD, VERIF_TRES, DAF_DEC (Lot 1) ; AGT_GUICHET, CAISSIER, CHEF_AGENCE, RESP_REG, VERIF_OPS, COMPT_SIEGE, SUP_OPS, RESP_VP (Lot 2).

## 7. Permissions créées
**58** permissions (catalogue dot-notation) : 9 commun + 21 Lot 1 + 28 Lot 2.
Mapping rôle→permission : **107 liaisons** ; aucun rôle n'agrège toutes les permissions (max 12/106 — refus par défaut).

## 8. Écrans concernés
- **Référentiel agences/postes** (operations-web) : affiche les 93 postes via l'API (filtres source/région/type/statut, badges, compteurs) — vérifié front↔API↔DB.
- **Rôles & habilitations** : affiche les 19 rôles proposés (endpoint réparé).
- Backend : `operations.agencies` expose `historicalProvince` (filtre province possible).
- *Non modifié ce tour* : ajout d'un message « codes provisoires » par écran (la bannière démo permanente couvre la transparence globale).

## 9. Pages / documents créés
`docs/demo-complements-provisoires-paoma.md`, `docs/referentiel-postes-paoma-demo.md`,
`docs/roles-paoma-provisoires.md`, `docs/points-en-attente-paositra.md`,
`docs/scenario-presentation-paoma.md`, et ce rapport.

## 10. Points encore en attente de PAOSITRA
Voir `docs/points-en-attente-paositra.md` (10 points : codiques officiels, plan de comptes,
formats officiels, matrice de droits, seuils, circuit mandat, SSO/2FA, conservation, RPO/RTO,
jours fériés additionnels). Tous avec solution provisoire en place + décision attendue.

## 11. Commandes de lancement (Windows / PowerShell)
```powershell
npm install
docker compose up -d
npm run db:migrate
$env:MIGRATION_DATABASE_URL="postgresql://paositra_owner:<pwd>@localhost:55432/paositra"
node scripts/seed-demo.mjs                 # 10 comptes + données Lot 1
node scripts/seed-paoma-complements.mjs    # 93 postes + 19 rôles + permissions + jours fériés
npm run dev:api ; npm run dev:treasury ; npm run dev:operations
```

## 12. URLs locales
API http://localhost:3000 — Lot 1 http://localhost:5173 — Lot 2 http://localhost:5174 — OpenAPI /api-docs.

## 13. Tests exécutés (cette mission)
- Migrations 0010/0011 appliquées sur PostgreSQL réel ✓
- Seed compléments idempotent (rejoué 2×) ✓
- SQL : 23 public_source + 70 demo_only = 93 ; tous to_validate ; 0 paoma_validated ✓
- SQL : 19/19 rôles `proposition_a_valider` ; 0 `validated` ; max 12 permissions/rôle ✓
- API (login réel) : `/operations/agencies` renvoie 93 postes + `historicalProvince` ✓
- API : `/platform/roles` renvoie les 19 rôles KCI ✓
- Typecheck + build API ✓
- Migrations sans donnée métier ; aucun code TMP en migration ✓
- Recherche de secrets : rien ✓
- *Non exécutés* : build/tests frontend Lot 2 (inchangé), `npm audit` (réseau restreint en sandbox).

## 14. Confirmations de conformité
- ✅ Aucune donnée officielle inventée.
- ✅ Aucun codique officiel inventé (codes `TMP-…` provisoires uniquement, champ `codique` laissé vide).
- ✅ Aucune agence `demo_only` présentée comme validée (toutes `to_validate`).
- ✅ Aucun rôle présenté comme contractuel (tous `proposition_a_valider`).
- ✅ Aucune exigence DAO marquée « Implémenté ».
- ✅ Toutes les hypothèses marquées À VALIDER PAOMA.

---
## Périmètre NON traité ce tour (transparence)
Les modules **Étapes 4–10** restent à construire : comptes courants, budget ELO-P, dashboards,
**caisses** (cœur Lot 2), vérification. Les Étapes 2 (placements) et 3 (créances) ont été livrées
et vérifiées lors des tours précédents. La méthode (migration additive + service/contrôleur NestJS
RBAC+audit + exports + sonde de vérification + frontend) est rodée pour les enchaîner.
