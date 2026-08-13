# westcoastsleepclinic-site

Static HTML/CSS/JS site deployed to Azure Static Web Apps. No build step.

## Testing registration/referral submissions

There is no local dev server for this project — everything runs against the
real deployed Azure Static Web App. Push to the `dev` branch and test against
the `dev` environment (`ambitious-flower-02570ba0f-dev.eastus2.7.azurestaticapps.net`)
before anything reaches `main`/production.

`registration.html` and `provider-referral.html` submit through
`storage-client.js` to `/api/submissions/<type>` — an Azure Static Web Apps
Managed Function (`api/`) that reads/writes real Azure Blob Storage directly
(`wcscdevstorage` account, `submissions` container).

Submissions land in the `submissions` container as
`<registration|referral>/<id>/record.json` plus a `files/` prefix for any
attachments. Use the Azure Portal or Azure Storage Explorer to inspect them,
or the Azure CLI, e.g.:

```
az storage blob list --account-name wcscdevstorage --container-name submissions --auth-mode key -o table
```
