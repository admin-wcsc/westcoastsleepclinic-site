/* ---------------------------------------------------------------------------
   WCSC LOCAL DEV SERVER  —  an Azure "stand-in" for local development.

   WHY THIS EXISTS:
   registration.html and provider-referral.html used to POST straight to a
   Power Automate HTTP-trigger URL. That URL was never filled in, so nothing
   was actually being received anywhere. The real architecture is:

       Browser  ->  Azure Blob Storage  ->  Power Automate (blob-created trigger)

   Power Automate isn't built yet, so for now the browser talks to THIS
   server instead, which drops each submission into /data/submissions on
   disk exactly like a Blob container would receive it. When the Azure
   Storage account exists, only storage-client.js needs to change — the
   forms themselves don't.

   IMPORTANT: This is a DEV SIMULATION only. It is NOT secure and NOT
   HIPAA-compliant. Do not put real patient health information into it.
--------------------------------------------------------------------------- */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const DATA_DIR       = path.join(__dirname, 'data');
const SUBMISSIONS_DIR = path.join(DATA_DIR, 'submissions'); // like a Blob container
const AUDIT_FILE     = path.join(DATA_DIR, 'audit.log');    // like an Application Insights log stream

const SUBMISSION_TYPES = ['registration', 'referral'];

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBMISSIONS_DIR)) fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '');
}

function appendAudit(record) {
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(record) + '\n');
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJSON(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

// Without these headers the browser blocks the request. In production,
// Azure handles this with configured allowed origins instead of "*".
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve) => {
    let chunks = '';
    req.on('data', (c) => (chunks += c));
    req.on('end', () => resolve(chunks));
  });
}

function sendJSON(res, status, obj) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Stop weird filenames (e.g. "../../server.js") from escaping the files folder.
function safeFileName(name) {
  return path.basename(String(name || '')).replace(/[^A-Za-z0-9._-]/g, '_');
}

// If a file with this name already exists in the target folder (e.g. two
// referral batches both included "referral.pdf"), append -2, -3, etc.
// instead of silently overwriting the earlier one.
function uniqueFileName(dir, name) {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let i = 2;
  let candidate;
  do {
    candidate = base + '-' + i + ext;
    i++;
  } while (fs.existsSync(path.join(dir, candidate)));
  return candidate;
}

function normalizeName(v) {
  return String(v || '').trim().toLowerCase();
}
function normalizeDob(v) {
  return String(v || '').trim();
}

// registration.html and provider-referral.html use different field names
// for the same three identity fields, so both are checked when matching a
// referral against a patient who may already exist in storage (either from
// their own registration, or a prior referral from another office).
function findMatchingPatientRecord(firstName, lastName, dob) {
  const fn = normalizeName(firstName);
  const ln = normalizeName(lastName);
  const db = normalizeDob(dob);
  if (!fn || !ln || !db) return null;

  for (const type of SUBMISSION_TYPES) {
    const typeDir = path.join(SUBMISSIONS_DIR, type);
    if (!fs.existsSync(typeDir)) continue;
    for (const id of fs.readdirSync(typeDir)) {
      const record = readJSON(path.join(typeDir, id, 'record.json'), null);
      if (!record || !record.data) continue;
      const d = record.data;
      const rf = type === 'registration' ? d.first_name : d.patient_first_name;
      const rl = type === 'registration' ? d.last_name : d.patient_last_name;
      const rdob = type === 'registration' ? d.date_of_birth : d.patient_dob;
      if (normalizeName(rf) === fn && normalizeName(rl) === ln && normalizeDob(rdob) === db) {
        return { type: type, id: id, dir: path.join(typeDir, id) };
      }
    }
  }
  return null;
}

