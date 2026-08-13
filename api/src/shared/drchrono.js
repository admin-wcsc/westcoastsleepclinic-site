// ---------------- SHARED: BLOB CONTAINER, DRCHRONO OAUTH, AUDIT LOG ----------------
// Every DrChrono-aware function (submissions, availability, the webhook
// receiver, the resync timer) needs the identical OAuth-refresh dance and
// the same container/audit-log access, so it lives here once instead of
// N near-identical copies. Extracted from submissions.js — no behavior
// change, same functions, same logic, just importable from one place.
const { BlobServiceClient } = require('@azure/storage-blob');
const crypto = require('crypto');

const CONTAINER_NAME = 'submissions';

let cachedContainerClient = null;
function getContainerClient() {
  if (!cachedContainerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AzureStorageConnectionString);
    cachedContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  }
  return cachedContainerClient;
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

// Append Blob — purpose-built for exactly this append-only log pattern,
// avoids the read-modify-write race a normal block blob would have if two
// requests logged at the same instant. Audit logging is best-effort and
// never fails a real submission.
// Lives under _audit/ rather than the container root so the review-automation
// flow's Blob Storage trigger (which only sees root-level blobs, same reason
// _drchrono/ and _schedule/ are subfolders) never fires a redundant run for it.
async function appendAudit(containerClient, record) {
  try {
    const appendBlobClient = containerClient.getAppendBlobClient('_audit/audit.log');
    await appendBlobClient.createIfNotExists();
    const line = JSON.stringify(record) + '\n';
    await appendBlobClient.appendBlock(line, Buffer.byteLength(line));
  } catch (e) {
    // best-effort only
  }
}

// Constant-time string comparison -- shared by the webhook relay and the
// OAuth callback, both of which check an incoming value against a secret
// Application Setting and can't use a plain === (its short-circuit-on-
// first-mismatch timing would leak how many leading characters matched).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  CONTAINER_NAME,
  getContainerClient,
  DRCHRONO_TIMEOUT_MS,
  DRCHRONO_BASE_URL,
  streamToBuffer,
  fetchWithTimeout,
  getDrChronoAccessToken,
  appendAudit,
  safeEqual
};
