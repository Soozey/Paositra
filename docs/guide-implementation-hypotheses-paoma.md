# Guide d'implémentation cible PAOMA

Projet : modernisation Paositra Malagasy / PAOMA  
Référence contractuelle : `DAOO n°26/005-PAOSITRA/DG/PRMP/AOO`  
Lots : Lot 1 Trésorerie et Lot 2 Opérations

## Position de validation

Le DAO constitue la base contractuelle. Le PCOP 2006 est utilisé comme
référentiel de cadrage comptable public proposé, sous réserve de confirmation par
PAOMA, la Direction Financière, l'Agent comptable et les responsables habilités.

Ce guide ne valide pas les règles définitives. Il distingue :

- `Exigence DAO` : fonctionnalité explicitement demandée.
- `Hypothèse PCOP / KCI à valider` : proposition structurante à faire valider.
- `Référentiel PAOMA requis` : donnée officielle à fournir par PAOMA.
- `Choix technique` : organisation logicielle proposée.

Aucun compte comptable, journal, codique, tarif, produit, modèle de rapport,
workflow ou utilisateur PAOMA n'est définitif tant qu'il n'a pas été validé.

## Sources de contexte utilisées

### Documents projet

- DAO local : `DAOO 26 005 acquisition de Logiciels lancé.pdf`.
- PCOP local : `plan-comptable-des-operations-publiques-2006.pdf`.
- Guide PCOP local : `guide-pcop-2006-etat.pdf`.
- Cadrage existant : `docs/cadrage-pcop-2006-paoma.md`.

### Sources publiques de contexte

- Site officiel Paositra Malagasy, produits et services :  
  https://paositramalagasy.mg/
- Page officielle PaositraMoney listant les produits d'épargne, colis et
  services financiers :  
  https://paositramalagasy.mg/product/paositra_money
- Page officielle Western Union Paositra, pièces à fournir :  
  https://paositramalagasy.mg/product/western_union
- PAOSITRA Finances, contexte institution de microfinance :  
  https://www.paositrafinances.mg/
- EMS Cooperative, opérateur EMS Madagascar :  
  https://www.ems.post/en/global-network/ems-operators/ems-madagascar
- UPU, rôle de l'Union postale universelle :  
  https://www.upu.int/en/universal-postal-union
- UPU, statistiques postales et opérateurs désignés :  
  https://www.upu.int/en/universal-postal-union/activities/research-publications/postal-statistics
- Source presse reprise par MFW4A sur PaositraMoney et le réseau d'agences :
  https://www.mfw4a.org/fr/news/madagascar-paositramoney-un-nouveau-service-de-mobile-banking-lance-par-la-paositra-malagasy

Les sources publiques servent uniquement au contexte produit et réseau. Les
données de production doivent provenir de référentiels officiels PAOMA.

## Principes PCOP retenus comme hypothèses

Le PCOP 2006 indique notamment :

- comptabilité générale des opérations publiques;
- comptabilité d'exercice;
- constatation des droits et obligations;
- séparation des responsabilités de l'ordonnateur et du comptable;
- justification des opérations;
- opérations de recettes, dépenses et trésorerie;
- écritures en partie double;
- pièces justificatives pour les écritures;
- procédure de clôture pour figer la chronologie et garantir l'intangibilité.

### Classes et comptes candidats

Ces comptes sont des cadrages, pas des comptes définitifs PAOMA.

