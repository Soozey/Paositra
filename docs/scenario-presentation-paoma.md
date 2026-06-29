# Scénario de présentation PAOMA — 10 minutes

> Objectif : montrer une démo riche et honnête. Répéter au besoin : « données provisoires,
> à valider PAOMA ». La bannière rouge le rappelle sur chaque écran.

## Avant de commencer
Lancer API + Lot 1 + Lot 2 (voir `docs/guide-prise-en-main.md`), puis seed démo + seed compléments PAOMA.
Se connecter selon le rôle à montrer avec les mots de passe régénérés localement par `npm run demo:reset-users`.

## Minute 0–1 — Cadrage honnête
« Ceci est une démonstration. Le DAO reste la référence. Tout ce qui n'a pas encore été fourni
par PAOSITRA est marqué DEMO / À VALIDER. » Montrer la **bannière rouge** permanente.

## Minute 1–3 — Réseau de postes (Lot 2)
Connecté `demo.dop`. Onglet **Référentiel agences/postes** : 93 postes couvrant 23 régions.
Filtrer par **région**, **source** (public_source vs demo_only), **statut** (to_validate).
Dire : « Les codes sont provisoires `TMP-…`. Le codique officiel sera importé après validation. »

## Minute 3–5 — Rôles & habilitations
Onglet **Rôles & habilitations** : 19 rôles proposés, tous « proposition à valider ».
Insister : refus par défaut, aucun rôle n'a tous les droits, audit sur chaque attribution.

## Minute 5–7 — Trésorerie qui fonctionne (Lot 1)
Connecté `demo.tresorier`. **Placements** : Simuler les intérêts (base 360 j), ouvrir, renouveler,
rapatrier, exporter Excel/PDF. **Créances** : créer → relancer → virement → clôturer, exporter.
Dire : « Tout est réellement enregistré et exportable. Les règles de calcul sont provisoires. »

## Minute 7–9 — Contrôle d'accès et audit
Connecté `demo.auditeur` : lecture partout, modifications refusées (montrer un refus 403 propre).
Montrer l'onglet **Audit** : chaque action tracée.

## Minute 9–10 — Points en attente
Onglet **Points à clarifier / en attente PAOSITRA** : dérouler les 10 points, montrer la
solution provisoire et la décision attendue. Conclure : « La démo est prête à recevoir les
vraies données PAOSITRA par import, sans redéveloppement. »
