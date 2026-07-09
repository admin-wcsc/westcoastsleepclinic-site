# westcoastsleepclinic-site

Static HTML/CSS/JS site deployed to Azure Static Web Apps. No build step.

## Local development (testing registration/referral submissions)

`registration.html` and `provider-referral.html` submit through
`storage-client.js` to `/api/submissions/<type>` — an Azure Static Web Apps
Managed Function (`api/`) that reads/writes real Azure Blob Storage directly.
There's no local storage stand-in anymore; local dev talks to the same real
Dev/Test Storage Account (`wcscdevstorage`) that the Function uses when
deployed.

One command, from the repo root:

```
npm start   # runs `swa start . --api-location api`
```

This serves the static site *and* runs the Function locally together,
proxied under one origin (`http://localhost:4280`) exactly like production
— open `http://localhost:4280/registration.html` or
`http://localhost:4280/provider-referral.html` in a browser.

`api/local.settings.json` (gitignored, never committed) holds the real
Storage Account connection string used for local runs — see whoever set up
this project for that value if you need to recreate it.

Submissions land in the `submissions` container as
`<registration|referral>/<id>/record.json` plus a `files/` prefix for any
attachments. Use the Azure Portal or Azure Storage Explorer to inspect them,
or the Azure CLI, e.g.:

```
az storage blob list --account-name wcscdevstorage --container-name submissions --auth-mode key -o table
```