| Famille | PCOP candidat | Usage logiciel proposé | Statut |
|---|---|---|---|
| Créances clients, redevables | Classe 4, notamment `41` | Factures, créances, relances, effets à recevoir | Hypothèse PCOP à valider |
| Débiteurs / créditeurs divers | `46` | Régularisations, écarts, tiers divers | Hypothèse PCOP à valider |
| Comptes d'attente | `47` | Import non rapproché, anomalie en attente, opération à imputer | Hypothèse PCOP à valider |
| Valeurs mobilières de placement | `50` | Placement court terme si validé par PAOMA | Hypothèse PCOP à valider |
| Trésor, banques, CCP assimilés | `51` | Comptes bancaires, CCP, comptes opérationnels | Hypothèse PCOP à valider |
| Caisse | `53` | Numéraire agence, caisse guichet | Hypothèse PCOP à valider |
| Régies d'avances | `54` | Avances autorisées, fonds de caisse si applicable | Hypothèse PCOP à valider |
| Virements internes | `58` | Transferts inter-agences, banque-caisse, attente de rapprochement | Hypothèse PCOP à valider |
| Charges financières | `66` | Intérêts, pénalités financières | Hypothèse PCOP à valider |
| Produits financiers | `76` | Intérêts reçus, produits de placement | Hypothèse PCOP à valider |
| Recettes non fiscales | `77` | Produits de services postaux et financiers si non fiscaux | Hypothèse PCOP à valider |

Règle technique : le logiciel doit permettre d'importer un plan de comptes, mais
aucun compte ne doit être activé comme définitif sans statut `validated`.

## Référentiels à intégrer

### Agences postales et codiques

Statut : `Référentiel PAOMA requis`.

Le DAO cible 300 agences et 1500 caisses en volumétrie. Une source publique
mentionne 260 agences dans le contexte PaositraMoney. Ces nombres doivent être
traités comme volumes cibles ou contexte, pas comme référentiel officiel.

Format d'import recommandé :

| Champ | Type | Règle |
|---|---|---|
| `agency_code` | texte | Codique officiel PAOMA, unique |
| `agency_name` | texte | Libellé officiel |
| `region` | texte | Région ou périmètre de rattachement |
| `zone` | texte | Zone opérationnelle |
| `parent_organ_code` | texte | Direction, région ou organe de supervision |
| `status` | enum | `proposed`, `active`, `suspended`, `closed` |
| `opening_date` | date | Optionnel |
| `closing_date` | date | Optionnel |
| `validation_note` | texte | Référence de validation |

Pseudo-code :

```text
import_agencies(file):
  parse CSV/XLSX
  validate mandatory agency_code, agency_name
  reject duplicate agency_code
  insert rows with status = proposed
  produce import report
  wait for PAOMA validation
  activate only rows approved by authorized validator
```

### Guichets et caisses

Statut : `Hypothèse KCI à valider`.

Chaque agence peut contenir plusieurs guichets et caisses. Le DAO indique 1500
caisses en volumétrie, ouverture/fermeture de caisse, mise en veille et
validation journalière.

Tables proposées :

- `operations.counters`
- `operations.cashdesks`
- `operations.cashdesk_sessions`
- `operations.cash_movements`
- `operations.daily_validations`

Statuts proposés :

| Objet | Statuts proposés | À confirmer |
|---|---|---|
| Guichet | `proposed`, `active`, `suspended`, `retired` | Libellés officiels |
| Caisse | `proposed`, `open`, `paused`, `closed`, `retired` | Règles ouverture/veille |
| Session caisse | `opened`, `counting`, `submitted`, `validated`, `rejected`, `locked` | Chef d'agence, délégation |
| Mouvement caisse | `draft`, `confirmed`, `cancelled_same_day`, `locked` | Modification même journée |

### Types de pièces et justificatifs

Statut : `Hypothèse KCI à valider`.

Référentiel initial proposé :

| Code | Libellé | Catégorie | Statut |
|---|---|---|---|
| `CIN` | Carte d'Identité Nationale | Identité | proposed |
| `PASSPORT` | Passeport | Identité | proposed |
| `PHOTO` | Photo d'identité | Justificatif complémentaire | proposed |
| `PROOF_OF_ADDRESS` | Justificatif de domicile | Justificatif complémentaire | proposed |
| `G59` | Pièce G59 | Comptabilité agence | proposed |
| `G60` | Pièce G60 | Comptabilité agence | proposed |

La page officielle Western Union Paositra mentionne la CIN et, selon pays et
montant, un certificat de résidence ou une déclaration sur l'honneur comme pièces
possibles. Les pièces acceptées par module doivent donc être configurables.

