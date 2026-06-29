# Points a clarifier PAOSITRA

Chaque point doit recevoir une decision PAOSITRA avant activation en production. Les solutions provisoires ci-dessous servent uniquement a la demonstration.

| Point | Statut | Consequence si non fourni | Solution provisoire demo | Action attendue PAOSITRA |
|---|---|---|---|---|
| Liste officielle des agences et codiques | bloquant | Referentiel agence non fiable | Codes `DEMO` / `TMP` marques `to_validate` | Fournir liste signee |
| Liste des guichets et caisses par agence | bloquant | Impossible de verrouiller les operations caisse definitives | Ecrans et tables partiels | Fournir mapping agence/guichet/caisse |
| Matrice contractuelle roles et permissions | bloquant | Droits excessifs ou blocages | Roles `DEMO_*` proposition a valider | Valider matrice RBAC |
| Workflows exacts | bloquant | Transitions metier contestables | Workflows partiels, actions sensibles limitees | Fournir diagrammes |
| Regles de caisse | bloquant | Soldes et billetage non recevables | Calculs techniques partiels | Fournir procedure caisse |
| Validation journaliere | bloquant | Journee non verrouillable contractuellement | Validation chef agence demo | Confirmer acteurs et delegations |
| Modification / annulation | bloquant | Historique et responsabilites incomplets | Annulation avec motif sur flux partiels | Definir delais, motifs, pouvoirs |
| Placements | bloquant | Interets et decisions faux | Simulation simple marquee demo | Fournir formules, arrondis, fiscalite |
| Regles d'interets | bloquant | Montants contestables | Base simple configurable | Valider conventions de calcul |
| Regles comptables | bloquant | Ecritures non conformes | PCOP 2006 comme cadrage a valider | Fournir schemas debit/credit |
| Plan de comptes definitif | bloquant | Imputation impossible | Aucun plan definitif active | Fournir plan applicable |
| Referentiel PCOP 2006 ou autre | a valider | Cadrage comptable incertain | Mention `proposition a valider` | Confirmer referentiel |
| Modeles G59/G60 | bloquant | Documents non recevables | Gabarits non contractuels | Fournir modeles |
| Accuses de credit | bloquant | AC non officiel | PDF technique partiel | Fournir modele et regles |
| Modeles de rapports | bloquant | Exports non recevables | CSV/PDF/Excel techniques | Fournir gabarits |
| Formats CPS | bloquant | Facturation non integrable | Ecran et etat vide | Fournir contrat d'import/export |
| Formats plateforme X | bloquant | Regularisations non automatisees | Point a clarifier | Fournir contrat d'interface |
| Formats CCP / banques | bloquant | Rapprochement impossible | Rapprochement partiel | Fournir formats bancaires |
| SSO | non bloquant demo | Auth locale seulement | Login local | Choisir fournisseur IAM |
| 2FA | non bloquant demo | Pouvoirs sensibles incomplets | Non active | Definir profils soumis a 2FA |
| Durees de conservation | atelier requis | Archivage/audit incomplets | Conservation technique | Fournir politique |
| Archivage | atelier requis | Donnees historiques mal gerees | Soft delete / statuts selon module | Valider regles |
| RPO / RTO | atelier requis | PRA non recevable | Scripts backup locaux | Definir objectifs |
| Hebergement | atelier requis | Exploitation non qualifiee | Docker local | Valider cible cloud |
| Criteres de recette fonctionnelle | bloquant | Impossible de prononcer la conformite | Checklist demo | Fournir cahier de recette |
