const { app } = require('@azure/functions');
const { BlobServiceClient, BlobSASPermissions } = require('@azure/storage-blob');

const CONTAINER_NAME = 'submissions';
const SUBMISSION_TYPES = ['registration', 'referral'];

let cachedContainerClient = null;
function getContainerClient() {
  if (!cachedContainerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AzureStorageConnectionString);
    cachedContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  }
  return cachedContainerClient;
}

function normalizeName(v) {
  return String(v || '').trim().toLowerCase();
}
function normalizeDob(v) {
  return String(v || '').trim();
}

// Stop weird filenames from escaping the intended blob path.
function safeFileName(name) {
  return String(name || '').replace(/[\\/]/g, '_').replace(/[^A-Za-z0-9._-]/g, '_') || 'file';
}

async function blobExists(containerClient, blobName) {
  return containerClient.getBlockBlobClient(blobName).exists();
}

// If a blob with this name already exists (e.g. two referral batches both
// included "referral.pdf"), append -2, -3, etc. instead of overwriting.
async function uniqueBlobName(containerClient, filesPrefix, name) {
  if (!(await blobExists(containerClient, filesPrefix + name))) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot);
  const base = dot === -1 ? name : name.slice(0, dot);
  let i = 2, candidate;
  do {
    candidate = base + '-' + i + ext;
    i++;
  } while (await blobExists(containerClient, filesPrefix + candidate));
  return candidate;
}

async function readRecordBlob(containerClient, blobName) {
  try {
    const buffer = await containerClient.getBlockBlobClient(blobName).downloadToBuffer();
    return JSON.parse(buffer.toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function writeRecordBlob(containerClient, blobName, value) {
  const content = JSON.stringify(value, null, 2);
  await containerClient.getBlockBlobClient(blobName).upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: 'application/json' }
  });
}

// Blob names are flat keys with no real "folders" — listBlobsByHierarchy
// with a '/' delimiter gives us the virtual subfolder names (submission
// IDs) the same way fs.readdirSync did for the local disk version.
async function listSubmissionIds(containerClient, type) {
  const ids = [];
  for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: type + '/' })) {
    if (item.kind === 'prefix') {
      const id = item.name.slice((type + '/').length).replace(/\/$/, '');
      if (id) ids.push(id);
    }
  }
  return ids;
}

// registration.html and provider-referral.html use different field names
// for the same three identity fields, so both are checked when matching a
// submission against a patient who may already exist in storage (either
// from their own registration, or a prior referral from another office).
async function findMatchingPatientRecord(containerClient, firstName, lastName, dob) {
  const fn = normalizeName(firstName);
  const ln = normalizeName(lastName);
  const db = normalizeDob(dob);
  if (!fn || !ln || !db) return null;

  for (const type of SUBMISSION_TYPES) {
    const ids = await listSubmissionIds(containerClient, type);
    for (const id of ids) {
      const record = await readRecordBlob(containerClient, `${type}/${id}/record.json`);
      if (!record || !record.data) continue;
      const d = record.data;
      const rf = type === 'registration' ? d.first_name : d.patient_first_name;
      const rl = type === 'registration' ? d.last_name : d.patient_last_name;
      const rdob = type === 'registration' ? d.date_of_birth : d.patient_dob;
      if (normalizeName(rf) === fn && normalizeName(rl) === ln && normalizeDob(rdob) === db) {
        return { type, id, prefix: `${type}/${id}/` };
      }
    }
  }
  return null;
}

// Blob Storage has no atomic "rename a folder" operation (blob names are
// flat keys, not real paths) — copying every blob under the old prefix to
// the new prefix, then deleting the originals, is the actual native way to
// do this. This happens to be the same copy-then-delete pattern server.js
// already used locally (there, as a workaround for OneDrive locking
// fs.renameSync; here, because Blob Storage simply has no rename at all).
async function movePrefix(containerClient, oldPrefix, newPrefix) {
  const toDelete = [];
  // syncCopyFromURL needs the *source* URL to independently prove access —
  // being authenticated on the destination client isn't enough, even within
  // the same account — so each source blob gets a short-lived, read-only
  // SAS token appended just for the moment of the copy.
  const sasExpiresOn = new Date(Date.now() + 5 * 60 * 1000);
  for await (const blob of containerClient.listBlobsFlat({ prefix: oldPrefix })) {
    const suffix = blob.name.slice(oldPrefix.length);
    const sourceClient = containerClient.getBlockBlobClient(blob.name);
    const destClient = containerClient.getBlockBlobClient(newPrefix + suffix);
    const sourceSasUrl = await sourceClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: sasExpiresOn
    });
    await destClient.syncCopyFromURL(sourceSasUrl);
    toDelete.push(blob.name);
  }
  for (const name of toDelete) {
    await containerClient.getBlockBlobClient(name).deleteIfExists();
  }
}

