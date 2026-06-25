# Risques si les clarifications PAOMA ne sont pas obtenues

Ce document liste les risques à présenter avant toute activation métier.

| Sujet | Risque si non clarifié | Conséquence possible | Position KCI |
|---|---|---|---|
| Référentiel comptable | Utiliser un référentiel non applicable à PAOMA | Écritures invalides, rapports contestables | PCOP 2006 seulement comme hypothèse à valider |
| Plan de comptes | Figer des comptes incorrects | Reprise coûteuse, erreurs d'imputation | Structure importable, aucun compte définitif |
| Schémas d'écritures | Poster des écritures non validées | Non-conformité comptable | Règles `proposed` non publiables |
| RBAC | Donner trop de droits ou bloquer des acteurs | Fraude, erreur, blocage opérationnel | Refus par défaut et matrice provisoire |
| Placements | Mauvais calcul d'intérêts | Décision financière erronée | Moteur paramétrable, calcul à clarifier |
| Caisse | Journée ou billetage mal verrouillé | Écarts non maîtrisés | Validation désactivée tant que non validée |
| Agences | Codiques et seuils inventés | Référentiel faux | Écrans vides et champs DAO seulement |
| Valeurs postales | Stocks fictifs | Rapport faux | Aucun stock créé sans référentiel |
| Rapports | Modèles non officiels | Rejet en recette | Exports marqués modèle à valider |
| Pièces | Mauvais format ou conservation | Risque légal et sécurité | Upload métier à finaliser après règles |
| Identifiant transaction | Format non accepté | Traçabilité incomplète | Générateur configurable proposé |
| Cloud / PRA | Infrastructure insuffisante | Perte de données ou indisponibilité | Décision PAOMA requise |

## Principe de blocage

Lorsqu'une information indispensable est absente, le statut reste :

`À clarifier avec PAOMA`

La démo peut afficher l'écran, l'état vide et le risque, mais elle ne doit pas
simuler une donnée, un solde, un compte, un workflow ou un rapport officiel.