### Produits et services

Statut : `Référentiel PAOMA requis`.

La source officielle Paositra liste notamment :

- épargnes postales : `Tsinjo Avotra`, `Tsinjo Fahanterana`, `Tsinjo Lavitra`,
  `Tsinjo Diaspora`;
- colis et courrier : `Paositra Rapida`, `EMS Mailaka`, déclarations en ligne,
  livraison Rapida en ville;
- services financiers : `PaositraMoney`, `Takalo`, `PosTransfert`, `Ria`,
  `WesternUnion`, `Global Transfert`, `E Mandat Vaovao`.

Structure proposée :

| Champ | Description |
|---|---|
| `product_code` | Code interne non définitif |
| `product_name` | Libellé commercial |
| `family` | `savings`, `money_transfer`, `mail`, `parcel`, `postal_value`, `fee` |
| `service_channel` | agence, caisse, mobile, partenaire, back-office |
| `requires_identity` | booléen |
| `requires_attachment` | booléen |
| `tariff_rule_id` | règle tarifaire validée |
| `accounting_rule_template_id` | règle comptable validée |
| `status` | `proposed`, `active`, `retired` |

Règle : retirer un produit de l'interface ne doit jamais supprimer son historique.

## Workflows proposés

Tous les workflows ci-dessous sont `Hypothèse KCI à valider`.

### Lot 1 - Placements

Exigence DAO : ouverture, modification, annulation, renouvellement, rapatriement,
fermeture, simulation, échéancier, historique et journal.

Statuts proposés :

```text
draft -> submitted -> validated -> open -> matured -> renewed
                                    -> repatriated -> closed
                                    -> cancelled
submitted -> rejected
```

Règles proposées :

- `draft` : saisie non validée, modifiable par créateur.
- `submitted` : en attente de validation.
- `validated` : accepté métier, prêt à ouverture.
- `open` : placement actif.
- `matured` : date d'échéance atteinte.
- `renewed` : renouvelé avec nouvelle période.
- `repatriated` : principal et/ou intérêts rapatriés.
- `closed` : clôturé définitivement.
- `cancelled` : annulé avec motif, référence non réutilisable.

Calculs d'intérêts proposés :

| Paramètre | Valeur proposée | Statut |
|---|---|---|
| Convention jours | `actual/365`, `actual/360`, `30/360` | À valider |
| Type intérêt | simple ou composé | À valider |
| Arrondi | MGA entier ou 2 décimales selon devise | À valider |
| Fiscalité/retenue | paramétrable | À clarifier |
| Pénalité sortie anticipée | paramétrable | À clarifier |

Pseudo-code calcul :

```text
calculate_interest(principal, annual_rate, start_date, end_date, convention):
  days = day_count(start_date, end_date, convention)
  if interest_type == simple:
    interest = principal * annual_rate / 100 * days / year_basis(convention)
  if interest_type == compound:
    interest = compound_formula(...)
  return round_by_validated_rule(interest)
```

Le moteur ne doit produire qu'une simulation tant que la règle est `proposed`.

### Lot 1 - Facturation et recouvrement

Statuts facture proposés :

```text
draft -> verified -> issued -> partially_paid -> paid
                         -> disputed -> cancelled
```

Statuts créance proposés :

```text
open -> reminded -> in_recovery -> regularized -> closed
open -> disputed -> written_off
```

Hypothèses :

- délai de relance : 15 jours après échéance, à valider;
- facture récapitulative mensuelle, à valider;
- export : PDF, XLSX, CSV, à valider;
- rapprochement CPS : import source obligatoire, à spécifier.

### Lot 1 - Comptes, chèques et rapprochement

Statuts chèque proposés :

```text
created -> issued -> in_circulation -> cashed
                         -> cancelled
                         -> expired
```

Statuts rapprochement :

```text
imported -> matched -> exceptions_review -> validated -> archived
```

Règles :

