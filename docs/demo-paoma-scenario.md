# Scénario de démonstration PAOSITRA / PAOMA

> **Message à afficher avant la démo :**
> "Les agences, rôles, codiques, règles comptables et workflows affichés dans cette démonstration sont soit issus de sources publiques, soit proposés à titre de cadrage. Ils devront être validés officiellement par PAOMA avant toute utilisation en production."

---

## Prérequis

1. Docker Compose lancé (`docker-compose up`)
2. Migration 0007 appliquée
3. Un compte admin créé (`npm run bootstrap-admin --workspace=apps/api`)
4. `VITE_DEMO_MODE=true` dans `.env`

URLs :
- Lot 1 Trésorerie : http://localhost:5173
- Lot 2 Opérations : http://localhost:5174
- API : http://localhost:3000

---

## Scénario pas-à-pas

### Acte 1 — Architecture et sécurité (5 min)

1. Montrer la page de connexion (JWT, `mustChangePassword`)
2. Se connecter avec le compte admin
3. Aller dans l'onglet **Audit** — montrer la piste d'audit immuable
4. Point clé : "Toute action est tracée, horodatée, inaltérable"

### Acte 2 — Lot 1 Trésorerie (10 min)

1. Onglet **Institutions** — créer une institution financière de test
2. Onglet **Placements** — créer un placement (institution, montant, taux, durée)
3. Montrer le placement dans la liste avec ses données
4. Onglet **Rôles & habilitations** — montrer les 11 rôles Lot 1 (common + lot1)
   - Insister : "Proposition KCI — badge orange sur chaque rôle"
5. Onglet **Points à clarifier** — montrer 10 sections avec les blocages identifiés
   - Insister : "Nous transformons les blocages en questions structurées pour PAOMA"

### Acte 3 — Lot 2 Opérations (15 min)

1. Onglet **Agences** — montrer le formulaire d'ouverture d'agence connecté à l'API
2. Onglet **Référentiel agences** :
   - Montrer les compteurs par source (orange = démo, vert = validé)
   - Filtrer par `demo_only` → 14 agences de démonstration
   - Expliquer les badges source : "Aucune donnée n'est présentée comme officielle sans l'être"
   - Montrer le bouton Export CSV
3. Onglet **Rôles & habilitations** — montrer les 19 rôles (tous lots)
4. Onglet **Points à clarifier** — montrer les 13 sections

### Acte 4 — Transparence et prochaines étapes (5 min)

1. Revenir sur le bannière "MODE PRÉSENTATION"
2. Expliquer le système `source_type` : "Chaque donnée indique son origine"
3. Montrer `data/reference/paoma/agencies.template.csv` : "Ce template attend vos données officielles"
4. Conclure : "Tout est prêt à recevoir les données PAOMA — rien n'est inventé"

---

## Points de force à mettre en avant

- **Honnêteté** : badges source sur chaque donnée
- **Traçabilité** : audit immuable, idempotence, versioning optimiste
- **Sécurité** : RBAC default-deny, JWT scoped, bcrypt
- **Préparation** : template CSV pour import PAOMA, workflow de validation prêt
- **Transparence** : sections "Points à clarifier" documentent les blocages

---

## Questions fréquentes anticipées

**Q : Les agences affichées sont-elles réelles ?**
R : Non. Elles sont marquées `demo_only` et portent un badge orange "Démonstration". Le template est prêt pour recevoir vos données officielles.

**Q : Les rôles sont-ils contractuels ?**
R : Non. Tous portent le badge "Proposition à valider". La matrice contractuelle doit être fournie par PAOMA.

**Q : Le référentiel comptable est-il conforme ?**
R : PCOP 2006 est utilisé comme cadrage provisoire. La confirmation du référentiel applicable est dans la liste des points à clarifier.
