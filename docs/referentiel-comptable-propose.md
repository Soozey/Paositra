# Référentiel comptable proposé

Le DAO constitue la référence contractuelle principale. Le PCOP 2006 est une
hypothèse de cadrage comptable public à confirmer avec PAOMA.

## Référentiel principal proposé

`PCOP 2006 — Plan Comptable des Opérations Publiques, à confirmer comme
référentiel applicable à PAOMA.`

Le PCG 2005 peut être mentionné uniquement comme source d'inspiration du PCOP
2006. Il ne doit pas être utilisé comme référentiel principal du logiciel.

## Principes retenus comme hypothèses

- Comptabilité d'exercice.
- Droits et obligations constatés.
- Séparation ordonnateur, comptable, validateur, vérificateur et auditeur.
- Recettes, dépenses, trésorerie, caisse, comptes financiers et transferts.
- Justificatifs obligatoires selon la procédure PAOMA.
- Écritures postées non supprimables.
- Correction par contrepassation ou régularisation.
- Audit complet des actions sensibles.

## Journaux candidats à valider

Tous les journaux ci-dessous sont des propositions KCI à valider :

| Code candidat | Journal | Lot concerné | Statut |
|---|---|---|---|
| `JCAI` | Journal de caisse | Lot 2 | proposed |
| `JBAN` | Journal de banque | Lot 1 / Lot 2 | proposed |
| `JCCP` | Journal des chèques postaux | Lot 1 | proposed |
| `JPLC` | Journal des placements | Lot 1 | proposed |
| `JMAN` | Journal des mandats | Lot 1 | proposed |
| `JREC` | Journal des recettes | Lot 1 / Lot 2 | proposed |
| `JDEP` | Journal des dépenses | Lot 1 / Lot 2 | proposed |
| `JRAP` | Journal de rapprochement | Lot 1 | proposed |
| `JREG` | Journal de régularisation | Commun | proposed |
| `JTRF` | Journal des transferts inter-agences | Lot 2 | proposed |
| `JVP` | Journal des valeurs postales | Lot 2 | proposed |
| `JAV` | Journal des avances | Lot 2 | proposed |
| `JCRE` | Journal des créances | Lot 1 / Lot 2 | proposed |
| `JANN` | Journal des écritures d'annulation | Commun | proposed |

Aucun journal ne doit être activé en production sans validation officielle.

## Règles proposées par famille

| Famille | Exemples d'opérations | Base | Statut |
|---|---|---|---|
| Placements | ouverture, intérêts courus, rapatriement, renouvellement, clôture, annulation | DAO + PCOP 2006 | Proposition à valider |
| Caisse | encaissement, décaissement, billetage, fermeture, levée | DAO + PCOP 2006 | Proposition à valider |
| Banque / CCP | relevé, rapprochement, anomalies, régularisation | DAO + PCOP 2006 | Proposition à valider |
| Créances | facture, recouvrement, relance, virement de régularisation | DAO + procédure PAOMA | À clarifier |
| Transferts | inter-agences, versement, rapatriement, ME, VP | DAO + PCOP 2006 | Proposition à valider |
| Budget | crédit, engagement, dossier, vérification, version | DAO + PCOP 2006 | Proposition à valider |

## Identifiant unique de transaction

Format technique provisoire :

`[LOT]-[MODULE]-[TYPE]-[YYYYMMDDHHMMSS]-[ENTITE]-[SEQUENCE]`

Exemples purement techniques :

- `L1-PLC-OUV-20260625143000-TRES-000001`
- `L2-CAI-REC-20260625143210-AGENCE-000001`

Mention obligatoire : `Format proposé — à valider par PAOMA.`

Règles techniques proposées :

- unicité globale;
- non-réutilisation après annulation;
- horodatage serveur;
- séquence atomique PostgreSQL;
- audit complet;
- conservation de l'identifiant même si l'opération est annulée.

## Limites

Ce document ne valide aucun compte comptable, aucun journal définitif et aucun
schéma d'écriture. Il sert uniquement de cadrage pour construire une
architecture configurable et auditable.