// Append Blob — purpose-built for exactly this append-only log pattern,
// avoids the read-modify-write race a normal block blob would have if two
// requests logged at the same instant. Audit logging is best-effort and
// never fails a real submission.
async function appendAudit(containerClient, record) {
  try {
    const appendBlobClient = containerClient.getAppendBlobClient('audit.log');
    await appendBlobClient.createIfNotExists();
    const line = JSON.stringify(record) + '\n';
    await appendBlobClient.appendBlock(line, Buffer.byteLength(line));
  } catch (e) {
    // best-effort only
  }
}

const DRCHRONO_TIMEOUT_MS = 5000; // don't let a hung DrChrono call leave the patient staring at a spinner indefinitely
// Overridable only so the DrChrono-outage fallback path can be exercised in
// a live environment without touching real tokens/credentials — point this
// at an unreachable host temporarily, then unset it.
const DRCHRONO_BASE_URL = process.env.DrChronoApiBaseUrl || 'https://app.drchrono.com';

function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (d) => chunks.push(d));
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// DrChrono access tokens last 48 hours, and the refresh token can rotate
// every time it's used — so unlike AzureStorageConnectionString, these
// can't live in a static Application Setting. They live in Blob Storage
// instead, where the Function can both read and write them back.
async function getDrChronoAccessToken(containerClient) {
  const tokenBlobClient = containerClient.getBlockBlobClient('_drchrono/tokens.json');

  const dl = await tokenBlobClient.download();
  const buffer = await streamToBuffer(dl.readableStreamBody);
  const tokens = JSON.parse(buffer.toString('utf8'));
  const etag = dl.etag;

  const obtainedAt = new Date(tokens.obtained_at).getTime();
  const expiresAt = obtainedAt + tokens.expires_in * 1000 - 60000; // 60s safety margin
  if (Date.now() < expiresAt) {
    return tokens.access_token;
  }

  const refreshRes = await fetchWithTimeout(`${DRCHRONO_BASE_URL}/o/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: process.env.DrChronoClientId,
      client_secret: process.env.DrChronoClientSecret
    })
  }, DRCHRONO_TIMEOUT_MS);

  if (!refreshRes.ok) {
    throw new Error('DrChrono token refresh failed: ' + refreshRes.status);
  }
  const refreshed = await refreshRes.json();

  const newTokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    obtained_at: new Date().toISOString(),
    expires_in: refreshed.expires_in
  };
  const content = JSON.stringify(newTokens, null, 2);

  try {
    // Conditional write: only save if nobody else refreshed this blob
    // since we read it. Two near-simultaneous registrations could both
    // decide to refresh at once — this stops the second write from
    // silently clobbering the first.
    await tokenBlobClient.upload(content, Buffer.byteLength(content), { conditions: { ifMatch: etag } });
  } catch (err) {
    if (err.statusCode === 412) {
      const dl2 = await tokenBlobClient.download();
      const buffer2 = await streamToBuffer(dl2.readableStreamBody);
      return JSON.parse(buffer2.toString('utf8')).access_token;
    }
    throw err;
  }

  return newTokens.access_token;
}

// The authoritative "does this patient already exist" check — queries
// DrChrono directly rather than just our own transit storage, since a
// patient registered months ago (long since cleared out of our retention
// window) would otherwise look like a brand-new patient to us.
async function checkDrChronoForExistingPatient(containerClient, firstName, lastName, dob) {
  if (!firstName || !lastName || !dob) return false;
  const accessToken = await getDrChronoAccessToken(containerClient);

  const params = new URLSearchParams({ first_name: firstName, last_name: lastName, date_of_birth: dob });
  const res = await fetchWithTimeout(`${DRCHRONO_BASE_URL}/api/patients?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  }, DRCHRONO_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error('DrChrono patient search failed: ' + res.status);
  }
  const body = await res.json();
  return Array.isArray(body.results) && body.results.length > 0;
}

