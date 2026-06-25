# Éléments à clarifier avant développement métier

Pour chacun des points ci-dessous :

« Je ne peux pas traiter cette partie car l'information requise est absente des données fournies. »

## Synthèse des 12 points à clarifier avec PAOMA

| Point | Ce qui manque | Risque si développé sans validation | Hypothèse KCI | Confirmation attendue PAOMA |
|---|---|---|---|---|
| 1. Matrice complète des rôles, profils et permissions | Profils officiels, périmètres, délégations, incompatibilités | Droits excessifs, blocage d'utilisateurs ou contournement métier | RBAC technique provisoire avec refus par défaut | Matrice contractuelle signée |
| 2. Workflows exacts et statuts métier | Transitions, motifs, validations et rejets par module | Workflows inventés ou impossibles à recetter | Statuts techniques minimaux et actions désactivées | Statuts officiels et diagrammes de flux |
| 3. Référentiel comptable applicable | PCOP 2006, PCG, procédure interne ou référentiel hybride | Comptabilité non conforme | PCOP 2006 comme cadrage public provisoire | Référentiel applicable à PAOMA |
| 4. Schémas d'écritures comptables | Débits, crédits, journaux, pièces et responsables par opération | Écritures invalides ou non auditables | Tables et règles `proposed`, non publiables | Schémas validés par responsables habilités |
| 5. Données initiales et référentiels officiels | Agences, codiques, comptes, VP, produits, organes, utilisateurs | Données fictives ou incohérentes | Aucun seed métier réel | Fichiers validés et procédure de reprise |
| 6. Règles de calcul des placements | Conventions de jours, intérêts, arrondis, fiscalité, pénalités | Calculs financiers faux | Moteur paramétrable désactivé | Règles financières officielles |
| 7. Formats d'import et d'intégration | CPS, banques, CCP, plateforme X, erreurs et reprise | Imports fragiles et rapprochements faux | Adaptateurs à définir | Contrats techniques et jeux de tests |
| 8. Modèles officiels de rapports, factures, tickets, AC, G59/G60 | Gabarits, champs, signatures, pagination, mentions | Documents rejetés en recette | Exports vides marqués modèle à valider | Modèles officiels validés |
| 9. Règles exactes de caisse et d'agence | Billetage, journée, seuils, déficit/excédent, délégations | Soldes faux ou journée mal verrouillée | Écrans vides et validations désactivées | Procédures caisse/agence |
| 10. Sécurité opérationnelle | SSO, 2FA, sessions, clés, journaux, conservation | Accès non conforme ou audit insuffisant | Auth locale contrôlée pour démo | Architecture IAM et politique sécurité |
| 11. Identifiant unique de transaction | Format, séquence, entité, réinitialisation, annulation | Traçabilité contestable | Format technique configurable proposé | Format définitif et règles de non-réutilisation |
| 12. Cloud, sauvegarde, PRA/PCA et critères de recette | Fournisseur, région, RPO/RTO, tests de restauration | Déploiement non recevable | Documentation et scripts locaux provisoires | Cible d'exploitation et critères signés |

| Sujet | Information manquante | Impact si non clarifié |
|---|---|---|
| Rôles et permissions | Matrice complète des profils, actions autorisées, délégations, incompatibilités et périmètres | Impossible de finaliser RBAC, menus, routes, exports et validations |
| Utilisateurs avec pouvoir | Définition des profils concernés par le 2FA | Impossible d'activer le 2FA conformément au besoin |
| SSO | Fournisseur, protocoles, annuaire, attributs et règles de secours | Impossible d'intégrer l'authentification institutionnelle |
| Statuts métier | Référentiels exacts et transitions pour chaque objet | Risque d'inventer des workflows |
| Placements | Formules d'intérêts, conventions de jours, arrondis, renouvellement et rapatriement | Impossible de calculer ou simuler correctement |
| Comptabilité | Plans, règles d'imputation, équilibrage, validation et correction | Impossible de sécuriser les écritures |
| Rapprochement | Formats bancaires/CCP, règles de correspondance et tolérances | Impossible d'automatiser le rapprochement |
| Chèques | Numérotation, expiration, transitions et règles d'annulation | Impossible de finaliser le registre |
| Budget | Étapes, vérificateurs, validations, rejets, versions et références | Impossible de construire le workflow |
| Caisse | Opérations autorisées, règles comptables, billetage et clôture | Impossible de garantir les soldes et la journée |
| Chef d'agence | Délégation, suppléance et conditions de validation journalière | Impossible de finaliser le verrouillage de journée |
| Vérification | Traitement des déficits/excédents, accusés de crédit et responsabilités | Impossible de construire les transitions |
| Produits/services | Référentiel, tarifs, commissions et modes de comptabilisation | Impossible de créer les paramètres |
| CPS | Contrats, formats, authentification, erreurs, reprise et environnements | Impossible de développer l'intégration |
| Plateforme X | Fonction, contrats, formats et sécurité | Impossible de développer l'intégration |
| Courriel/notifications | Fournisseur, expéditeurs, modèles, destinataires et règles de relance | Impossible d'envoyer des notifications réelles |
| Rapports | Modèles officiels, contenus, signatures, pagination et formats attendus | Impossible de produire des documents contractuels |
| Imports | Formats, colonnes, règles de rejet, correction et réversibilité | Impossible de sécuriser les reprises de données |
| Références métier | Format, séquence, unicité, réinitialisation et non-réutilisation | Impossible d'afficher des références officielles |
| Identifiant de transaction | Format définitif reflétant le type et l'heure | Impossible de finaliser l'identifiant visible |
| Données initiales | Agences, organes, directions, guichets, comptes, rubriques et autres référentiels validés | Aucun initialiseur métier ne peut être livré |
| Conservation | Durées légales et contractuelles par type de donnée, audit et fichier | Impossible de définir archivage et purge |
| Pièces jointes | Formats officiels, tailles, antivirus, classification et conservation | Impossible de finaliser le stockage sécurisé |
| Chiffrement au repos | Technologie d'infrastructure, gestion des clés et rotation | Impossible de démontrer la conformité |
| RPO/RTO | Objectifs de perte de données et de reprise | Impossible de dimensionner sauvegarde et PRA |
| Cloud | Fournisseur, région, réseau, identité, stockage et responsabilités | Impossible de préparer l'exploitation |
| Préproduction | Topologie, jeux de données autorisés, accès et critères de recette | Impossible de reproduire l'environnement cible |
| GitHub Team | Organisation, propriétaires et comptes à provisionner | Engagement fournisseur non exécutable dans le code |
| Charge | Scénarios, durée, répartition des opérations et seuils de succès | Impossible d'établir un rapport de charge contractuel |
| « Epargne Tsinjo » | Confirmation écrite de la mention des pages 73 et 79 | Aucun module ne sera créé sans clarification |

## Règle de reprise

Le développement d'un module métier ne reprend qu'après :

1. validation de la ligne correspondante dans `conformite-dao.md`;
2. fourniture des informations indispensables ci-dessus;
3. validation des rôles, statuts, données, écrans, API, tables, audit, exports et tests;
4. définition d'une migration non destructive et de ses conditions de retour arrière.
