# Scénario de démonstration provisoire

Durée cible : 10 à 15 minutes.

Formulation à utiliser :

> Cette démonstration montre l'architecture, les écrans et les parcours prévus
> par le DAO. Les règles métier fines, les référentiels, les modèles de rapports
> et les habilitations définitives doivent être validés par Paositra avant
> activation complète.

## 1. Connexion

Ouvrir :

- Lot 1 : `http://localhost:8080`
- Lot 2 : `http://localhost:8081`

Expliquer que le compte utilisé est un compte technique local de présentation,
non contractuel, créé manuellement et sans données métier.

## 2. Socle sécurisé

Montrer :

- séparation compte PostgreSQL migration / compte applicatif ;
- audit append-only ;
- RBAC provisoire ;
- OpenAPI généré ;
- erreurs API structurées ;
- idempotence sur actions critiques.

Message à dire : les mécanismes techniques existent, mais les profils finaux et
les délégations restent à valider.

## 3. Lot 1 - Trésorerie

Afficher le menu latéral et parcourir :

1. Tableau de bord ;
2. Placements ;
3. Nouveau placement ;
4. Simulation ;
5. Facturation & recouvrement ;
6. Comptes ;
7. Budget ;
8. Reporting ;
9. Utilisateurs ;
10. Audit.

Insister sur les états vides réels et les actions désactivées quand les règles
métier sont absentes.

## 4. Lot 2 - Opérations

Afficher le menu latéral et parcourir :

1. Tableau de bord ;
2. Mon agence ;
3. Ouverture agence ;
4. Guichets et caisses ;
5. Opérations caisse ;
6. Validation journalière ;
7. Vérification ;
8. Reporting ;
9. Produits & services ;
10. Audit.

Dire explicitement qu'aucun chiffre d'affaires, stock VP, déficit, excédent ou
mouvement de caisse n'est simulé.

## 5. Écran vide

Choisir un écran absent, par exemple `Reporting`.

Message :

> Aucune donnée réelle disponible pour cette démonstration. Les règles de calcul
> et les modèles officiels doivent être validés avant affichage d'indicateurs.

## 6. Écran partiel

Choisir `Placements` ou `Ouverture agence`.

Message :

> L'écran montre la structure prévue et le raccordement technique initial. Les
> règles métier, statuts, profils et documents restent à valider.

## 7. Audit / traçabilité

Présenter le principe :

- événements auditables ;
- impossibilité de mise à jour, suppression ou troncature par le compte applicatif ;
- tests PostgreSQL d'inaltérabilité.

Ne pas présenter l'écran d'audit final comme terminé.

## 8. OpenAPI

Montrer `docs/openapi/openapi.json` et la commande :

```powershell
npm run openapi:generate
npm run openapi:check
```

Dire que Swagger UI n'est pas exposé en production Docker.

## 9. Points à clarifier

Ouvrir `docs/a-clarifier.md` et citer :

- matrice RBAC finale ;
- statuts métier ;
- règles comptables ;
- formules d'intérêts ;
- modèles de rapports ;
- formats CPS/plateforme X ;
- fournisseur SSO ;
- RPO/RTO ;
- fournisseur cloud.

## 10. Conclusion

Message :

> Le socle est prêt pour validation technique. Le développement métier complet
> doit reprendre uniquement après validation des règles, référentiels, profils,
> workflows, exports et modèles officiels par Paositra.
