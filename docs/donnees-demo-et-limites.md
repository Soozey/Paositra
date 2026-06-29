# Donnees demo et limites

Les donnees de demonstration ne sont pas des donnees officielles PAOSITRA. Elles servent uniquement a montrer les parcours, les ecrans et la capacite technique du logiciel.

## Regles appliquees

- Les donnees demo doivent rester separees des migrations de production.
- Les seeds demo exigent `DEMO_MODE=true`.
- Les mots de passe temporaires sont generes localement et ne sont pas committes.
- Les agences, codiques, roles, soldes, operations, caisses, stocks, comptes et rapports non valides restent `DEMO`, `demo_only`, `to_validate` ou `proposition a valider`.
- Toute donnee ressemblant a une donnee officielle sans source PAOSITRA doit etre consideree non contractuelle.

## Donnees identifiees

| Donnee | Source | Statut | Limite |
|---|---|---|---|
| Comptes de demonstration locaux | `npm run demo:reset-users` | `demo_only` | Utilisables uniquement en local avec `DEMO_MODE=true` |
| Roles `DEMO_*` | Script de reset demo | `proposition a valider` | Non contractuels, matrice PAOSITRA attendue |
| Agences/postes demo | `data/reference/paoma/*` et seeds | `demo_only` / `public_source` / `to_validate` | Codiques officiels a fournir |
| Institutions et placements seed demo | `scripts/seed-demo.mjs` | `demo_only` | Montants et banques non officialises |
| Jours feries proposes | `scripts/seed-paoma-complements.mjs` | `proposition a valider` | Calendrier PAOSITRA a confirmer |

## Avant production

Supprimer ou remplacer les donnees demo, importer les referentiels officiels, valider les roles, puis effectuer une sauvegarde et une recette complete sur base PostgreSQL.