app.http('submissions', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'submissions/{type}',
  handler: async (request, context) => {
    const containerClient = getContainerClient();
    const type = request.params.type;
    const startedAt = Date.now();
    let status, jsonBody;

    try {
      if (SUBMISSION_TYPES.indexOf(type) === -1) {
        status = 404;
        jsonBody = { error: 'Unknown submission type: ' + type };
      } else if (request.method === 'POST') {
        const body = await request.json();
        const data = body && body.data;
        const files = (body && body.files) || [];

        // Registrations get checked against DrChrono first — the
        // authoritative "is this a real existing patient" answer, as
        // opposed to just checking our own transit storage. 'found' means
        // DrChrono confirms an existing patient; 'error' means the check
        // couldn't complete (DrChrono down/slow/erroring); 'clear' means
        // DrChrono confirmed no match; null means this isn't a
        // registration (referrals skip this entirely).
        let drchronoOutcome = null;
        if (type === 'registration') {
          try {
            const exists = await checkDrChronoForExistingPatient(containerClient, data && data.first_name, data && data.last_name, data && data.date_of_birth);
            drchronoOutcome = exists ? 'found' : 'clear';
          } catch (err) {
            context.error('DrChrono check failed:', err.message);
            drchronoOutcome = 'error';
          }
        }

        if (drchronoOutcome === 'found') {
          // Reuses the exact same merged/mergedIntoType signal the
          // registration-vs-registration match already returns, so
          // registration.html's existing "Registration Already on File"
          // page handles this with zero frontend changes. No blob gets
          // written — DrChrono is already the record that matters.
          await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_duplicate_detected', details: { firstName: data && data.first_name, lastName: data && data.last_name } });
          status = 200;
          jsonBody = { ok: true, merged: true, mergedIntoType: 'registration', source: 'drchrono' };
        } else if (drchronoOutcome === 'error') {
          // Can't verify against DrChrono right now — accept the
          // submission (a third-party outage shouldn't be able to block a
          // patient from registering) but route it to a review folder
          // instead of silently trusting or rejecting it.
          const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
          const prefix = `reviewregistration/${id}/`;
          const record = { id, type: 'reviewregistration', submittedAt: Date.now(), data: data || {} };
          await writeRecordBlob(containerClient, prefix + 'record.json', record);

          const filesPrefix = prefix + 'files/';
          for (const f of files) {
            const name = safeFileName(f.name);
            const buffer = Buffer.from(f.base64, 'base64');
            await containerClient.getBlockBlobClient(filesPrefix + name).upload(buffer, buffer.length);
          }

          await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'registration_needs_review', details: { id, fileCount: files.length, reason: 'drchrono_check_failed' } });
          status = 200;
          jsonBody = { ok: true, id, merged: false };
        } else {
          // A submission for a patient who already exists in storage (from
          // their own registration, or a referral from another office) gets
          // folded into that existing record instead of creating a
          // disconnected one — checked for both registration and referral
          // submissions, just keyed off each form's own field names.
          const match = type === 'registration'
            ? await findMatchingPatientRecord(containerClient, data && data.first_name, data && data.last_name, data && data.date_of_birth)
            : await findMatchingPatientRecord(containerClient, data && data.patient_first_name, data && data.patient_last_name, data && data.patient_dob);

          if (match && type === 'referral') {
            const filesPrefix = match.prefix + 'files/';
            for (const f of files) {
              const name = await uniqueBlobName(containerClient, filesPrefix, safeFileName(f.name));
              const buffer = Buffer.from(f.base64, 'base64');
              await containerClient.getBlockBlobClient(filesPrefix + name).upload(buffer, buffer.length);
            }

            const matchedRecord = (await readRecordBlob(containerClient, match.prefix + 'record.json')) || {};
            matchedRecord.referralHistory = matchedRecord.referralHistory || [];
            matchedRecord.referralHistory.push({
              submittedAt: Date.now(),
              source: (data && data.source) || 'referral',
              fileCount: files.length,
              data: data || {}
            });
            await writeRecordBlob(containerClient, match.prefix + 'record.json', matchedRecord);

            await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'referral_merged', details: { mergedIntoType: match.type, mergedIntoId: match.id, fileCount: files.length } });
            status = 200;
            jsonBody = { ok: true, id: match.id, merged: true, mergedIntoType: match.type };
          } else if (match && type === 'registration') {
            // If the match was a referral-only record, this registration is
            // the patient's first full intake — the record graduates from
            // "referral" to "registration" and is physically relocated so
            // its blob prefix matches its new type.
            let targetPrefix = match.prefix;
            if (match.type === 'referral') {
              targetPrefix = `registration/${match.id}/`;
              await movePrefix(containerClient, match.prefix, targetPrefix);
            }

            const filesPrefix = targetPrefix + 'files/';
            for (const f of files) {
              const name = await uniqueBlobName(containerClient, filesPrefix, safeFileName(f.name));
              const buffer = Buffer.from(f.base64, 'base64');
              await containerClient.getBlockBlobClient(filesPrefix + name).upload(buffer, buffer.length);
            }

            const matchedRecord = (await readRecordBlob(containerClient, targetPrefix + 'record.json')) || {};
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
            await writeRecordBlob(containerClient, targetPrefix + 'record.json', matchedRecord);

            await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'registration_merged', details: { mergedIntoType: match.type, mergedIntoId: match.id, fileCount: files.length } });
            status = 200;
            jsonBody = { ok: true, id: match.id, merged: true, mergedIntoType: match.type };
          } else {
            const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            const prefix = `${type}/${id}/`;

            const record = { id, type, submittedAt: Date.now(), data: data || {} };
            await writeRecordBlob(containerClient, prefix + 'record.json', record);

            const filesPrefix = prefix + 'files/';
            for (const f of files) {
              const name = safeFileName(f.name);
              const buffer = Buffer.from(f.base64, 'base64');
              await containerClient.getBlockBlobClient(filesPrefix + name).upload(buffer, buffer.length);
            }

            await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'submission_created', details: { type, id, fileCount: files.length } });
            status = 200;
            jsonBody = { ok: true, id, merged: false };
          }
        }
      } else {
        status = 404;
        jsonBody = { error: 'Unknown route: ' + request.method + ' /submissions/' + type };
      }
    } catch (err) {
      context.error(err);
      status = 500;
      jsonBody = { error: err.message };
    }

    await appendAudit(containerClient, {
      kind: 'request',
      ts: Date.now(),
      method: request.method,
      route: '/submissions/' + type,
      status,
      durationMs: Date.now() - startedAt
    });

    return { status, jsonBody };
  }
});
