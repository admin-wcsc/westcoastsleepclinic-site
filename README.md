# westcoastsleepclinic-site

Static HTML/CSS/JS site deployed to Azure Static Web Apps. No build step.

## Local storage server (for testing registration/referral submissions)

`registration.html` and `provider-referral.html` submit through
`storage-client.js` to `server.js`, a small local Node server that stands in
for Azure Blob Storage during development (see the comments at the top of
`server.js`). Power Automate will later trigger off of that storage once
it's built; nothing here talks to Power Automate directly anymore.

Two terminals:

```
npm start                # terminal 1: starts server.js on :4000, leave running
npx serve . -l 8080      # terminal 2: serves the static site
```

Then open `http://localhost:8080/registration.html` or
`http://localhost:8080/provider-referral.html` in a browser (not `file://`
— the fetch calls need a real HTTP origin for CORS to behave correctly).

Submissions land in `data/submissions/<registration|referral>/<id>/`, each
with a `record.json` and a `files/` folder for any attachments. This `data/`
folder is gitignored and safe to delete anytime to reset to a clean slate.

Optionally, run `node audit-monitor.mjs` in a third terminal for a live feed
of activity as you test (tails `data/audit.log`).