- une anomalie rapprochée conserve les deux sources : livre et relevé;
- une correction comptable passe par une écriture de régularisation;
- aucun solde ne doit être recalculé côté front.

### Lot 1 - Budget et exécution budgétaire

Statuts exercice :

```text
preparation -> open -> adjustment -> locked -> closed
```

Statuts dossier :

```text
draft -> submitted -> under_review -> returned_for_completion
                         -> verified -> approved -> archived
                         -> rejected
```

Hypothèses :

- numéro de passage généré à chaque vérification;
- pièces obligatoires configurables par type de marché;
- délai moyen de traitement calculé entre date de réception et date de sortie.

### Lot 2 - Agences

Statuts agence :

```text
proposed -> approved -> open -> suspended -> closing -> closed
```

Règles :

- un codique fermé n'est pas réutilisé;
- fermeture avec motif obligatoire;
- transfert de portefeuille avant clôture;
- aucune suppression physique d'agence.

### Lot 2 - Caisses et journée

Cycle proposé :

```text
cashdesk_opened -> operations_recorded -> counting -> submitted
                 -> agency_chief_validated -> locked
                 -> rejected_for_correction
```

Règles :

- la validation journalière est réservée au Chef d'agence ou suppléant validé;
- après validation, les opérations ne sont plus modifiables;
- correction après verrouillage uniquement par contrepassation/régularisation;
- annulation d'opération possible uniquement le même jour et selon permission.

### Lot 2 - Demandes de valeurs, versements, rapatriements

Statuts :

```text
draft -> submitted -> approved -> prepared -> dispatched -> received -> reconciled
submitted -> rejected
```

Règles :

- chaque mouvement garde une agence source, une agence destination et un
  responsable;
- la réception doit être séparée de l'émission;
- le rapprochement vérifie montant, référence et justificatifs.

### Lot 2 - Vérification, déficit, excédent, AC

Statuts vérification :

```text
planned -> in_progress -> discrepancy_found -> regularized -> closed
```

Statuts accusé de crédit :

```text
draft -> verified -> issued -> sent -> archived
```

Hypothèses :

- déficit/excédent déclenche notification siège;
- AC produit depuis données validées uniquement;
- modèle AC officiel requis avant production.

## Journaux comptables proposés

Tous les journaux sont `proposed`.

| Code | Journal | Modules |
|---|---|---|
| `JPLC` | Journal des placements | Placements |
| `JINT` | Journal des intérêts | Placements, épargne |
| `JBAN` | Journal de banque | Comptes, rapprochements |
| `JCCP` | Journal CCP | Comptes courants / CCP |
| `JCAI` | Journal de caisse | Caisses |
| `JREC` | Journal des recettes | Ventes, services, transferts |
| `JDEP` | Journal des dépenses | Paiements, mandats |
| `JCRE` | Journal des créances | Facturation, recouvrement |
| `JTRF` | Journal des transferts internes | Inter-agences, banque-caisse |
| `JVP` | Journal des valeurs postales | Stock VP |
| `JAV` | Journal des avances | Régies/avances |
| `JREG` | Journal de régularisation | Corrections |
| `JANN` | Journal d'annulation | Contrepassations |

## Schémas comptables candidats

Les schémas utilisent des familles PCOP. Les comptes exacts sont à valider.

| Opération | Débit candidat | Crédit candidat | Statut |
|---|---|---|---|
| Ouverture placement | `50` ou compte placement validé | `51` banque/CCP | À valider |
| Intérêts courus à recevoir | `41/46` créance intérêts | `76` produits financiers | À valider |
| Encaissement intérêts | `51/53` banque/caisse | `41/46` créance intérêts | À valider |
| Rapatriement principal | `51` banque/CCP | `50` placement | À valider |
| Vente service courrier | `53/51` caisse/banque | `77` recette non fiscale/service | À valider |
| Vente à crédit | `41` client/redevable | `77` recette non fiscale/service | À valider |
| Encaissement créance | `53/51` caisse/banque | `41` client/redevable | À valider |
| Transfert caisse vers banque | `58` virement interne puis `51` | `53` puis `58` | À valider |
| Avance fonds caisse | `54` régie/avance | `51` banque/Trésor | À valider |
| Reversement reliquat avance | `51` banque/Trésor | `54` régie/avance | À valider |
| Ecart en attente | `47` compte d'attente | `53/51` selon cas | À valider |
| Régularisation écart | compte définitif validé | `47` compte d'attente | À valider |

