# Rapport d'état — PAOSITRA (DAOO 26/005) — 29 juin 2026 (v2)
**Soozey SARL.** Branche `demo-paoma-agences-roles-operationnel`.
Tout ce qui est marqué ✓ a été vérifié contre un **PostgreSQL réel** (login + appel API + lecture DB + test RBAC 403).

## Commits de la session
- `a7d4201` fix démarrage TypeORM (Agency) + Étape 1 fondation démo + moteur intérêts.
- `1458af8` Étape 2 placements backend (renouveler/rapatrier, exports).
- `4cfba01` Étape 2 frontend placements (simulation, badge échéance, exports).
- `a9a450c` Étape 3 créances (workflow complet + exports + onglet frontend).

## Statut par bouton / action (modules livrés)

### Lot 1 — Authentification & socle
| Action | Front | API | DB | RBAC | Audit | Statut |
|---|---|---|---|---|---|---|
| Connexion (10 comptes démo) | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Bannière démo permanente (tous écrans) | ✓ | — | — | — | — | ✓ |
| Refus d'accès rôle non habilité (403) | ✓ | ✓ | ✓ | ✓ | — | ✓ |

### Lot 1 — Placements (Étape 2)
| Action | Front | API | DB | Export | Statut |
|---|---|---|---|---|---|
| Lister placements | ✓ | ✓ | ✓ | — | ✓ |
| Ouvrir un placement | ✓ | ✓ | ✓ | — | ✓ |
| Simuler les intérêts (base 360/365) avant validation | ✓ | ✓ | — | — | ✓ |
| Badge échéance < 15 j (échéancier) | ✓ | ✓ | ✓ | — | ✓ |
| Renouveler | ✓ | ✓ | ✓ | — | ✓ |
| Rapatrier (capital + intérêts) | ✓ | ✓ | ✓ | — | ✓ |
| Clôturer / Annuler (motif) | ✓ | ✓ | ✓ | — | ✓ |
| Export situation (Excel réel) | ✓ | ✓ | ✓ | xlsx | ✓ |
| Export échéancier (PDF réel) | ✓ | ✓ | ✓ | pdf | ✓ |

### Lot 1 — Institutions
| Action | Statut |
|---|---|
| Ajouter / lister / activer-désactiver institution | ✓ (front↔API↔DB) |

### Lot 1 — Facturation & recouvrement (Étape 3)
| Action | Front | API | DB | Export | Statut |
|---|---|---|---|---|---|
| Créer une créance (référence auto CRE-AAAA-#####) | ✓ | ✓ | ✓ | — | ✓ |
| Relancer (mode + commentaire) | ✓ | ✓ | ✓ | — | ✓ |
| Enregistrer virement de régularisation | ✓ | ✓ | ✓ | — | ✓ |
| Clôturer / passer en contentieux | ✓ | ✓ | ✓ | — | ✓ |
| Historique workflow (events) | ✓ | ✓ | ✓ | — | ✓ |
| Export état des créances (Excel) | ✓ | ✓ | ✓ | xlsx | ✓ |
| Export virements (PDF) | ✓ | ✓ | ✓ | pdf | ✓ |

### Lot 2 — Agences (préexistant, désormais fonctionnel car l'API démarre)
| Action | Statut |
|---|---|
| Lister / créer / valider / fermer / import-export agences | ✓ (front↔API↔DB) |

## Preuves de vérification (extraits réels)
```
LOGIN tresorier 201 ; placements 200 (2) ; agences 403 (RBAC)
simulate 201 interest=8 125 000 ; insights 200 (1 échéance<15j à J-5)
renew 201 ; repatriate 201 total=310 500 000 ; report.xlsx 200 (PK) ; echeancier.pdf 200 (%PDF)
créance: create 201 CRE-2026-00001 → relance → virement → cloture ; events=4 ; xlsx/pdf 200 ; caissier→create 403
```

## Reste à faire (Étapes 4 à 10) — méthode établie
La chaîne est rodée et reproductible : migration additive `00XX` (+ GRANT à paositra_app) →
entité/SQL → service + contrôleur NestJS (RBAC + audit) → exports via `common/exporters.ts`
(exceljs/pdfkit) → vérification par sonde (login réel + 403) → onglet frontend → commit.

- **Étape 4** Comptes courants : journal encaiss./décaiss., rapprochement CCP, chèques.
- **Étape 5** Budget & exécution ELO-P : exercice, lignes de crédit, dossiers d'engagement (workflow).
- **Étape 6** Dashboard Trésorerie (KPI calculés).
- **Étape 7** Caisses (cœur Lot 2) : ouverture → opérations → clôture (billetage) → validation Chef (verrou).
- **Étape 8** Vérification : écarts, accusé de crédit.
- **Étape 9** Dashboards Opérations + inter-agences (G59/G60).
- **Étape 10** Vérification finale + push.

## Dépendances ajoutées
`apps/api/package.json` : `exceljs@4.4.0`, `pdfkit@0.15.0` (exports serveur).
