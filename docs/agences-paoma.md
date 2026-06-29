# Référentiel agences PAOMA — Documentation technique

> **Le DAO reste la référence contractuelle.**
> Toute donnée non fournie officiellement par PAOMA doit être marquée avec le `source_type` approprié.

## Statut global

| Élément | Statut |
|---|---|
| Structure de la table | `existant` (migration 0007) |
| Données officielles PAOMA | `absent` — aucune donnée validée fournie |
| Données de démonstration | `existant` — 14 lignes `demo_only` dans `agencies.demo.csv` |
| Workflow de validation | `proposition à valider` |

---

## Système de traçabilité source (`source_type`)

Chaque agence porte un champ `source_type` qui indique l'origine de la donnée :

| Valeur | Signification | Utilisation |
|---|---|---|
| `paoma_validated` | Donnée fournie et validée officiellement par PAOMA | Uniquement après validation contractuelle |
| `public_source` | Donnée issue d'une source publique (ex. : découpage administratif de Madagascar) | Avec indication de la source (`source_name`, `source_url`) |
| `demo_only` | Donnée créée uniquement pour la démonstration | Jamais en production |
| `to_validate` | Donnée à confirmer par PAOMA | Par défaut à la création |

**Règle absolue** : n'utiliser `paoma_validated` que si PAOMA a explicitement validé la donnée.

---

## Champs de la table `operations.agencies` (après migration 0007)

### Identification

| Champ | Type | Description |
|---|---|---|
| `id` | uuid | Identifiant interne |
| `code` | varchar(80) | Code technique (existant) |
| `public_code` | varchar(20) | Code postal public (à valider PAOMA) |
| `codique` | varchar(50) | Code interne PAOMA (à valider PAOMA) |
| `temporary_code` | varchar(50) | Code provisoire pendant transition |
| `name` | varchar(240) | Nom de l'agence |
| `type` | varchar(50) | Type d'agence (voir ci-dessous) |

### Types d'agences (proposition à valider)

- `direction` — Direction générale ou régionale
- `agence_principale` — Agence principale de province/région
- `agence_secondaire` — Agence rattachée à une principale
- `bureau` — Bureau de poste
- `point_service` — Point de service (ex. : marché)
- `guichet_financier` — Guichet financier postal

### Géographie

| Champ | Description |
|---|---|
| `region` | Province/région de Madagascar |
| `district` | District |
| `commune` | Commune |
| `city` | Ville |
| `address` | Adresse |
| `latitude` / `longitude` | Coordonnées GPS (sources publiques) |

### Traçabilité source

| Champ | Description |
|---|---|
| `source_type` | Origine de la donnée (voir tableau ci-dessus) |
| `source_name` | Nom de la source |
| `source_url` | URL de la source (si publique) |
| `source_note` | Note explicative |
| `validation_status` | `to_validate` / `validated` / `rejected` |
| `validated_by` | UUID de l'utilisateur qui a validé |
| `validated_at` | Date de validation |

---

## API endpoints

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/operations/agencies` | `operations:agencies:read` | Liste avec filtres |
| POST | `/api/v1/operations/agencies` | `operations:agencies:write` | Créer une agence |
| PATCH | `/api/v1/operations/agencies/:id/validate` | `operations:agencies:validate` | Valider une agence |
| GET | `/api/v1/operations/agencies/export` | `operations:agencies:export` | Export CSV |
| POST | `/api/v1/operations/agencies/import` | `operations:agencies:import` | Import CSV (multipart) |
| POST | `/api/v1/operations/agencies/:id/close` | `operations:agencies:close` | Fermer une agence |

### Filtres disponibles sur GET /agencies

- `status` : `open` / `closed`
- `sourceType` : `paoma_validated` / `public_source` / `demo_only` / `to_validate`
- `validationStatus` : `to_validate` / `validated` / `rejected`
- `region` : texte partiel
- `type` : type exact
- `search` : recherche sur nom, code, codique

---

## Données de référence

### `data/reference/paoma/agencies.template.csv`

Template vide avec en-têtes. À remplir par PAOMA avec les données officielles.

### `data/reference/paoma/agencies.demo.csv`

14 agences couvrant les 6 provinces de Madagascar.
- `source_type=demo_only` sur toutes les lignes
- `validation_status=to_validate` sur toutes les lignes
- **À n'utiliser que pour la démonstration — jamais en production**

---

## Points à clarifier PAOMA

1. Format officiel du `codique` et du `public_code`
2. Hiérarchie exacte des types d'agences
3. Liste officielle des 300 agences avec leurs données
4. Workflow de validation (qui valide, quand, quels documents)
5. Règles de fermeture et transfert des valeurs
