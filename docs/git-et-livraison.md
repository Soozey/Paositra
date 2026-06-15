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
