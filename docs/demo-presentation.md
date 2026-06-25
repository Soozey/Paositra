# Démo provisoire présentable DAO

Référence : `DAOO n°26/005-PAOSITRA/DG/PRMP/AOO`.

Cette démo est provisoire, non contractuelle et séparée de la production. Elle
montre l'architecture, la séparation des lots, la navigation, le RBAC
provisoire, l'audit technique, l'OpenAPI, le cadrage PCOP 2006 proposé et les
écrans attendus par le DAO sous forme d'états vides propres. Aucune exigence
n'est marquée `Implémenté`.

## Règles de présentation

- Dire explicitement : `DÉMONSTRATION PROVISOIRE — CONFORME DAO — DONNÉES MÉTIER À VALIDER`.
- Ne pas présenter les rôles, statuts, workflows ou calculs comme définitifs.
- Présenter le PCOP 2006 comme hypothèse de cadrage comptable public, à
  confirmer avec PAOMA.
- Ne pas créer de seed métier.
- Ne pas afficher de fausse agence, caisse, opération, placement ou statistique.
- Utiliser uniquement les états vides ou les données réelles de la base locale.
- Les actions sensibles non validées restent désactivées.

## Mode démo

Le mode démo est désactivé par défaut.

Activation locale :

```powershell
$env:VITE_DEMO_MODE="true"
```

Le mode démo est frontend uniquement. Il ne crée aucune donnée PostgreSQL. Les
exports sont affichés comme désactivés.

## Écrans Lot 1 - Trésorerie

| Écran | Statut | Exigence DAO liée | Données nécessaires | Règles manquantes | Message à dire | Risque si présenté comme final |
|---|---|---|---|---|---|---|
| Connexion | visible | Connexion multi-utilisateur | Compte technique local | SSO/2FA à clarifier | Authentification locale de démonstration | Faire croire que le SSO final est livré |
| Tableau de bord | vide | Reporting et tableaux de bord | Données réelles agrégées | Modèles et calculs | Aucun chiffre réel n'est disponible | Afficher des KPI inventés |
| Placements | partiel | Gestion des placements | Institutions et placements réels | Statuts, profils, calculs | Flux partiel, règles à valider | Présenter les calculs comme définitifs |
| Nouveau placement | partiel | Ouverture de placement | Institutions, taux, modes | Référentiels validés | Formulaire structurel seulement | Créer des placements non conformes |
| Simulation | bloqué | Simulation et analyse | Règles d'intérêt | Formules absentes | Je ne peux pas traiter cette partie car l'information requise est absente des données fournies. | Inventer une formule |
| Facturation & recouvrement | vide | Factures, réclamations, rapprochement | Factures et CPS | Formats, modèles, workflow | Écran prévu, règles absentes | Inventer créances ou factures |
| Suivi des créances | vide | Créances, relances, virements | Créances réelles | Relances et régularisation | État vide réel | Simuler des impayés |
| Comptes en devises | vide | Comptes en devises | Comptes réels | Règles comptables | État vide réel | Inventer des soldes |
| Comptes opérationnels | vide | Comptes opérationnels | Comptes réels | Imputation et validation | État vide réel | Produire un journal fictif |
| Portefeuille électronique | vide | Portefeuille électronique | Mouvements réels | Règles portefeuille | État vide réel | Inventer un solde |
| Comptes courants | vide | Encaissement, décaissement, journal | Relevés et mouvements | Formats CCP/bancaires | État vide réel | Inventer des anomalies |
| Mandatement | vide | Mandatement | Mandats réels | Workflow et références | État vide réel | Inventer des mandats |
| Paiements | vide | Paiement | Paiements réels | Validations | État vide réel | Simuler des paiements |
| Chèques | vide | États des chèques | Chèques réels | Numérotation et transitions | État vide réel | Inventer un registre |
| Rapprochement bancaire | vide | Relevés, rapprochement, anomalies | Relevés réels | Tolérances et formats | État vide réel | Inventer un solde |
| Budget | vide | Crédits, dossiers, pièces | Données budgétaires | Étapes, vérificateurs | État vide réel | Figer un processus non validé |
| Exécution budgétaire | vide | Versions, références, historiques | Dossiers réels | Références et validations | État vide réel | Inventer un circuit |
| Reporting | vide | Exports et statistiques | Données réelles | Modèles officiels | Exports désactivés en démo | Produire des chiffres fictifs |
| Paramètres | vide | Référentiels | Référentiels validés | Valeurs initiales | État vide réel | Créer de faux paramètres |
| Utilisateurs / profils | bloqué | Habilitations et privilèges | Matrice RBAC | Délégations et périmètres | RBAC provisoire technique | Présenter des rôles inventés |
| Audit | partiel | Piste d'audit complète | Événements techniques | Écran final et droits | Audit append-only démontré côté socle | Faire croire que l'écran final est complet |
| Cadrage comptable PCOP 2006 | proposition | Comptabilité publique à cadrer | Validation PAOMA | Comptes, journaux et schémas | Schéma comptable proposé sur base PCOP 2006 — à valider par PAOMA | Faire croire que le plan comptable est définitif |
| Points à clarifier | visible | Gouvernance de validation | Décisions PAOMA | Voir liste des 12 points | Ce qui manque est explicite | Développer sans arbitrage |

