# Audit de l'existant au 15 juin 2026

## Arrêt contrôlé

- Aucun fichier n'a été supprimé.
- Aucun reset Git, commit ou push n'a été exécuté.
- Aucune migration ni donnée n'a été modifiée pendant le recalage.
- Le conteneur PostgreSQL local `paositra-postgres-1` a été arrêté proprement.
- Le volume PostgreSQL a été conservé.
- Aucun processus applicatif PAOSITRA n'est encore actif.
- Les tables métier contrôlées ne contiennent aucun utilisateur, agence, institution, placement, opération ou statistique fictive.

## État du dépôt

Le dépôt Git est situé dans `C:\Users\Laptop`. Depuis ce dépôt parent, le dossier
`Documents\PAOSITRA` apparaît entièrement non suivi :

```text
## master
?? ./
```

Git ne permet donc pas de distinguer les fichiers modifiés des fichiers créés.
Le PDF du DAO est la référence fournie. Tous les autres fichiers présents doivent
être revus avant leur première intégration dans Git.

### Fichiers présents

- Référence : `DAOO 26 005 acquisition de Logiciels lancé.pdf`.
- Cadrage : `PLAN.md`.
- Configuration : `.env.example`, `.gitignore`, `package.json`,
  `package-lock.json`, `tsconfig.base.json`, `docker-compose.yml`.
- API : `apps/api`.
- Frontend Lot 1 : `apps/treasury-web`.
- Frontend Lot 2 : `apps/operations-web`.
- Socle frontend : `packages/web-core`.
- Base : `database/migrations/0001_initial.sql`.
- Exploitation : `scripts/migrate.mjs`, `scripts/backup.ps1`,
  `scripts/restore-to-new-database.ps1`.
- Documentation antérieure : `docs/COMPLIANCE_MATRIX.md`,
  `docs/DECISIONS.md`.

### Migration existante

| Migration | Contenu | Risque |
|---|---|---|
| `0001_initial.sql` | Schémas `platform`, `treasury`, `operations`; sécurité; audit; placements; agences; permissions initiales | Migration déjà appliquée localement et conservée pour préserver son checksum; les statuts, permissions et périmètres ne sont pas validés contractuellement. |
| `0002_document_provisional_security_model.sql` | Commentaires PostgreSQL et qualification des permissions/statuts provisoires | Migration non destructive ajoutée, non exécutée pendant le nettoyage. |

### Dépendances ajoutées

| Zone | Dépendances principales | Classement |
|---|---|---|
| Racine | Node.js, npm workspaces, TypeScript, `pg`, `tsx` | Choix technique interne acceptable |
| API | NestJS, TypeORM, PostgreSQL, Swagger/OpenAPI, JWT, bcrypt, validation, Helmet, Zod | Choix technique interne acceptable sous revue |
| Frontends | React, React DOM, Vite, Vitest | Choix technique interne acceptable |
| Tests | Jest, ts-jest, Vitest | Choix technique interne acceptable |

Le contrôle `npm audit` exécuté avant l'arrêt ne signalait aucune vulnérabilité
connue. Il ne constitue pas une homologation de sécurité.

### Modules commencés

| Zone | Éléments commencés | Statut de conformité |
|---|---|---|
| Socle | Authentification locale, changement de mot de passe, sessions, RBAC, audit, idempotence, erreurs structurées, pagination | En cours; matrice des droits, SSO et 2FA à clarifier |
| Lot 1 | Institutions financières, ouverture de placement, liste, annulation et clôture | En cours; workflow, statuts et règles de calcul incomplets |
| Lot 2 | Ouverture, liste et fermeture d'agence | En cours; workflow et habilitations incomplets |
| Frontends | Connexion, changement de mot de passe et écrans reliés aux API ci-dessus | En cours; couverture métier très partielle |
| Exploitation | Docker local, migration, sauvegarde et restauration vers une nouvelle base | En cours; préproduction, PRA, RPO/RTO et cloud à clarifier |

## Classement de conformité

