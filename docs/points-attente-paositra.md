# Points en attente de PAOSITRA

## 1. Logique par défaut appliquée (ajustable, documentée — aucun écran mort)
| Sujet | Valeur par défaut retenue | Base / justification |
|---|---|---|
| Calcul d'intérêts placements | Intérêts simples, **base 360 j** (paramétrable 365) | Pratique des banques commerciales malgaches |
| Arrondi des montants MGA | Ariary **entier** (0 décimale) | Pas de centimes en circulation à Madagascar |
| Référence créance | `CRE-AAAA-#####` (séquence atomique) | Format technique ; format officiel à confirmer |
| Devises | MGA principale ; EUR/USD/CNY secondaires | Devises courantes Paositra |
| Statuts créance | en cours → relancée → virement reçu → clôturée / contentieux | Workflow de recouvrement usuel |

## 2. À fournir par PAOSITRA (données officielles)
- Liste réelle des agences et **codiques** (format à 4 chiffres à confirmer).
- **Plan de comptes** définitif (cadrage PCOP 2006 en place, à valider).
- Formats officiels : **relevés CCP**, modèles d'accusés de crédit, bordereaux G59/G60.
- **Matrice de droits** contractuelle (les 19 rôles proposés restent « à valider »).
- Seuils réglementaires à confirmer (plafond mandat national, seuil déclaration SAMIFIN).

## 3. À décider en atelier de cadrage
- Circuit exact des mandats (Engagement → Liquidation → Ordonnancement → Paiement).
- SSO / 2FA (le socle d'authentification est compatible, l'activation reste à cadrer).
- Politique de conservation / archivage (durées), RPO/RTO, hébergement cloud.
- Calendrier des jours fériés additionnels (les jours fériés nationaux seront pré-chargés).

## 4. Note de transparence pour la démonstration
Toutes les données affichées sont marquées [DEMO] / non contractuelles. Elles servent à
éprouver les parcours (saisie, validation, annulation, export) et seront remplacées par les
données officielles de PAOSITRA après validation en atelier.
