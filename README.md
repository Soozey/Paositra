# PAOSITRA - Base logicielle DAOO 26/005

Base de travail pour le
`DAOO n°26/005-PAOSITRA/DG/PRMP/AOO` de PAOSITRA MALAGASY :

- Lot 1 : logiciel de gestion de la Trésorerie;
- Lot 2 : logiciel de gestion des opérations.

## Règle de conformité

Le DAO fourni est la seule référence fonctionnelle et contractuelle. Une
fonction, un rôle, une permission, un statut, une donnée ou une règle absente
du DAO ne doit pas être inventé.

Le principe de non-invention s'applique au code, aux migrations, aux écrans,
aux exports, aux tests et à la documentation.

Aucune exigence n'est actuellement marquée `Implémenté`. La matrice active est
[`docs/conformite-dao.md`](docs/conformite-dao.md).

## État du projet

Le dépôt contient un socle technique et quelques flux partiels de placements et
d'agences. Le développement métier est suspendu jusqu'à validation humaine de
la matrice, du RBAC, des statuts, des règles comptables et des workflows.

Les permissions et statuts présents sont techniques et provisoires. Ils ne
constituent pas une matrice contractuelle validée.

## Architecture proposée

Les éléments suivants sont des choix techniques internes, et non des exigences
du DAO :

- monorepo TypeScript avec npm workspaces;
- API NestJS;
- deux frontends React;
- PostgreSQL avec schémas `platform`, `treasury` et `operations`;
- OpenAPI, Docker et migrations SQL versionnées.

## Installation locale

Prérequis :

- Node.js 20.19 ou version compatible;
- npm;
- Docker avec Docker Compose pour PostgreSQL.

Créer un fichier `.env` local à partir de `.env.example`, puis remplacer toutes
les valeurs génériques. Le fichier `.env` ne doit jamais être commité.

```powershell
npm install
npm run build
npm run test
```

Pour démarrer uniquement PostgreSQL local :

```powershell
docker compose up -d postgres
```

L'application des migrations nécessite une variable `DATABASE_URL` explicite :

```powershell
npm run db:migrate
```

Ne pas modifier une migration déjà appliquée. Ne pas exécuter de migration sur
une base contenant des données sans sauvegarde et plan de retour arrière.

## Provisionnement contrôlé

Le script de bootstrap est désactivé par défaut. Son exécution exige
`CONTROLLED_BOOTSTRAP_ENABLED=true`, une identité explicitement fournie et une
liste explicite de permissions techniques préalablement approuvées. Il ne crée
aucun compte automatiquement au démarrage.

## OpenAPI

L'artefact versionné se génère avec :

```powershell
npm run openapi:generate
npm run openapi:check
```

La génération produit un artefact statique versionné et ne nécessite pas de
connexion PostgreSQL.

En mode Docker de production, Swagger UI n'est pas exposé. L'artefact généré
est `docs/openapi/openapi.json`.

## Démo locale isolée

La pile isolée du Jalon 1 se lance sans réutiliser le volume du projet parent :

```powershell
$env:POSTGRES_ADMIN_PASSWORD="replace-with-local-admin-password"
$env:PAOSITRA_OWNER_PASSWORD="replace-with-local-owner-password"
$env:PAOSITRA_APP_PASSWORD="replace-with-local-app-password"
$env:JWT_SECRET="replace-with-at-least-32-random-characters"
$env:VITE_DEMO_MODE="true"
docker compose -p paositra-jalon1 up --build -d
```

URLs locales :

- API : `http://127.0.0.1:3000`
- Lot 1 Trésorerie : `http://127.0.0.1:8080`
- Lot 2 Opérations : `http://127.0.0.1:8081`

Arrêt de la pile isolée :

```powershell
docker compose -p paositra-jalon1 down
```

Suppression volontaire des volumes isolés de cette démo uniquement :

```powershell
docker compose -p paositra-jalon1 down -v
```

Le mode `VITE_DEMO_MODE=true` active une présentation provisoire avec la
bannière `DÉMONSTRATION PROVISOIRE — NON CONTRACTUELLE`. Il est désactivé par
défaut dans `.env.example` et ne crée aucune donnée métier persistante.

## Vérifications

```powershell
npm run typecheck
npm run build
npm run test
npm audit
```

Des tests frontend minimaux réels sont présents pour les deux lots. Ils ne
créent aucune donnée métier.

## Gouvernance

- Audit initial : [`docs/audit-existant.md`](docs/audit-existant.md)
- Matrice DAO : [`docs/conformite-dao.md`](docs/conformite-dao.md)
- Décisions : [`docs/decisions-techniques.md`](docs/decisions-techniques.md)
- Clarifications : [`docs/a-clarifier.md`](docs/a-clarifier.md)
- Git et livraison : [`docs/git-et-livraison.md`](docs/git-et-livraison.md)
- Inventaire des écrans DAO : [`docs/inventaire-ecrans-dao.md`](docs/inventaire-ecrans-dao.md)