Contraintes techniques :

```text
posting_allowed(entry):
  require entry.status == submitted
  require entry.rule_template.status == validated
  require period.status == open
  require debit_total == credit_total
  require all accounts.status == validated
  require actor has accounting:entry:post
  audit before/after
```

## Matrice RBAC proposée

Statut : `Hypothèse KCI à valider`.

Abréviations : C créer, L lire, M modifier, V valider, A annuler, P poster,
X exporter, R rapprocher.

| Profil | Institutions | Placements | Factures/créances | Comptes/rapprochement | Budget | Agences | Caisses | Produits/services | Comptabilité | Audit |
|---|---|---|---|---|---|---|---|---|---|---|
| Administrateur système | L | L | L | L | L | L | L | L | L | L |
| Paramétreur | C/L/M | L | L | L | L | C/L/M | C/L/M | C/L/M | C/L/M | - |
| Agent Trésorerie | L | C/L/M | C/L/M | C/L | C/L | - | - | - | - | - |
| Responsable Trésorerie | L | L/V/A | L/V/A | L/R/V | L/V | - | - | - | - | L |
| Comptable | L | L | L/R | L/R | L | L | L/R | L | C/L/M/P | L |
| Responsable Budget | - | - | - | - | C/L/M/V | - | - | - | - | L |
| Agent guichet | - | - | - | - | - | L | C/L/M | L | - | - |
| Caissier | - | - | - | - | - | L | C/L/M/A même jour | L | - | - |
| Chef d'agence | - | - | L | L | - | L | L/V | L | - | L agence |
| Vérificateur | L | L | L/R | L/R | L/R | L | L/R | L | L | L |
| Comptable siège | L | L | L/R | L/R/V | L | L | L/R/V | L | C/L/M/P | L |
| Responsable régional | L | L | L | L | - | L/V périmètre | L/V périmètre | L | L | L périmètre |
| Auditeur | L | L | L | L | L | L | L | L | L | L |
| Consultation | L | L | L | L | L | L | L | L | - | - |

Règles transverses :

- refus par défaut;
- permission backend obligatoire;
- séparation création / validation / vérification / audit;
- aucun utilisateur ne peut attribuer plus que ses propres droits;
- actions sensibles auditées;
- profils avec pouvoir soumis à 2FA si PAOMA confirme.

## Données et tables à créer

### Référentiels

```text
reference_agencies(id, code, name, region, zone, parent_organ_id, status, ...)
reference_counters(id, agency_id, code, label, status, ...)
reference_cashdesks(id, counter_id, code, label, status, ...)
reference_identity_document_types(id, code, label, category, status, ...)
reference_products(id, code, label, family, status, ...)
reference_tariff_rules(id, product_id, valid_from, valid_to, status, ...)
```

### Opérations

```text
cashdesk_sessions(id, cashdesk_id, opened_by, opened_at, status, ...)
cash_movements(id, session_id, product_id, amount, payment_mode, status, ...)
agency_wallets(id, agency_id, currency, postal_value_type_id, balance, status)
value_requests(id, source_agency_id, target_agency_id, amount, status, ...)
attachments(id, object_type, object_id, document_type_id, storage_key, ...)
daily_validations(id, agency_id, business_date, status, validated_by, ...)
verification_cases(id, agency_id, period, status, ...)
credit_acknowledgements(id, agency_id, period, status, ...)
```

### Comptabilité

```text
accounting_references(...)
chart_of_accounts(...)
accounting_journals(...)
accounting_rule_templates(...)
accounting_periods(...)
accounting_entries(...)
accounting_entry_lines(...)
```

