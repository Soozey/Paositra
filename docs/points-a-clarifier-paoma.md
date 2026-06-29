# Points à clarifier avec PAOMA

> **Le DAO reste la référence contractuelle.**
> Ces points ne peuvent pas être traités sans décision formelle de PAOMA.

---

## Lot 2 — Opérations (13 sections)

### 1. Codification des agences — `à clarifier`

Le format du codique PAOMA (`public_code`, `codique`, `temporary_code`) n'est pas défini dans le DAO.
La structure proposée (code public à 3 chiffres, codique interne) est une hypothèse à confirmer.

**Attendu PAOMA** : Format officiel, règles de séquencement, gestion des codes temporaires.

### 2. Types d'agences et hiérarchie — `proposition à valider`

Types proposés : direction, agence_principale, agence_secondaire, bureau, point_service, guichet_financier.
Hiérarchie (direction > agence_principale > bureau) à valider avec PAOMA.

**Attendu PAOMA** : Nomenclature officielle, règles de rattachement, nombre de niveaux.

### 3. Découpage géographique officiel — `à clarifier`

Le DAO cite 300 agences et un découpage régional. La correspondance région/district/commune
utilisée dans cette démo est issue des données publiques de Madagascar — à confirmer par PAOMA.

**Attendu PAOMA** : Liste des 300 agences avec codes, noms officiels et localisation.

### 4. Workflows de validation agences — `à clarifier`

Le workflow (proposition > validation référentiel > ouverture > fermeture) est une proposition.
Les acteurs, délais et documents requis doivent être fournis par PAOMA.

**Attendu PAOMA** : Diagramme du workflow, rôles impliqués, documents obligatoires.

### 5. Modèle RBAC (rôles, périmètres, délégations) — `proposition à valider`

19 rôles candidats proposés. Les périmètres, délégations, incompatibilités et suppléances
doivent être définis par PAOMA.

**Attendu PAOMA** : Matrice rôles/permissions contractuelle, règles de délégation.

### 6. Règles comptables PCOP 2006 — `à clarifier`

Le référentiel PCOP 2006 est utilisé comme cadrage provisoire. PAOMA doit confirmer si PCOP 2006,
PCG ou un référentiel hybride s'applique, et fournir les schémas débit/crédit par opération.

**Attendu PAOMA** : Référentiel applicable, plan de comptes, journaux, schémas par opération.

### 7. Transactions financières postales — `à clarifier`

Montants maximum autorisés (numéraire, VP, ME), devises acceptées, limites par guichet
et règles de billetage doivent être fournis par PAOMA.

**Attendu PAOMA** : Tableau des seuils par type d'agence, règles de délégation de montants.

### 8. Interopérabilité Lot 1 / Lot 2 — `à clarifier`

Les flux entre trésorerie (Lot 1) et agences (Lot 2) — virements, AC, rapatriements —
nécessitent une définition contractuelle des interfaces.

**Attendu PAOMA** : Contrats d'interface, fréquences, formats, règles de rapprochement.

### 9. Gestion des incidents et audit — `partiel`

La piste d'audit est implémentée (trigger-protected, immuable). Les règles de conservation,
accès et export des journaux d'audit doivent être validées par PAOMA.

**Attendu PAOMA** : Durée de conservation, habilitations d'accès, formats d'export réglementaires.

### 10. Processus de clôture d'agence — `partiel`

La fermeture technique est implémentée. Le processus métier (transfert de valeurs, rapatriement,
soldes, G59/G60, archivage) doit être fourni par PAOMA.

**Attendu PAOMA** : Procédure officielle de clôture, liste des documents obligatoires.

### 11. Reporting réglementaire — `absent`

Les modèles de rapports officiels (formats, fréquences, destinataires) ne sont pas dans le DAO.
PAOMA doit fournir les gabarits G59, G60 et les règles d'envoi.

**Attendu PAOMA** : Gabarits officiels, calendrier de reporting, destinataires.

### 12. Intégration systèmes externes — `absent`

Les intégrations BCM, banques, CCP, plateforme de paiement mobile ne sont pas couvertes.
Les contrats d'interface (formats, protocoles, fréquences) sont à définir.

**Attendu PAOMA** : Liste des systèmes à connecter, contrats d'interface, jeux de tests.

### 13. Protection des données personnelles — `à clarifier`

La législation applicable à Madagascar (loi n°2014-038) et les règles de conservation, accès
et suppression doivent être intégrées.

**Attendu PAOMA** : Analyse d'impact, registre de traitement, durées de conservation.

---

## Lot 1 — Trésorerie (10 sections complémentaires)

1. **Matrice des rôles Lot 1** — Périmètres et délégations des 4 rôles Lot 1
2. **Calculs financiers placements** — Formules d'intérêts, arrondi, fiscalité, pénalités
3. **Référentiel institutions financières** — Liste officielle des banques autorisées
4. **Workflows de placement** — Renouvellement, rapatriement principal/intérêts, prolongation
5. **Référentiel comptable trésorerie** — Comptes, journaux, schémas pour placements et virements
6. **Facturation et recouvrement** — CPS, modèles de factures, workflow de réclamation
7. **Comptes en devises** — Comptes réels, taux de change, formats bancaires
8. **Rapprochement bancaire** — Formats SWIFT/MT940, tolérances, traitement des anomalies
9. **Reporting réglementaire Lot 1** — Modèles, périodicité, destinataires institutionnels
10. **Interopérabilité Lot 1 / Lot 2** — Flux AC, rapatriements, virements

---

## Comment utiliser ce document

Ce document est mis à jour à chaque itération. Chaque section doit recevoir une réponse officielle
de PAOMA, documentée avec :
- La décision prise
- Le responsable PAOMA
- La date
- Les impacts sur le système (front/back/API/base)
