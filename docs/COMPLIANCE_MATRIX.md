# Matrice de conformité DAOO 26/005

> Document historique conservé pour traçabilité. La matrice active est
> [`conformite-dao.md`](conformite-dao.md). Aucun statut de ce fichier historique
> ne vaut validation contractuelle.

Statuts autorisés: `À faire`, `En cours`, `Implémenté`, `À clarifier`, `Non applicable selon DAO`.

Une ligne ne passe à `Implémenté` qu'après cohérence démontrée entre API, PostgreSQL, interface, droits, audit, exports applicables et tests.

| Référence DAO | Exigence | Lot/module | API | Base | Écran/export | Audit/RBAC | Tests | Statut | Preuve ou observation |
|---|---|---|---|---|---|---|---|---|---|
| p.68 | Structure modulaire, recherche, archivage, interface uniforme et API | Lot 1/global | Partiel | Partiel | Partiel | Partiel | À faire | En cours | Socle modulaire créé |
| p.68 | Ouverture et configuration d'un placement | Lot 1/placements | Prévu `/api/v1/treasury/placements` | `treasury.placements` | Formulaire Trésorerie | Permissions et audit | Unitaires/intégrés | En cours | Premier flux vertical |
| p.68 | Renouvellement d'un placement | Lot 1/placements | À faire | À faire | À faire | À faire | À faire | À faire | |
| p.68 | Rapatriement des fonds et/ou intérêts | Lot 1/placements | À faire | À faire | À faire | À faire | À faire | À clarifier | Règles et pièces non décrites |
| p.68 | Fermeture d'un placement | Lot 1/placements | Prévu | `status`, `closed_at` | Action avec confirmation | Permission dédiée, audit | Intégrés | En cours | |
| p.68 | Initialisation des placements et institutions | Lot 1/placements | À faire | Partiel | À faire | À faire | À faire | En cours | Institutions persistées |
| p.68 | Modification/annulation selon profil, notification, confirmation et historique | Lot 1/placements | Partiel | Historique prévu | Confirmation prévue | Permission, avant/après | Intégrés | En cours | Notifications à faire |
| p.68 | Simulation et analyse | Lot 1/placements | À faire | À faire | À faire | À faire | À faire | À clarifier | Formules et conventions absentes |
| p.68 | Vues, échéancier, journal, états mensuels/trimestriels | Lot 1/placements | À faire | Index échéance | À faire | Export tracé à faire | À faire | À faire | |
| p.68 | Rappels paramétrables 15 à 30 jours avant échéance | Lot 1/placements | À faire | À faire | À faire | À faire | À faire | À faire | |
| p.68 | Traitement, vérification et réclamation des factures | Lot 1/recouvrement | À faire | À faire | À faire | À faire | À faire | À clarifier | Workflow et rôles absents |
| p.68 | Factures récapitulatives/définitives et collecte de pièces | Lot 1/recouvrement | À faire | À faire | À faire | À faire | À faire | À clarifier | Modèles officiels absents |
| p.68 | Compilation des créances depuis CPS | Lot 1/recouvrement | Adaptateur à faire | À faire | À faire | Import audité | Contrat/intégration | À clarifier | Format CPS absent |
| p.68 | Initialisation créances et historique des relances | Lot 1/recouvrement | À faire | À faire | À faire | À faire | À faire | À faire | |
| p.68 | Virement de régularisation et notifications CPS/email | Lot 1/recouvrement | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Contrats CPS/email absents |
| p.68 | Suivi des relances et rapports créances/virements | Lot 1/recouvrement | À faire | À faire | À faire | À faire | À faire | À faire | |
| p.68-69 | Comptes devises, mouvements, rapprochements et rapports | Lot 1/comptes | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Règles de rapprochement absentes |
| p.69 | Comptes opérationnels, extraction et rapprochement bancaire/CCP | Lot 1/comptes | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Formats d'import absents |
| p.69 | Portefeuille électronique, imports, validations et reversements | Lot 1/portefeuille | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Entités et règles absentes |
| p.69 | Mandatement, paiement et journal des comptes courants | Lot 1/comptes courants | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Workflow absent |
| p.69 | Rapprochement, anomalies, validation et archivage | Lot 1/comptes courants | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Règles absentes |
| p.69 | Chèques émis/en circulation/encaissés/annulés/expirés | Lot 1/chèques | À faire | À faire | À faire | Annulation auditée | À faire | À faire | |
| p.69-70 | Élaboration du budget, exercices, prévisions, versions et validation | Lot 1/budget | À faire | À faire | À faire | Maker/checker | À faire | À clarifier | Contraintes et rôles absents |
| p.70 | Exécution budgétaire, dossiers, étapes, références, pièces et historique | Lot 1/exécution | À faire | À faire | À faire | Audit complet | À faire | À clarifier | Séquence et format référence absents |
| p.70 | Rapports crédits, historique, fiche dossier, périodiques et bordereau | Lot 1/exécution | À faire | À faire | Exports à faire | Export audité | À faire | À clarifier | Modèles absents |
| p.70-71 | Tableaux de bord et statistiques explicitement listés | Lot 1/reporting | À faire | À faire | À faire | Selon privilèges | À faire | À faire | Aucune statistique fictive |
| p.71 | Paramètres, listes, taux de change, statuts, calendriers et PJ | Lot 1/paramètres | À faire | Partiel | À faire | Permissions | À faire | À clarifier | Valeurs initiales absentes |
| p.71 | Rapports personnalisables et exports Excel/Word/PDF | Lot 1/reporting | À faire | À faire | À faire | Export audité | À faire | À clarifier | Périmètre de personnalisation absent |
| p.71 | Utilisateurs, profils, rattachement, habilitations et connexions | Plateforme | Partiel | Tables `platform` | À faire | RBAC/audit | Unitaires/intégrés | En cours | Profils métier non inventés |
| p.72-73 | Web, PostgreSQL, multi-utilisateur, API et scalabilité | Commun | Oui | Oui | Deux interfaces | Oui | Build/charge à faire | En cours | |
| p.72,78 | SSO et 2FA | Commun | Adaptateur à faire | Champs session | À faire | Audit | À faire | À clarifier | Fournisseur et règles absents |
| p.72-73,78-79 | Audit complet, avant/après et inaltérable | Commun | Service prévu | `platform.audit_events` + trigger | Consultation à faire | Permissions | Intégrés à faire | En cours | |
| p.72-73,78-79 | Hébergement développement/exploitation et GitHub Team | Commun/exploitation | Non applicable au code | Non applicable | Documentation | À faire | Validation infra | À faire | Engagement fournisseur |
| p.72-73,78 | Sauvegarde, restauration, archivage et site secondaire | Commun/PRA | Scripts à faire | Schémas prêts | Procédures à faire | Audit à faire | Restauration | À faire | RPO/RTO à clarifier |
| p.73,79 | Sécurité, mots de passe, sessions, rapport tentatives, chiffrement | Commun/sécurité | Partiel | Tables dédiées | À faire | RBAC/audit | Sécurité à faire | En cours | Chiffrement au repos dépend de l'infrastructure |
| p.73,79 | API REST partenaires et ID transaction unique typé/horodaté | Commun/intégrations | REST partiel | UUID internes | Non applicable | Audit | Contrats à faire | À clarifier | Format métier absent |
| p.73,79 | Préproduction, tests unitaires et intégrés | Commun/qualité | À faire | PostgreSQL réel | À faire | À faire | À faire | À faire | |
| p.73,79 | Manuels, code, architecture et rapports de tests | Commun/livraison | Documentation initiale | Schéma SQL | Manuels à faire | Rapport à faire | Rapport à faire | En cours | |
| p.73,79 | Document « Epargne Tsinjo » | Réception | Non applicable | Non applicable | Non applicable | Non applicable | Non applicable | À clarifier | Incohérence documentaire signalée; aucun module créé |
| p.75 | Ouverture, paramétrage et fermeture d'agence | Lot 2/agences | Prévu `/api/v1/operations/agencies` | `operations.agencies` | Formulaire Opérations | Permissions et audit | Intégrés | En cours | |
| p.75 | Initialisation portefeuille, numéraire, ME, encaisses et VP | Lot 2/agences | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Structure de portefeuille absente |
| p.75 | Coupure de gestion et changement de chef d'agence | Lot 2/agences | À faire | À faire | À faire | Audit | À faire | À clarifier | Workflow absent |
| p.75 | Opérations inter-agences, demandes, transferts et notifications | Lot 2/agences | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Règles et autorisations absentes |
| p.75 | Pièces d'identité et historique client six mois | Lot 2/client | À faire | À faire | À faire | Accès restreint | À faire | À clarifier | Données et politique de conservation absentes |
| p.75 | Téléversement G59-G60 | Lot 2/fichiers | À faire | `platform.attachments` | À faire | Audit/contrôle | À faire | À clarifier | Types et modèles officiels absents |
| p.75 | Paiement/régularisation en back | Lot 2/comptabilité | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Règles absentes |
| p.75 | Rapports agence et synthèses produit/service | Lot 2/reporting | À faire | À faire | À faire | Export audité | À faire | À faire | |
| p.75-76 | Ouverture, veille et fermeture de caisse avec billetage | Lot 2/guichets | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Billetage et délai de veille absents |
| p.75 | Paiement espèces/crédit/chèque | Lot 2/guichets | À faire | À faire | À faire | Transaction/audit | À faire | À clarifier | Règles comptables absentes |
| p.76 | Modification/annulation même journée sans suppression | Lot 2/guichets | À faire | À faire | Confirmation | Permission/audit | Workflow | À faire | |
| p.76 | Journaux, registres, encaisse, tickets, levées et produits | Lot 2/reporting | À faire | À faire | Exports à faire | Export audité | À faire | À clarifier | Modèles absents |
| p.76 | Validation journée uniquement par Chef d'Agence, puis verrouillage | Lot 2/guichets | À faire | À faire | Confirmation | Transaction/RBAC | Workflow/concurrence | À clarifier | Profil et délégation non définis |
| p.76 | Facture par chef/comptable vers facturation | Lot 2/facturation | À faire | À faire | À faire | RBAC/audit | À faire | À clarifier | Contrat du service absent |
| p.76 | Vérification progressive, déficit/excédent, AC et fonds | Lot 2/vérification | À faire | À faire | À faire | Maker/checker | À faire | À clarifier | Règles absentes |
| p.76 | Tableaux de bord et notifications explicitement listés | Lot 2/reporting | À faire | À faire | À faire | Selon privilèges | À faire | À clarifier | Plateforme X non spécifiée |
| p.76-77 | Paramètres, produits/services, VP, encaisse et calendriers | Lot 2/paramètres | À faire | À faire | À faire | Audit | À faire | À clarifier | Valeurs initiales absentes |
| p.77 | Masques de saisie, tarifs, commissions et caisses | Lot 2/paramètres | À faire | À faire | À faire | Audit | À faire | À clarifier | Formats et règles absents |
| p.77 | Validation de chaque transaction | Lot 2/opérations | À faire | À faire | À faire | Maker/checker | À faire | À clarifier | Matrice de validation absente |
| p.79 | 300 agences, 1500 caisses, 2000 connexions, jusqu'à plus de 250 opérations/agence/jour | Lot 2/performance | À faire | Index initiaux | Non applicable | Non applicable | Charge à faire | En cours | Index agence initiaux seulement |
| p.80 | Formation, conduite du changement et maintenance un an minimum | Commun/accompagnement | Non applicable | Non applicable | Manuels à faire | Suivi contractuel | Recette | À faire | |
| p.25,74,81 | Livraison de chaque lot sous 90 jours maximum | Livraison | Non applicable | Non applicable | Non applicable | Suivi projet | Recette | À faire | Échéance calculée depuis l'ordre de service |
| p.63 | Garantie des deux lots pendant 24 mois | Garantie | Non applicable | Non applicable | Non applicable | Suivi contractuel | Recette/SAV | À faire | |
