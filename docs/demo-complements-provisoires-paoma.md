# Compléments provisoires PAOMA — logique par défaut (NON CONTRACTUEL)

> ⚠️ Toutes les valeurs ci-dessous sont des **propositions à valider PAOMA**. Le DAOO 26/005
> reste la référence contractuelle. Aucune donnée n'est « validée PAOSITRA ».
> Branche : `demo-paoma-complements-provisoires`.

## Logique par défaut appliquée (ajustable, documentée)
| # | Sujet | Valeur par défaut provisoire | Statut |
|---|---|---|---|
| 1.1 | Intérêts placements | Intérêts simples, base **360 j** (paramétrable 365), taux annuel, arrondi Ariary entier, **sans fiscalité ni pénalité** par défaut | proposition à valider |
| 1.2 | Arrondi MGA | Entier, 0 décimale, arrondi mathématique standard | proposition à valider |
| 1.3 | Référence créance | `CRE-AAAA-#####` (séquence atomique PostgreSQL, unicité globale, non réutilisée, historisée) | proposition à valider |
| 1.4 | Devises | MGA principale ; EUR, USD, CNY, **MUR, ZAR** secondaires (à confirmer) | proposition à valider |
| 1.5 | Statuts créance | brouillon → en_cours → relancee → virement_recu → cloturee ; branches contentieux / annulee ; suppression physique interdite | proposition à valider |
| 1.6 | Circuit mandat | brouillon → engagement → liquidation → ordonnancement → paiement → cloture ; branches rejet / regularisation | proposition à valider |
| 1.7 | Jours fériés | Jours nationaux Madagascar préchargés (table `platform.public_holidays`, status `proposed`) ; jours PAOMA à saisir | proposition à valider |
| 1.8 | SSO / 2FA | Socle OIDC/SAML compatible, 2FA TOTP **désactivé**, profils sensibles « 2FA recommandé » | à cadrer PAOMA |
| 1.9 | Conservation | Audit 10 ans, pièces 10 ans, logs techniques 12 mois, exports 12 mois, sauvegardes quotidiennes 30 j / mensuelles 12 mois | proposition à valider |
| 1.10 | RPO / RTO | RPO 24 h, RTO 8 h, sauvegarde quotidienne, test restauration mensuel, supervision, journalisation des échecs | proposition à valider |

## Implémenté dans la démo
- 1.1, 1.2, 1.3, 1.5 : **réellement câblés** (moteur d'intérêts base 360/365 + arrondi MGA ; créances avec séquence + workflow). Vérifiés contre PostgreSQL.
- 1.4, 1.7 : devises documentées ; jours fériés chargés en base (11 jours nationaux 2026).
- 1.6, 1.8, 1.9, 1.10 : **documentés** (circuit mandat / SSO / rétention / RPO-RTO) — non encore implémentés en module.

## Limites et non-contractualité
- Les codes de postes sont **provisoires** (`TMP-…`), jamais des codiques officiels.
- Les rôles sont des **propositions** (`proposition_a_valider`), aucun n'est contractuel.
- Aucune donnée métier n'est injectée en migration de production : tout passe par **seed démo** (`scripts/seed-paoma-complements.mjs`) ou import CSV `demo_only`.
