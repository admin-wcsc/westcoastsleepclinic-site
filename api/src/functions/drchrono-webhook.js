// ---------------- DRCHRONO WEBHOOK RECEIVER ----------------
// DrChrono pushes an event here whenever an appointment changes. Confirmed
// event names (from the real webhook config screen): APPOINTMENT_CREATE,
// APPOINTMENT_DELETE, APPOINTMENT_MODIFY -- all three should be checked in
// DrChrono's webhook setup. Deliberately does NOT trust the POST body's
// data fields for anything beyond locating an appointment ID -- always
// re-fetches ground truth from DrChrono before writing anything, so a
// forged POST can at worst trigger one extra DrChrono read, never corrupt
// the mirror.
//
// Auth: DrChrono's own webhook mechanism, not Azure's function-key system
// (authLevel stays 'anonymous' -- a function key can't work here, since
// DrChrono itself initiates the verification handshake below against
// whatever callback URL is configured, with no way to attach a ?code=).
//
// Two request shapes to handle, confirmed from DrChrono's docs:
//   GET  ?msg=<value>          -- one-time verification handshake, sent
//                                  when the webhook is first created or its
//                                  callback URL changes. Must respond with
//                                  { secret_token: HMAC-SHA256(secret, msg) }.
//   POST (real delivery)       -- headers include X-drchrono-event (which
//                                  event fired), X-drchrono-signature (the
//                                  webhook's secret token), X-drchrono-delivery
//                                  (a delivery ID). Every POST is checked
//                                  against DrChronoWebhookSecret before
//                                  anything else runs.
// NOTE: DrChrono's docs describe X-drchrono-signature simply as "the secret
// token associated with the webhook" (a direct match), not an HMAC of the
// payload the way the verification handshake works -- implemented as a
// direct compare below, but this should be double-checked against a real
// delivery (use the "Ping webhook" button once configured) before trusting
// it in production.
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getContainerClient, fetchWithTimeout, getDrChronoAccessToken, appendAudit, streamToBuffer, DRCHRONO_BASE_URL, DRCHRONO_TIMEOUT_MS } = require('../shared/drchrono');

const BUSY_BLOB = '_drchrono/busy-calendar.json';
const MAX_WRITE_ATTEMPTS = 3;

function splitScheduledTime(scheduledTime) {
  const m = String(scheduledTime || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : null;
}

// Payload shape for a real delivery is unconfirmed -- check the plausible
// places an ID could be; the appointment gets re-fetched from DrChrono
// regardless, so this only needs to find the ID, not trust anything else.
function extractAppointmentId(body) {
  if (!body || typeof body !== 'object') return null;
  const candidate = body.id || body.appointment_id || body.object_id || (body.data && body.data.id);
  return candidate ? String(candidate) : null;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function upsertBusyCalendarEntry(containerClient, appointmentId, entry) {
  const blobClient = containerClient.getBlockBlobClient(BUSY_BLOB);
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    let current, etag;
    try {
      const dl = await blobClient.download();
      const buffer = await streamToBuffer(dl.readableStreamBody);
      current = JSON.parse(buffer.toString('utf8'));
      etag = dl.etag;
    } catch (e) {
      current = { generatedAt: null, windowStart: null, windowEnd: null, appointments: {} };
      etag = undefined;
    }
    current.appointments = current.appointments || {};
    if (entry === null) {
      delete current.appointments[appointmentId];
    } else {
      current.appointments[appointmentId] = entry;
    }
    current.generatedAt = new Date().toISOString();
    const content = JSON.stringify(current, null, 2);
    try {
      await blobClient.upload(content, Buffer.byteLength(content), etag ? { conditions: { ifMatch: etag } } : {});
      return; // success
    } catch (err) {
      if (err.statusCode === 412 && attempt < MAX_WRITE_ATTEMPTS - 1) {
        continue; // someone else wrote concurrently -- re-read and reapply
      }
      throw err;
    }
  }
}

app.http('drchronoWebhook', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous', // real auth is DrChrono's own secret-token mechanism, checked below
  route: 'drchrono/webhook',
  handler: async (request, context) => {
    const secret = process.env.DrChronoWebhookSecret;
    if (!secret) {
      context.warn('drchrono-webhook: DrChronoWebhookSecret not configured, rejecting');
      return { status: 503, jsonBody: { error: 'Webhook not configured' } };
    }

    // One-time verification handshake.
    if (request.method === 'GET') {
      const msg = request.query.get('msg');
      if (!msg) {
        return { status: 400, jsonBody: { error: 'Missing msg' } };
      }
      const secretToken = crypto.createHmac('sha256', secret).update(msg).digest('hex');
      return { status: 200, jsonBody: { secret_token: secretToken } };
    }

    // Real delivery -- verify before doing anything else.
    const signature = request.headers.get('x-drchrono-signature');
    if (!safeEqual(signature, secret)) {
      context.warn('drchrono-webhook: signature mismatch, rejecting');
      return { status: 401, jsonBody: { error: 'Invalid signature' } };
    }

    const containerClient = getContainerClient();

    if (request.headers.get('x-drchrono-event') === 'PING') {
      return { status: 200, jsonBody: { ok: true } };
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }

    const appointmentId = extractAppointmentId(body);
    if (!appointmentId) {
      context.warn('drchrono-webhook: could not find an appointment ID in the payload, ignoring');
      return { status: 200, jsonBody: { ok: true, ignored: true } };
    }

    try {
      const accessToken = await getDrChronoAccessToken(containerClient);
      const res = await fetchWithTimeout(`${DRCHRONO_BASE_URL}/api/appointments/${encodeURIComponent(appointmentId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }, DRCHRONO_TIMEOUT_MS);

      if (res.status === 404) {
        // Deleted outright (not just cancelled) -- free up that time.
        await upsertBusyCalendarEntry(containerClient, appointmentId, null);
      } else if (res.ok) {
        const appt = await res.json();
        if (appt.status === 'Cancelled') {
          await upsertBusyCalendarEntry(containerClient, appointmentId, null);
        } else {
          const split = splitScheduledTime(appt.scheduled_time);
          if (split) {
            await upsertBusyCalendarEntry(containerClient, appointmentId, {
              date: split.date, startTime: split.time, durationMinutes: appt.duration
            });
          }
        }
      } else {
        throw new Error('DrChrono appointment fetch failed: ' + res.status);
      }

      await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_webhook_processed', details: { appointmentId } });
      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error('drchrono-webhook failed:', err.message);
      await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_webhook_failed', details: { appointmentId, error: err.message } });
      // Still 200: DrChrono treats non-2xx as delivery failure and retries
      // at +1h/+3h, but the 15-min resync run will already have fixed
      // this by then -- no need to make DrChrono hold a retry queue for it.
      return { status: 200, jsonBody: { ok: false } };
    }
  }
});
