# Git et livraison

## Dépôt

- Dossier local autorisé : `C:\Users\Laptop\Documents\PAOSITRA`
- Dépôt GitHub : `https://github.com/Soozey/Paositra`
- Dépôt parent `C:\Users\Laptop` : exclu de cette livraison
- Branche utilisée : `main`, le dépôt distant étant vide au contrôle initial
- Force push : interdit

## Fichiers exclus

Le `.gitignore` exclut notamment :

- fichiers `.env` sauf `.env.example`;
- dépendances `node_modules`;
- builds, caches, couvertures et fichiers `*.tsbuildinfo`;
- logs et fichiers temporaires;
- uploads, sauvegardes et dumps PostgreSQL;
- clés et certificats privés usuels;
- résultats de tests générés.

## Commandes de contrôle

```text
git rev-parse --show-toplevel
git status --short --branch
npm install
npm run typecheck
npm run build
npm run test
npm audit
git push -u origin main
```

## Statut

- Initialisation du dépôt local : réalisée dans le dossier autorisé
- Commit de base : `d852ca3` (`chore: initialize Paositra DAO-compliant project baseline`)
- Push initial : réussi sur `origin/main`
- GitHub CLI : indisponible; publication effectuée avec Git HTTPS et le gestionnaire d'identifiants configuré
- Développement métier après push : interdit avant validation humaine

## Résultats avant commit

- Dépôt distant contrôlé vide avec `git ls-remote`.
- Installation npm : réussie.
- Typecheck : réussi.
- Build API : réussi.
- Build frontend Lot 1 : réussi.
- Build frontend Lot 2 : réussi.
- Tests API : 3 suites et 5 tests réussis.
- Tests frontend : aucun fichier de test trouvé.
- Audit npm : aucune vulnérabilité connue.
- Migrations : validées sur PostgreSQL éphémère sans volume.
- Audit append-only : modification refusée.
- Sauvegarde/restauration : syntaxe des scripts validée; restauration non exécutée.
- Validation visuelle : non exécutée, navigateur intégré indisponible.

## Branche de démonstration provisoire

- Branche de travail : `demo-presentation-dao`.
- Branche source : `jalon-1-socle-securise`.
- Objectif : présenter le socle, la séparation Lot 1 / Lot 2, les écrans DAO
  visibles, les états vides, l'audit, l'OpenAPI et les limites à clarifier.
- Mode démo : activé uniquement par `VITE_DEMO_MODE=true`.
- Mode démo par défaut : désactivé dans `.env.example` et `docker-compose.yml`.
- Données métier : aucune donnée métier persistante ajoutée; aucun seed métier
  ajouté aux migrations.
- Compte local : provisionnement manuel contrôlé uniquement pour la base Docker
  éphémère de démonstration; aucun mot de passe réel n'est commité.
- Captures : non produites automatiquement si le connecteur navigateur n'est pas
  disponible.
- Validation du 2026-06-16 : typecheck, build, tests unitaires, tests frontend,
  tests PostgreSQL intégrés, génération OpenAPI, contrôle OpenAPI et `npm audit`
  réussis.
- Sécurité dépendances : `npm audit --audit-level=moderate` indique zéro
  vulnérabilité connue après retrait de Swagger runtime et migration des tests
  API vers Vitest.

Commandes de lancement de la démo :

```powershell
$env:POSTGRES_ADMIN_PASSWORD="replace-with-local-admin-password"
$env:PAOSITRA_OWNER_PASSWORD="replace-with-local-owner-password"
$env:PAOSITRA_APP_PASSWORD="replace-with-local-app-password"
$env:JWT_SECRET="replace-with-at-least-32-random-characters"
$env:VITE_DEMO_MODE="true"
docker compose -p paositra-jalon1 up --build -d
```

Commandes d'arrêt :

```powershell
docker compose -p paositra-jalon1 down
```

Suppression volontaire de la base éphémère de démonstration uniquement :

```powershell
docker compose -p paositra-jalon1 down -v
```