| Classement | Élément observé | Motif | Correction proposée |
|---|---|---|---|
| Conforme au DAO | Séparation visible entre Lot 1 Trésorerie et Lot 2 Opérations | Les deux lots sont distincts dans le DAO | Conserver la séparation |
| Conforme au DAO | PostgreSQL, application web, API, audit, historique et absence de suppression physique sur les premiers flux | Ces principes sont demandés | Compléter et tester avant tout statut « Implémenté » |
| Conforme au DAO | Écrans d'institutions, placements et agences reliés à des API et à PostgreSQL | Les objets correspondent à des exigences du DAO | Reprendre après validation de la matrice |
| Choix technique interne acceptable | TypeScript, React, NestJS, monorepo, TypeORM, OpenAPI et Docker | Le DAO impose des capacités, pas ces produits précis | Documenter et valider l'architecture |
| Choix technique interne acceptable | UUID internes, API `/api/v1`, Problem Details, idempotence et schémas PostgreSQL séparés | Mesures techniques cohérentes, non imposées explicitement | Ne pas les présenter comme exigences contractuelles |
| Non prouvé par le DAO | Permissions codées et insérées par la migration | La matrice complète des rôles et habilitations est absente | Geler les attributions et faire valider la matrice |
| Non prouvé par le DAO | Périmètres `global`, `organ`, `direction`, `agency`, `counter` | Les rattachements existent, mais cette taxonomie exacte n'est pas établie | Conserver comme proposition technique non validée |
| Non prouvé par le DAO | Statuts techniques `open`, `cancelled`, `closed` | Les actions sont demandées, mais le référentiel exact de statuts n'est pas fourni | Cartographier après clarification |
| Non prouvé par le DAO | Authentification locale JWT et script de création d'administrateur | SSO/2FA sont demandés lorsque applicables; le fournisseur et les profils sont absents | Neutraliser tout usage hors environnement contrôlé |
| À clarifier | Formules d'intérêts, règles comptables, workflows, formats d'import et modèles de rapports | Informations nécessaires absentes | Inscrire dans `docs/a-clarifier.md` |
| À clarifier | Formats des références et identifiants de transaction | Le DAO demande un identifiant, sans format définitif exploitable | Garder les UUID internes sans inventer de référence métier |
| À supprimer ou neutraliser | Les onze permissions initiales avant validation contractuelle | Elles pourraient être interprétées comme une matrice de droits approuvée | Qualification technique ajoutée par migration; attribution globale automatique supprimée |
| À supprimer ou neutraliser | Valeurs par défaut métier non validées, dont `MGA` dans le formulaire de placement | La devise MGA existe dans le DAO, mais le défaut automatique n'est pas établi | Remplacer ultérieurement par un choix explicite validé |
| À supprimer ou neutraliser | Script de bootstrap administrateur dans un environnement client | Aucun faux utilisateur n'est autorisé et le processus d'habilitation reste à définir | Réserver au provisionnement contrôlé ou retirer après décision |
| Choix technique interne acceptable | Encodage UTF-8 des sources frontend | Le contrôle des points de code et les balises `<meta charset="UTF-8">` ne montrent aucun texte corrompu dans les fichiers | Vérifier le rendu après build; l'affichage incorrect provenait de la lecture PowerShell |

## Vérifications déjà exécutées avant l'arrêt

- Build API et frontends : réussi avant les toutes dernières modifications
  d'authentification.
- Tests API : 3 suites, 5 tests réussis.
- Tests frontend : aucun fichier de test; la commande réussit avec
  `--passWithNoTests`.
- Scénario d'intégration temporaire API/PostgreSQL : réussi avant les dernières
  modifications d'authentification.
- Test d'inaltérabilité de l'audit : mise à jour refusée.
- Test de sauvegarde/restauration vers une base séparée : réussi.
- Contrôle de données : zéro utilisateur, agence, institution, placement,
  événement d'audit et tentative de connexion dans la base locale principale.

Les dernières modifications concernant le changement de mot de passe n'ont pas
été entièrement revalidées. Aucun résultat supplémentaire n'est présumé.

## Risques immédiats

1. Le dépôt local autonome vient d'être initialisé; son premier historique doit encore être poussé.
2. La migration initiale mélange socle technique et décisions métier non validées.
3. Le RBAC présent ne correspond pas à une matrice contractuelle approuvée.
4. Les tests frontend sont absents.
5. Les tests API actuels ne couvrent pas l'ensemble des services ni les workflows métier.
6. Le rendu frontend doit encore être vérifié dans un navigateur après build, même si les sources UTF-8 sont valides.
7. Les exigences des deux lots sont très majoritairement non développées.
8. Le chiffrement au repos, SSO, 2FA, préproduction, cloud et charge ne sont pas démontrés.

## État après nettoyage

Contrôles exécutés le 15 juin 2026 :

- dépôt Git autonome initialisé dans `C:\Users\Laptop\Documents\PAOSITRA`;
- `npm install` réussi, 581 paquets audités;
- `npm run typecheck` réussi pour l'API et les deux frontends;
- `npm run build` réussi pour l'API et les deux frontends;
- tests API réussis : 3 suites et 5 tests;
- aucun test frontend réel n'est présent;
- `npm audit --audit-level=low` : aucune vulnérabilité connue;
- migrations `0001` et `0002` appliquées avec succès sur PostgreSQL éphémère;
- mise à jour d'un événement d'audit refusée comme attendu;
- scripts de sauvegarde et restauration : syntaxe PowerShell valide, restauration non réexécutée;
- recherche de signatures de secrets : aucun secret réel identifié;
- contrôle UTF-8 : aucun point de code de texte corrompu trouvé dans les sources;
- navigateur intégré indisponible : contrôle visuel automatisé non exécuté.

Neutralisations réalisées :

- attribution automatique de toutes les permissions supprimée du bootstrap;
- bootstrap désactivé par défaut et soumis à activation/paramètres explicites;
- permissions et statuts qualifiés comme techniques et provisoires;
- valeur `MGA` retirée du champ devise prérempli;
- mot de passe PostgreSQL rendu obligatoire dans Docker Compose;
- exclusions Git étendues aux builds, caches, dumps, sauvegardes et clés privées.
