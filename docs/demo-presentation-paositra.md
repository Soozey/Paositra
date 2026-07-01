# Presentation demo PAOSITRA

## Positionnement

La demo montre un socle web PostgreSQL pour les deux lots du DAOO 26/005. Elle ne remplace pas la recette PAOSITRA et ne contient aucune donnee officielle inventee.

## Lancement local

```powershell
npm install
docker compose up -d postgres
npm run db:migrate
$env:DEMO_MODE="true"
$env:MIGRATION_DATABASE_URL="postgresql://paositra_owner:<mot-de-passe>@localhost:55432/paositra"
npm run db:seed
npm run db:seed:paoma
npm run demo:reset-users
```

Dans trois terminaux :

```powershell
npm run dev:api
npm run dev:treasury
npm run dev:operations
```

URLs :

- API : `http://localhost:3000`
- OpenAPI : `http://localhost:3000/api-docs`
- Lot 1 Tresorerie : `http://localhost:5173`
- Lot 2 Operations : `http://localhost:5174`

## Message a annoncer

Les modules visibles sont soit connectes a l'API, soit presentes comme ecrans honnetes `A VALIDER PAOSITRA`. Les boutons d'action sensible doivent etre absents, desactives ou controles par le backend lorsque la regle metier n'est pas validee.
