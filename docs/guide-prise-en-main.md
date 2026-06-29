# Guide de prise en main — PAOSITRA (démonstration Soozey SARL)

> Logiciel de démonstration conforme au DAOO 26/005. Bannière rouge permanente :
> « ENVIRONNEMENT DE DÉMONSTRATION — Données non contractuelles — KCI / Soozey SARL ».
> Vous pouvez saisir, valider, annuler, exporter : tout est réellement enregistré en base.

## 1. Les 10 comptes de démonstration
Mot de passe identique pour tous : **Demo@1234**

| E-mail | Rôle | Ce qu'il peut faire |
|---|---|---|
| demo.admin@paositra-demo.mg | Admin système | Tout : configuration, utilisateurs, audit, tous modules |
| demo.daf@paositra-demo.mg | Directeur financier | Consulter trésorerie, valider placements, états, créances (lecture/export) |
| demo.tresorier@paositra-demo.mg | Trésorier chef | Placements (ouvrir/simuler/renouveler/rapatrier/clôturer), créances, exports |
| demo.comptable@paositra-demo.mg | Comptable | Comptes, flux, créances (saisie), rapports trésorerie |
| demo.auditeur@paositra-demo.mg | Auditeur interne | Lecture seule partout + audit + exports (aucune modification) |
| demo.dop@paositra-demo.mg | Directeur opérations | Vue consolidée agences, tableaux de bord opérations |
| demo.chef.tana@paositra-demo.mg | Chef d'agence (Tana-Centre) | Agences, caisses, validation journée (Lot 2) |
| demo.caissier1@paositra-demo.mg | Caissier (Tana-Centre) | Opérations de guichet (Lot 2) |
| demo.verificateur@paositra-demo.mg | Vérificateur | Vérification soldes/écarts (lecture, sans saisie) |
| demo.comptasieg@paositra-demo.mg | Comptable siège | Reporting et comptabilité agences |

> Le mot de passe `Demo@1234` est volontairement simple pour la démo. La politique
> réelle (≥ 12 caractères) s'applique à la création/au changement de mot de passe.

## 2. Démarrer le logiciel sur Windows (étape par étape)
Ouvrez **PowerShell** dans le dossier du projet, puis copiez-collez chaque bloc.

**a) Installer les dépendances (une seule fois)**
```powershell
npm install
```

**b) Préparer la configuration (une seule fois)**
```powershell
Copy-Item .env.example .env
# Ouvrez .env et renseignez : POSTGRES_*_PASSWORD, JWT_SECRET (au moins 32 caractères).
```

**c) Lancer la base de données PostgreSQL (Docker Desktop doit être ouvert)**
```powershell
docker compose up -d
```

**d) Créer les tables (migrations)**
```powershell
npm run db:migrate
```

**e) Charger les données de démonstration (10 comptes + données [DEMO])**
```powershell
$env:MIGRATION_DATABASE_URL = (Select-String -Path .env -Pattern '^MIGRATION_DATABASE_URL=').Line -replace '^MIGRATION_DATABASE_URL=',''
node scripts/seed-demo.mjs
```

**f) Démarrer les trois services (un onglet PowerShell par commande)**
```powershell
npm run dev:api          # API — http://localhost:3000
npm run dev:treasury     # Lot 1 Trésorerie — http://localhost:5173
npm run dev:operations   # Lot 2 Opérations — http://localhost:5174
```
Ouvrez ensuite **http://localhost:5173** (Trésorerie) ou **http://localhost:5174** (Opérations).

## 3. Parcours de test conseillé (ce qui fonctionne aujourd'hui)

**Trésorerie — Placements** (connectez-vous : demo.tresorier)
1. Onglet **Placements** → vous voyez 2 placements [DEMO]. Celui qui arrive à échéance
   sous 15 jours affiche un badge rouge « ⚠ ».
2. Dans « Ouvrir un placement », saisissez un montant, un taux, une durée, une date,
   puis cliquez **Simuler les intérêts** : le calcul s'affiche (base 360 j par défaut).
3. Cliquez **Enregistrer le placement** : il apparaît dans la liste.
4. Sur une ligne ouverte : **Renouveler** (crée un nouveau placement), **Rapatrier**
   (capital + intérêts), **Clôturer** ou **Annuler** (motif demandé).
5. **Export Excel** et **Échéancier PDF** : les fichiers se téléchargent réellement.

**Trésorerie — Créances** (demo.tresorier ou demo.comptable)
1. Onglet **Créances** → « Nouvelle créance » : débiteur, montant, échéance → Enregistrer
   (une référence CRE-2026-##### est attribuée automatiquement).
2. Sur la ligne : **Relancer** → **Virement** → **Clôturer** (ou contentieux). Le statut
   évolue à chaque étape ; une créance échue affiche « ⚠ en retard ».
3. **État Excel** et **Virements PDF** se téléchargent.

**Contrôle des droits** (connectez-vous : demo.auditeur)
- Vous consultez tout mais les boutons de modification sont absents ; toute tentative
  d'écriture est refusée (message clair, pas d'erreur technique).

**Lot 2 — Opérations** (demo.dop / demo.chef.tana)
- Onglet **Référentiel agences** : 5 agences [DEMO] (Tana-Centre, Tana-Isotry, Antsirabe,
  Fianarantsoa, Toamasina) — créer/valider/fermer/exporter fonctionne.
- Les modules Caisses / Vérification / Tableaux de bord opérations sont **en cours** (voir
  rapport d'état) et seront livrés selon la même méthode.

## 4. Ce que vous pouvez saisir librement vs ce qui sera remplacé
- **Saisissable librement maintenant** : institutions, placements, créances, agences,
  utilisateurs — pour tester les parcours. Ces données portent la marque [DEMO].
- **À remplacer par PAOSITRA après l'atelier** : liste réelle des agences et codiques,
  plan de comptes définitif, formats officiels (relevés CCP, modèles d'accusés),
  matrice de droits contractuelle. Les écrans existent déjà ; il suffira d'y charger
  les vraies valeurs.
