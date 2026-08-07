// ---------------- DRCHRONO WEBHOOK RELAY ----------------
// DrChrono's own "Callback URL" field on its webhook setup form silently
// truncates to 200 characters (confirmed live, 2026-08-06) -- Power
// Automate's HTTP-trigger invoke URLs run ~296 chars because of the
// required `sig=` SAS token that authenticates the call, so DrChrono can
// never be pointed at a flow's HTTP-trigger URL directly. This short
// function is the URL DrChrono actually talks to.
//
// Originally this forwarded real deliveries on to a Power Automate flow's
// HTTP-trigger URL, but Azure Static Web Apps' managed-Functions layer
// rejected every such POST with a platform-level "401 MISE unauthorized"
// before this code even ran (GET requests on the same anonymous route were
// unaffected -- confirmed live, 2026-08-06/07, cause not identified despite
// isolating headers/payload/method). Rather than fight an undocumented
// platform block, this now uses the same blob-marker pattern already
// proven elsewhere in this solution (see the Patient Registration flow's
// `registration-review-{id}.json` markers): write a small marker blob at
// the `submissions` container root, and a Power Automate flow with a Blob
// Storage trigger (polling that root every minute, same as the
// registration flow) picks it up from there. No outbound call to Power
// Automate at all, so the MISE block never comes into play.
//
// Two jobs only:
//   GET  ?msg=<value>  -- DrChrono's one-time verification handshake (sent
//                          when the webhook is created or its URL changes).
//                          Power Automate's expression language has no HMAC
//                          function, so this function answers it directly:
//                          { secret_token: HMAC-SHA256(secret, msg) }.
//   POST (real delivery) -- verified against DrChronoAppointmentSyncSecret
//                          (X-drchrono-signature is a direct match against
//                          the secret, not an HMAC -- same as the retired
//                          drchrono-webhook.js), then written verbatim to
//                          `appointment-event-{deliveryId}.json` at the
//                          container root for the flow to pick up.
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getContainerClient } = require('../shared/drchrono');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

app.http('drchronoWebhookRelay', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous', // DrChrono initiates both request shapes itself, same as the retired drchrono-webhook.js
  route: 'drchrono/webhook-relay',
  handler: async (request, context) => {
    const secret = process.env.DrChronoAppointmentSyncSecret;
    if (!secret) {
      context.warn('drchrono-webhook-relay: DrChronoAppointmentSyncSecret not configured, rejecting');
      return { status: 503, jsonBody: { error: 'Webhook not configured' } };
    }

    if (request.method === 'GET') {
      const msg = request.query.get('msg');
      if (!msg) {
        return { status: 400, jsonBody: { error: 'Missing msg' } };
      }
      const secretToken = crypto.createHmac('sha256', secret).update(msg).digest('hex');
      return { status: 200, jsonBody: { secret_token: secretToken } };
    }

    const signature = request.headers.get('x-drchrono-signature');
    if (!safeEqual(signature, secret)) {
      context.warn('drchrono-webhook-relay: signature mismatch, rejecting');
      return { status: 401, jsonBody: { error: 'Invalid signature' } };
    }

    const bodyText = await request.text();
    const deliveryId = request.headers.get('x-drchrono-delivery') || crypto.randomUUID();
    const containerClient = getContainerClient();
    await containerClient.getBlockBlobClient(`appointment-event-${deliveryId}.json`).upload(
      bodyText,
      Buffer.byteLength(bodyText),
      { blobHTTPHeaders: { blobContentType: 'application/json' } }
    );

    return { status: 200, jsonBody: { ok: true } };
  }
});