ensureStorage();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  const startedAt = Date.now();
  res.on('finish', () => {
    appendAudit({
      kind: 'request',
      ts: Date.now(),
      method: req.method,
      route: route,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  try {
    // ---------------- SUBMISSIONS (registration / referral intake) ----------------
    // A patient (or referring office) fills out a form, optionally attaches
    // documents, and the whole thing is dropped into storage as one unit —
    // this is the moment that will trigger Power Automate once it's built.
    const submissionsMatch = route.match(/^\/submissions\/([^/]+)$/);

    // GET /submissions/<type> -> list summaries, handy for manually
    // confirming a submission landed during testing.
    if (submissionsMatch && req.method === 'GET') {
      const type = submissionsMatch[1];
      if (SUBMISSION_TYPES.indexOf(type) === -1) {
        return sendJSON(res, 404, { error: 'Unknown submission type: ' + type });
      }
      const typeDir = path.join(SUBMISSIONS_DIR, type);
      if (!fs.existsSync(typeDir)) return sendJSON(res, 200, []);
      const summaries = fs.readdirSync(typeDir).map((id) => {
        const record = readJSON(path.join(typeDir, id, 'record.json'), {});
        const filesDir = path.join(typeDir, id, 'files');
        const fileCount = fs.existsSync(filesDir) ? fs.readdirSync(filesDir).length : 0;
        return { id: id, submittedAt: record.submittedAt, fileCount: fileCount };
      });
      return sendJSON(res, 200, summaries);
    }

    // POST /submissions/<type> -> write the form data + any attached files
    // into one new folder, like a package dropped into a Blob container.
    if (submissionsMatch && req.method === 'POST') {
      const type = submissionsMatch[1];
      if (SUBMISSION_TYPES.indexOf(type) === -1) {
        return sendJSON(res, 404, { error: 'Unknown submission type: ' + type });
      }
      const body = await readBody(req);
      const { data, files } = JSON.parse(body);

      // A submission for a patient who already exists in storage (from
      // their own registration, or a referral from another office) gets
      // folded into that existing record instead of creating a
      // disconnected one — checked for both registration and referral
      // submissions, just keyed off each form's own field names.
      const match = type === 'registration'
        ? findMatchingPatientRecord(data && data.first_name, data && data.last_name, data && data.date_of_birth)
        : findMatchingPatientRecord(data && data.patient_first_name, data && data.patient_last_name, data && data.patient_dob);

      if (match && type === 'referral') {
        const filesDir = path.join(match.dir, 'files');
        fs.mkdirSync(filesDir, { recursive: true });
        (files || []).forEach((f) => {
          const name = uniqueFileName(filesDir, safeFileName(f.name));
          const buffer = Buffer.from(f.base64, 'base64');
          fs.writeFileSync(path.join(filesDir, name), buffer);
        });

        const matchedRecord = readJSON(path.join(match.dir, 'record.json'), {});
        matchedRecord.referralHistory = matchedRecord.referralHistory || [];
        matchedRecord.referralHistory.push({
          submittedAt: Date.now(),
          source: (data && data.source) || 'referral',
          fileCount: (files || []).length,
          data: data || {}
        });
        writeJSON(path.join(match.dir, 'record.json'), matchedRecord);

        appendAudit({ kind: 'event', ts: Date.now(), type: 'referral_merged', details: { mergedIntoType: match.type, mergedIntoId: match.id, fileCount: (files || []).length } });
        return sendJSON(res, 200, { ok: true, id: match.id, merged: true, mergedIntoType: match.type });
      }

      if (match && type === 'registration') {
        // If the match was a referral-only record, this registration is
        // the patient's first full intake — the record graduates from
        // "referral" to "registration" and is physically relocated so its
        // folder location matches its new type (otherwise it would sit in
        // referral/ while claiming to be a registration, confusing the
        // GET listing above).
        let targetDir = match.dir;
        if (match.type === 'referral') {
          // Copy-then-delete rather than fs.renameSync: this folder lives
          // inside a OneDrive-synced directory, and OneDrive's sync client
          // intermittently locks folders against atomic renames (EPERM),
          // even though plain copy/delete work fine.
          targetDir = path.join(SUBMISSIONS_DIR, 'registration', match.id);
          fs.cpSync(match.dir, targetDir, { recursive: true });
          fs.rmSync(match.dir, { recursive: true, force: true });
        }

        const filesDir = path.join(targetDir, 'files');
        fs.mkdirSync(filesDir, { recursive: true });
        (files || []).forEach((f) => {
          const name = uniqueFileName(filesDir, safeFileName(f.name));
          const buffer = Buffer.from(f.base64, 'base64');
          fs.writeFileSync(path.join(filesDir, name), buffer);
        });

        const matchedRecord = readJSON(path.join(targetDir, 'record.json'), {});
        if (match.type === 'registration') {
          // A second full registration for the same patient — keep the
          // previous version instead of silently discarding it.
          matchedRecord.registrationHistory = matchedRecord.registrationHistory || [];
          matchedRecord.registrationHistory.push({ replacedAt: Date.now(), data: matchedRecord.data || {} });
        } else if (match.type === 'referral') {
          // A referral-only record's `data` holds the referral's own
          // fields directly (it was the first submission for this
          // patient, so no referralHistory array exists yet) — preserve
          // it as history before this registration's data takes over.
          matchedRecord.referralHistory = matchedRecord.referralHistory || [];
          matchedRecord.referralHistory.unshift({
            submittedAt: matchedRecord.submittedAt,
            source: (matchedRecord.data && matchedRecord.data.source) || 'referral',
            fileCount: (matchedRecord.data && matchedRecord.data.file_count) || 0,
            data: matchedRecord.data || {}
          });
        }
        matchedRecord.type = 'registration';
        matchedRecord.data = data || {};
        writeJSON(path.join(targetDir, 'record.json'), matchedRecord);

        appendAudit({ kind: 'event', ts: Date.now(), type: 'registration_merged', details: { mergedIntoType: match.type, mergedIntoId: match.id, fileCount: (files || []).length } });
        return sendJSON(res, 200, { ok: true, id: match.id, merged: true, mergedIntoType: match.type });
      }

      const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const dir = path.join(SUBMISSIONS_DIR, type, id);
      const filesDir = path.join(dir, 'files');
      fs.mkdirSync(filesDir, { recursive: true });

      const record = { id: id, type: type, submittedAt: Date.now(), data: data || {} };
      writeJSON(path.join(dir, 'record.json'), record);

      (files || []).forEach((f) => {
        const name = safeFileName(f.name);
        const buffer = Buffer.from(f.base64, 'base64');
        fs.writeFileSync(path.join(filesDir, name), buffer);
      });

      appendAudit({ kind: 'event', ts: Date.now(), type: 'submission_created', details: { type: type, id: id, fileCount: (files || []).length } });
      return sendJSON(res, 200, { ok: true, id: id, merged: false });
    }

    return sendJSON(res, 404, { error: 'Unknown route: ' + req.method + ' ' + route });
  } catch (err) {
    return sendJSON(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log('WCSC local dev server running at http://localhost:' + PORT);
  console.log('Data folder: ' + DATA_DIR);
  console.log('Stop it anytime with Ctrl+C.');
});
