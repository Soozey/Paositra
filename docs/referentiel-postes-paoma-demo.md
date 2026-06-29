# Référentiel postes / agences — démonstration (NON CONTRACTUEL)

Fichier source : `data/reference/paoma/paoma_postes_demo.csv` (93 lignes).
Chargé en base par `scripts/seed-paoma-complements.mjs` dans `operations.agencies` (codes `TMP-…`).

## Répartition
| source_type | Nombre | Signification |
|---|---|---|
| public_source | 23 | Agences PAOSITRA Finances **publiées publiquement**, codification provisoire KCI |
| demo_only | 70 | Référentiel géographique de **démonstration** (chefs-lieux + districts), à remplacer par la liste officielle |
| **Total** | **93** | Couvre **23 régions** de Madagascar |
Toutes les lignes : `validation_status = to_validate`.

## Codes provisoires
Format logique : `TMP-PAO-[REGION3]-[VILLE3]-[NNN]` (ou `TMP-PF-…` pour les agences Finances publiques).
- Exemples : `TMP-PAO-ANA-TNR-001`, `TMP-PF-BOE-MJN-001`.
- **Ce ne sont PAS des codiques officiels.** Le codique officiel PAOSITRA devra être fourni puis importé.
- Champ `temporary_code` rempli ; champ `codique` laissé **vide** tant que PAOMA ne l'a pas fourni.

## public_source vs demo_only
- `public_source` : nom d'agence réellement publié par PAOSITRA Finances ; seul le **code** est provisoire.
- `demo_only` : poste ajouté pour la couverture géographique de la démo ; **nom et code** à valider.

## À fournir par PAOSITRA
Liste officielle des postes/agences **avec codiques**, type exact de chaque poste, rattachements hiérarchiques. Le référentiel démo est conçu pour être **remplacé par import CSV** une fois la liste officielle disponible.