## Écrans Lot 2 - Opérations

| Écran | Statut | Exigence DAO liée | Données nécessaires | Règles manquantes | Message à dire | Risque si présenté comme final |
|---|---|---|---|---|---|---|
| Connexion | visible | Connexion multi-utilisateur | Compte technique local | SSO/2FA à clarifier | Authentification locale de démonstration | Faire croire que le SSO final est livré |
| Tableau de bord | vide | Reporting agences | Données réelles | Modèles, seuils, calculs | Aucun CA fictif | Inventer chiffre d'affaires |
| Mon agence | vide | Gestion dans une agence | Rattachement agence | Profils et périmètres | État vide réel | Créer une fausse agence |
| Situation du jour | bloqué | Situation comptable | Journée et caisse | Règles comptables | Je ne peux pas traiter cette partie car l'information requise est absente des données fournies. | Inventer les soldes |
| Gestion portefeuille agence | vide | Portefeuille, ME, VP | Stocks réels | Référentiels valeurs | État vide réel | Simuler stock VP |
| Ouverture agence | partiel | Ouverture et paramétrage agence | Agences réelles | Codique et profils | Flux partiel | Ouvrir une agence fictive |
| Fermeture agence | partiel | Fermeture et transfert valeurs | Agence réelle | Séquence et validations | Action à clarifier | Fermer sans règles |
| Coupure de gestion | vide | Coupure de gestion | Données de gestion | Définition métier | État vide réel | Inventer la procédure |
| Opérations inter-agences | vide | Opérations entre agences | Demandes réelles | Règles transfert | État vide réel | Simuler des transferts |
| Demande de fonds / valeurs | vide | Demandes de valeurs | Seuils, destinataires | Autorisations | État vide réel | Inventer des seuils |
| Versements / rapatriements | vide | Versements, rapatriements | Mouvements réels | Justificatifs | État vide réel | Simuler des flux |
| Pièces justificatives | vide | G59-G60 | Fichiers réels | Formats, conservation | Stockage à finaliser | Accepter des fichiers sans règles |
| Guichets et caisses | vide | Caisses et opérations | Caisses réelles | Référentiel caisses | État vide réel | Créer de fausses caisses |
| Ouverture de caisse | bloqué | Encaisse | Caisse réelle | Procédure | À clarifier | Inventer une ouverture |
| Opérations caisse | bloqué | Registre, tickets, levées | Opérations réelles | Produits, règles | Aucun mouvement fictif | Simuler opérations caisse |
| Fermeture de caisse | bloqué | Journée non modifiable après validation | Journée réelle | Fermeture et délégation | À clarifier | Verrouiller sans règle |
| Validation journalière | bloqué | Chef d'Agence uniquement | Profil validé | Suppléance | Profil à valider | Inventer une délégation |
| Vérification | vide | Déficit/excédent | Contrôles réels | Traitement écarts | État vide réel | Inventer des écarts |
| Accusés de crédit | vide | Accusé de crédit | Documents réels | Modèle officiel | État vide réel | Générer un AC non officiel |
| Mise à disposition | vide | Mise à disposition de fonds | Autorisations réelles | Règles comptables | État vide réel | Inventer autorisation |
| Reporting | vide | Exports, CA, anomalies | Données réelles | Calculs, seuils | Aucun chiffre fictif | Afficher faux CA |
| Produits & services | vide | Produits/services | Référentiel validé | Tarifs et comptabilisation | État vide réel | Créer faux produit |
| Valeurs postales | vide | VP | Types et stocks réels | Règles de stock | État vide réel | Inventer stock VP |
| Paramètres | vide | Référentiels | Données validées | Paramètres officiels | État vide réel | Figer faux référentiel |
| Utilisateurs / profils | bloqué | Habilitations | Matrice RBAC | Rôles et périmètres | RBAC provisoire | Présenter des rôles inventés |
| Audit | partiel | Audit inaltérable | Événements techniques | Droits et écran final | Audit append-only du socle | Faire croire que l'audit fonctionnel est complet |
| Cadrage comptable PCOP 2006 | proposition | Comptabilité agences et caisse | Validation PAOMA | Comptes, journaux et schémas | Schéma comptable proposé sur base PCOP 2006 — à valider par PAOMA | Faire croire que les écritures sont activées |
| Points à clarifier | visible | Gouvernance de validation | Décisions PAOMA | Voir liste des 12 points | Ce qui manque est explicite | Développer sans arbitrage |
