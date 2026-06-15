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

## Vérifications

```powershell
npm run typecheck
npm run build
npm run test
npm audit
```

Aucun test frontend réel n'est présent. Les scripts frontend utilisent encore
`--passWithNoTests`; leur succès ne constitue donc pas une preuve de test
frontend.

## Gouvernance

- Audit initial : [`docs/audit-existant.md`](docs/audit-existant.md)
- Matrice DAO : [`docs/conformite-dao.md`](docs/conformite-dao.md)
- Décisions : [`docs/decisions-techniques.md`](docs/decisions-techniques.md)
- Clarifications : [`docs/a-clarifier.md`](docs/a-clarifier.md)
- Git et livraison : [`docs/git-et-livraison.md`](docs/git-et-livraison.md)