## Identifiant unique de transaction

Format proposé :

```text
[LOT]-[MODULE]-[TYPE]-[YYYYMMDDHHMMSS]-[ENTITE]-[SEQUENCE]
```

Exemples techniques :

```text
L1-PLC-OUV-20260625143000-TRES-000001
L2-CAI-REC-20260625143210-AG001-000001
```

Règles :

- horodatage serveur;
- séquence PostgreSQL atomique;
- non-réutilisation après annulation;
- unicité globale;
- conservation dans l'audit;
- format final à valider par PAOMA.

## Rapports et exports

Tous les modèles sont à valider.

### Lot 1

- situation des placements;
- échéancier;
- historique des placements;
- journal des placements;
- états mensuels et trimestriels;
- facture récapitulative;
- facture définitive;
- situation des créances;
- état des virements;
- état de rapprochement bancaire;
- état des mandats;
- état des paiements;
- budget par direction/programme/compte;
- exécution budgétaire.

### Lot 2

- liste des opérations caisse;
- registre recettes/dépenses;
- encaisse jour/période/agence;
- évolution numéraire;
- tickets de caisse;
- fiche de levée;
- situation des envois;
- produits par période/agence;
- validation journée;
- situation des créances;
- avances autorisées;
- demandes/versements/rapatriements;
- stock valeurs postales;
- accusé de crédit;
- comptabilité mensuelle d'agence.

Marquage obligatoire tant que non validé :

```text
DÉMO — NON CONTRACTUEL — MODÈLE À VALIDER PAR PAOMA
```

## Hypothèses à soumettre à PAOMA

| Sujet | Hypothèse proposée | Risque sans validation |
|---|---|---|
| Agences | Import officiel PAOMA, statut initial `proposed` | Codiques faux ou incomplets |
| Caisses | 1 à n caisses par agence, lifecycle ouvert/veille/fermé | Encaisse et validation faux |
| Pièces | CIN, passeport, photo, justificatif domicile, G59, G60 | Rejet documentaire |
| Produits | Liste officielle Paositra comme base de cadrage | Tarifs ou produits obsolètes |
| Intérêts | actual/365 par défaut de simulation | Calcul financier contestable |
| Relance créance | 15 jours après échéance | Recouvrement non conforme |
| Clôture journée | Chef d'agence valide et verrouille | Modification après validation |
| Comptes PCOP | Classes 4/5/6/7 comme familles candidates | Imputation non conforme |
| Journaux | Journaux spécialisés par famille opérationnelle | Journalisation incohérente |
| Rapports | CSV/XLSX/PDF selon profil | Modèles rejetés |
| Identifiant | Format lot-module-type-date-entité-séquence | Traçabilité contestable |
| RBAC | Refus par défaut, séparation des fonctions | Fraude ou blocage opérationnel |

## Critères pour passer en développement final

1. Référentiel agences/codiques validé.
2. Référentiel guichets/caisses validé.
3. Référentiel produits/services et tarifs validé.
4. Référentiel pièces et conservation validé.
5. Matrice RBAC contractuelle validée.
6. Workflows et statuts validés par module.
7. Comptes PCOP ou procédure comptable PAOMA validés.
8. Journaux et schémas d'écriture validés.
9. Modèles rapports/factures/tickets/AC/G59/G60 validés.
10. Règles SSO, 2FA, sessions et audit validées.
11. RPO/RTO, cloud, sauvegarde et PRA/PCA validés.
12. Jeux de tests métier fournis par PAOMA.

## Règle de mise en oeuvre

Tant qu'un élément est `proposed`, le logiciel peut :

- l'afficher comme proposition;
- l'utiliser dans une simulation;
- l'exporter avec marquage non contractuel;
- le soumettre à validation.

Il ne doit pas :

- poster d'écriture réelle;
- produire un solde officiel;
- générer un document contractuel;
- activer un workflow définitif;
- masquer l'absence de validation.
