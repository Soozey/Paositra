# Journal des décisions

> Document historique conservé pour traçabilité. Le journal actif est
> [`decisions-techniques.md`](decisions-techniques.md).

## 2026-06-15 - Socle initial

- Source fonctionnelle unique: DAOO n°26/005-PAOSITRA/DG/PRMP/AOO, 111 pages.
- Architecture: monorepo TypeScript, deux interfaces React et un backend NestJS organisé en domaines `treasury`, `operations` et `platform`.
- Données: PostgreSQL avec schémas séparés et migrations SQL contrôlées par somme SHA-256.
- Suppression métier: aucune suppression physique exposée par l'API.
- Identifiants: UUID internes uniquement. Le format d'identifiant métier demandé page 79 reste à clarifier.
- Authentification: connexion locale sécurisée livrée comme mécanisme de base. Le fournisseur OIDC/SSO et les règles 2FA restent à clarifier.
- Habilitations: permissions techniques configurables et portées prévues en base. Aucun profil métier non décrit par le DAO n'est créé.
- Audit: table append-only protégée par un trigger PostgreSQL.
- Incohérence documentaire: les pages 73 et 79 demandent un document concernant « Epargne Tsinjo », sans rapport avec les lots. Aucun module correspondant ne sera développé.

## Points bloqués par l'absence d'information

Je ne peux pas traiter cette partie car l'information requise est absente des données fournies.

Cela concerne notamment les règles comptables, formules d'intérêts, profils métier complets, séquences de validation détaillées, formats CPS et plateforme X, modèles officiels de documents, format des références, fournisseur SSO, règles 2FA, RPO/RTO et infrastructure cloud cible.
