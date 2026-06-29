# Checklist de non-regression

Cette checklist doit etre completee a chaque intervention. Ne pas inventer de resultat.

| Test | Commande / parcours | Resultat | Remarque |
|---|---|---|---|
| Installation dependances | `npm install` | passe | 2 vulnerabilites moderees signalees par audit |
| TypeScript | `npm run typecheck` | passe | API + frontends |
| Build | `npm run build` | passe | API + frontends |
| Tests | `npm test` | passe | API 15/15, Operations 2/2, Tresorerie 3/3 |
| Lint | `npm run lint` | non disponible | Aucun script lint racine identifie |
| Audit npm | `npm audit --audit-level=moderate` | echoue | 2 vulnerabilites moderees via `exceljs` -> `uuid`; fix force propose un changement breaking |
| OpenAPI | `npm run openapi:check` | passe | Artefact valide, routes sensibles avec bearer |
| Reset comptes demo | `DEMO_MODE=true npm run demo:reset-users` | passe | Execute sur la base active `paositra-jalon1` |
| Login demo | `POST /api/v1/auth/login` sur les 5 comptes | passe | API active `http://localhost:3000` |
| Lot 1 navigation | `GET http://localhost:8080` | passe | Front retourne HTTP 200 |
| Lot 2 navigation | `GET http://localhost:8081` | passe | Front retourne HTTP 200 |
| RBAC lecture seule | Comptes `DEMO_CONSULTATION` et `DEMO_AUDITEUR` | partiel | Login OK; verification navigateur des boutons a faire |
| Audit | Page Audit | partiel | Audit reset insere; verification navigateur a faire |
| Git secrets | Scan mots de passe temporaires et anciens statuts | passe | Aucun ancien mot de passe fixe; aucun mot de passe regenere commite |
