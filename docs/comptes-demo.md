# Comptes demo

Les mots de passe temporaires sont generes localement par `npm run demo:reset-users` et ne sont pas committes.

Commande locale :

```powershell
$env:DEMO_MODE="true"
$env:MIGRATION_DATABASE_URL="postgresql://paositra_owner:<mot-de-passe>@localhost:55432/paositra"
npm run demo:reset-users
```

| Usage | Login | Role demo | Statut |
|---|---|---|---|
| Administration demo | `demo.admin@paositra.local` | `DEMO_ADMIN_FONCTIONNEL` | `proposition a valider` |
| Lot 1 Tresorerie | `demo.tresorerie@paositra.local` | `DEMO_RESP_TRESORERIE` | `proposition a valider` |
| Lot 2 Operations | `demo.operations@paositra.local` | `DEMO_CHEF_AGENCE` | `proposition a valider` |
| Consultation Direction | `demo.dg@paositra.local` | `DEMO_CONSULTATION` | `proposition a valider` |
| Audit | `demo.audit@paositra.local` | `DEMO_AUDITEUR` | `proposition a valider` |

Ces comptes sont locaux et non contractuels. Ils doivent etre desactives ou remplaces avant tout environnement reel.
