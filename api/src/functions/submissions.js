const { app } = require('@azure/functions');
const { BlobSASPermissions } = require('@azure/storage-blob');
const { getContainerClient, fetchWithTimeout, getDrChronoAccessToken, appendAudit, DRCHRONO_BASE_URL, DRCHRONO_TIMEOUT_MS } = require('../shared/drchrono');

const SUBMISSION_TYPES = ['registration', 'referral'];

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

// Power Automate's Blob Storage trigger can't see blobs added inside a
// subfolder (registration/{id}/record.json is two levels deep) — confirmed
// against Microsoft's own connector docs and a live test. This flat marker
// blob (no folder prefix) is what the review-automation flow's trigger
// actually watches; it holds only the id (no patient data), so the flow
// does a second, deliberate fetch of the real record rather than a second
// copy of PII sitting in the container root.
async function writeRegistrationReviewMarker(containerClient, id) {
  const content = JSON.stringify({ id, type: 'registration' });
  await containerClient.getBlockBlobClient(`registration-review-${id}.json`).upload(content, Buffer.byteLength(content), {
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

// Registrations get checked against DrChrono first, ahead of everything
// else below — the authoritative "is this a real existing patient" answer,
// as opposed to just checking our own transit storage. Returns 'found'
// (DrChrono confirms an existing patient), 'error' (the check could not
// complete — DrChrono down, slow, or erroring), 'clear' (DrChrono confirmed
// no match), or null (not a registration — referrals skip this entirely).
async function checkDrChronoOutcome(containerClient, context, type, data) {
  if (type !== 'registration') return null;
  try {
    const exists = await checkDrChronoForExistingPatient(containerClient, data && data.first_name, data && data.last_name, data && data.date_of_birth);
    return exists ? 'found' : 'clear';
  } catch (err) {
    context.error('DrChrono check failed:', err.message);
    return 'error';
  }
}

// Reuses the exact same merged/mergedIntoType signal the registration-vs-
// registration match already returns, so registration.html's existing
// "Registration Already on File" page handles this with zero frontend
// changes. No blob gets written — DrChrono is already the record that
// matters.
async function handleDrChronoDuplicate(containerClient, data) {
  await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_duplicate_detected', details: { firstName: data && data.first_name, lastName: data && data.last_name } });
  return { status: 200, jsonBody: { ok: true, merged: true, mergedIntoType: 'registration', source: 'drchrono' } };
}

// Cannot verify against DrChrono right now — accept the submission (a
// third-party outage should not be able to block a patient from
// registering) but route it to a review folder instead of silently
// trusting or rejecting it.
async function handleDrChronoUnavailable(containerClient, data, files) {
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
  return { status: 200, jsonBody: { ok: true, id, merged: false } };
}

// A submission for a patient who already exists in storage (from their own
// registration, or a referral from another office) gets folded into that
// existing record instead of creating a disconnected one — checked for both
// registration and referral submissions, just keyed off each form's own
// field names.
async function findExistingRecord(containerClient, type, data) {
  return type === 'registration'
    ? findMatchingPatientRecord(containerClient, data && data.first_name, data && data.last_name, data && data.date_of_birth)
    : findMatchingPatientRecord(containerClient, data && data.patient_first_name, data && data.patient_last_name, data && data.patient_dob);
}

async function mergeReferralIntoRecord(containerClient, match, data, files) {
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
  return { status: 200, jsonBody: { ok: true, id: match.id, merged: true, mergedIntoType: match.type } };
}

async function mergeRegistrationIntoRecord(containerClient, match, data, files) {
  // If the match was a referral-only record, this registration is the
  // patient's first full intake — the record graduates from "referral" to
  // "registration" and is physically relocated so its blob prefix matches
  // its new type.
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
    // A second full registration for the same patient — keep the previous
    // version instead of silently discarding it.
    matchedRecord.registrationHistory = matchedRecord.registrationHistory || [];
    matchedRecord.registrationHistory.push({ replacedAt: Date.now(), data: matchedRecord.data || {} });
  } else if (match.type === 'referral') {
    // A referral-only record's `data` holds the referral's own fields
    // directly (it was the first submission for this patient, so no
    // referralHistory array exists yet) — preserve it as history before
    // this registration's data takes over.
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
  await writeRegistrationReviewMarker(containerClient, match.id);

  await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'registration_merged', details: { mergedIntoType: match.type, mergedIntoId: match.id, fileCount: files.length } });
  return { status: 200, jsonBody: { ok: true, id: match.id, merged: true, mergedIntoType: match.type } };
}

async function createNewSubmission(containerClient, type, data, files) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const prefix = `${type}/${id}/`;

  const record = { id, type, submittedAt: Date.now(), data: data || {} };
  await writeRecordBlob(containerClient, prefix + 'record.json', record);
  if (type === 'registration') {
    await writeRegistrationReviewMarker(containerClient, id);
  }

  const filesPrefix = prefix + 'files/';
  for (const f of files) {
    const name = safeFileName(f.name);
    const buffer = Buffer.from(f.base64, 'base64');
    await containerClient.getBlockBlobClient(filesPrefix + name).upload(buffer, buffer.length);
  }

  await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'submission_created', details: { type, id, fileCount: files.length } });
  return { status: 200, jsonBody: { ok: true, id, merged: false } };
}

// The single dispatcher: figures out which of the outcomes above applies to
// this submission, and hands off to the function that handles it. Each
// handler below is responsible for its own blob writes and its own audit
// event — this function only decides which one runs.
async function handleSubmission(containerClient, context, type, data, files) {
  const drchronoOutcome = await checkDrChronoOutcome(containerClient, context, type, data);
  if (drchronoOutcome === 'found') return handleDrChronoDuplicate(containerClient, data);
  if (drchronoOutcome === 'error') return handleDrChronoUnavailable(containerClient, data, files);

  const match = await findExistingRecord(containerClient, type, data);
  if (match && type === 'referral') return mergeReferralIntoRecord(containerClient, match, data, files);
  if (match && type === 'registration') return mergeRegistrationIntoRecord(containerClient, match, data, files);
  return createNewSubmission(containerClient, type, data, files);
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
      let result;
      if (SUBMISSION_TYPES.indexOf(type) === -1) {
        result = { status: 404, jsonBody: { error: 'Unknown submission type: ' + type } };
      } else {
        const body = await request.json();
        const data = body && body.data;
        const files = (body && body.files) || [];
        result = await handleSubmission(containerClient, context, type, data, files);
      }
      status = result.status;
      jsonBody = result.jsonBody;
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
