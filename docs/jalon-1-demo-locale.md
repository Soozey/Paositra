# Jalon 1 - Démo locale contrôlée

Date : 2026-06-16.

Cette démo montre l'état réel du socle Jalon 1. Elle ne crée aucune donnée
métier : pas d'agence, pas de caisse, pas de placement, pas d'opération, pas de
statistique.

## URLs

- API : `http://127.0.0.1:3000`
- Healthcheck : `http://127.0.0.1:3000/health`
- Frontend Lot 1 Trésorerie : `http://127.0.0.1:8080`
- Frontend Lot 2 Opérations : `http://127.0.0.1:8081`
- Artefact OpenAPI : `docs/openapi/openapi.json`

Swagger UI n'est pas exposé dans la pile Docker de production.

## Lancer la pile isolée

```powershell
$env:POSTGRES_ADMIN_PASSWORD="replace-with-local-admin-password"
$env:PAOSITRA_OWNER_PASSWORD="replace-with-local-owner-password"
$env:PAOSITRA_APP_PASSWORD="replace-with-local-app-password"
$env:JWT_SECRET="replace-with-at-least-32-random-characters"
$env:VITE_DEMO_MODE="true"
docker compose -p paositra-jalon1 up --build -d
```

## Arrêter la pile isolée

Arrêt sans suppression des volumes de démo :

```powershell
docker compose -p paositra-jalon1 down
```

Suppression des volumes isolés de cette démo uniquement :

```powershell
docker compose -p paositra-jalon1 down -v
```

Ne pas utiliser `down -v` sur un projet Docker contenant des données réelles.

## Accès local contrôlé

Le compte de démonstration ne doit jamais être créé automatiquement. Pour une
démo locale, provisionner explicitement un compte technique avec uniquement les
permissions provisoires nécessaires à la consultation.

Exemple avec valeurs à remplacer :

```powershell
$env:POSTGRES_ADMIN_PASSWORD="replace-with-local-admin-password"
$env:PAOSITRA_OWNER_PASSWORD="replace-with-local-owner-password"
$env:PAOSITRA_APP_PASSWORD="replace-with-local-app-password"
$env:JWT_SECRET="replace-with-at-least-32-random-characters"

docker compose -p paositra-jalon1 run --rm `
  -e CONTROLLED_BOOTSTRAP_ENABLED=true `
  -e BOOTSTRAP_ADMIN_EMAIL="viewer.local@paositra.invalid" `
  -e BOOTSTRAP_ADMIN_PASSWORD="replace-with-temporary-local-password" `
  -e BOOTSTRAP_ADMIN_DISPLAY_NAME="Accès technique local" `
  -e BOOTSTRAP_PERMISSION_CODES="treasury:institutions:read,treasury:placements:read,operations:agencies:read" `
  api node apps/api/dist/scripts/bootstrap-admin.js
```

Le mot de passe temporaire doit être changé via l'API ou l'écran de changement
de mot de passe avant consultation. Ce compte est technique, local et non
contractuel.

## État visible attendu

- Lot 1 : connexion, shell Trésorerie, onglets `Placements` et `Institutions`,
  états vides réels.
- Lot 2 : connexion, shell Opérations, écran `Agences enregistrées`, état vide
  réel.
- Aucun tableau de bord chiffré n'est affiché.
- Aucun chiffre fictif n'est affiché.

## Démo provisoire présentable

Le mode `VITE_DEMO_MODE=true` affiche une navigation complète de présentation
avec la bannière `DÉMONSTRATION PROVISOIRE — NON CONTRACTUELLE`.

Les écrans supplémentaires ne créent aucune donnée métier et affichent seulement
des états vides, blocages et actions désactivées.
