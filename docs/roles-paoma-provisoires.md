# Rôles provisoires PAOMA (19 propositions — NON CONTRACTUEL)

Source : `data/reference/paoma/roles_demo.csv` + `role_permissions_demo.csv`.
Chargés dans `platform.rbac_role_templates` (status `proposition_a_valider`) et
`platform.rbac_role_permissions`. **Aucun rôle n'est contractuel. Refus par défaut.**

> Note : `lot=commun` est stocké `common` (contrainte technique) ; `scope_level` peut valoir
> global / agency / counter / region. Le périmètre réel (agence/guichet) sera affiné avec PAOMA.

## Les 19 rôles
| Code | Libellé | Lot | Périmètre | Esprit des droits (minimal/prudent) |
|---|---|---|---|---|
| ADM_SYS | Super administrateur technique | commun | global | Technique seulement, **pas de validation métier financière** |
| ADM_FONC | Administrateur fonctionnel | commun | global | Paramètres, référentiels, agences, institutions |
| AUDIT | Auditeur | commun | global | Audit + lecture/export rapports |
| CONSULT | Consultation | commun | global | Lecture seule |
| SUPPORT | Support technique | commun | global | Lecture utilisateurs + paramètres |
| AGT_TRES | Agent Trésorerie | lot1 | global | Saisie placements/factures/créances/paiements |
| RESP_TRES | Responsable Trésorerie | lot1 | global | Validation/clôture placements + rapports |
| COMPT_TRES | Comptable Trésorerie | lot1 | global | Comptes, rapprochement, chèques, rapports |
| RESP_BUD | Responsable Budget | lot1 | global | Budget + rapports |
| VERIF_TRES | Vérificateur Trésorerie | lot1 | global | Lecture/vérification, sans saisie |
| DAF_DEC | Directeur financier / Décideur | lot1 | global | Validation supérieure placements |
| AGT_GUICHET | Agent guichet | lot2 | counter | Saisie opérations guichet |
| CAISSIER | Caissier | lot2 | counter | Caisse (ouverture, opérations, clôture) **sur sa caisse** |
| CHEF_AGENCE | Chef d'agence | lot2 | agency | Agence + caisses + **validation journée** de son agence |
| RESP_REG | Responsable régional | lot2 | region | Supervision multi-agences d'une région |
| VERIF_OPS | Vérificateur opérations | lot2 | region | Vérification écarts + accusé crédit |
| COMPT_SIEGE | Comptable siège | lot2 | global | Vérification + reporting, **pas de création de caisse** |
| SUP_OPS | Superviseur opérations | lot2 | global | Pilotage + anomalies |
| RESP_VP | Responsable valeurs postales | lot2 | global | Stocks/mouvements de valeurs postales |

## Garanties
- Tous `proposition_a_valider` — aucun `validated` (testé).
- Aucun rôle n'agrège toutes les permissions (max 12 / 106 — testé).
- Audit obligatoire sur attribution/retrait/modification (socle audit existant).

## À valider PAOMA
Matrice de droits **contractuelle** : intitulés exacts, périmètres (organe/direction/agence/guichet),
séparation des tâches, et permissions précises par rôle.
