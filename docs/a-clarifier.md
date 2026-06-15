# Éléments à clarifier avant développement métier

Pour chacun des points ci-dessous :

« Je ne peux pas traiter cette partie car l'information requise est absente des données fournies. »

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
