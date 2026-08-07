// ---------------- DRCHRONO WEBHOOK RELAY ----------------
// DrChrono's own "Callback URL" field on its webhook setup form silently
// truncates to 200 characters (confirmed live, 2026-08-06) -- Power
// Automate's HTTP-trigger invoke URLs run ~296 chars because of the
// required `sig=` SAS token that authenticates the call, so DrChrono can
// never be pointed at the flow's URL directly. This short function is the
// URL DrChrono actually talks to; it does the minimum possible and hands
// everything else to the "DrChrono Webhook Receiver" Power Automate flow,
// which owns all real business logic (event handling, re-fetching the
// appointment, writing the busy-calendar blob).
//
// Two jobs only:
//   GET  ?msg=<value>  -- DrChrono's one-time verification handshake (sent
//                          when the webhook is created or its URL changes).
//                          Power Automate's expression language has no HMAC
//                          function, so this function answers it directly:
//                          { secret_token: HMAC-SHA256(secret, msg) }.
//   POST (real delivery) -- forwarded through verbatim (method, headers,
//                          body) to the flow's trigger URL; the flow does
//                          its own X-drchrono-signature check against the
//                          same secret. This function does not verify
//                          anything on POST -- it's a dumb pipe, not a
//                          second place for auth logic to drift out of
//                          sync with the flow's.
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { fetchWithTimeout, DRCHRONO_TIMEOUT_MS } = require('../shared/drchrono');

const FLOW_TRIGGER_URL = 'https://default8c8d9562fb1749a092dabfc1691fab.08.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/05/workflows/1469ba1a99334de186aec8837411c0d5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=D_ZBprIFdyqTJVgXcknOoIzJdheirlEmp1F1WNzghuI';

const SKIP_FORWARD_HEADERS = new Set(['host', 'content-length', 'connection', 'transfer-encoding']);

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

    const bodyText = await request.text();
    const forwardHeaders = {};
    for (const [key, value] of request.headers) {
      if (!SKIP_FORWARD_HEADERS.has(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    try {
      const res = await fetchWithTimeout(FLOW_TRIGGER_URL, {
        method: 'POST',
        headers: forwardHeaders,
        body: bodyText
      }, DRCHRONO_TIMEOUT_MS);
      const resBodyText = await res.text();
      return {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
        body: resBodyText
      };
    } catch (err) {
      context.error('drchrono-webhook-relay: forward to flow failed:', err.message);
      // Still 200: matches drchrono-webhook.js's reasoning -- DrChrono treats
      // non-2xx as delivery failure and retries at +1h/+3h, but a missed
      // delivery here self-heals via the flow's own recurrence-triggered
      // resync well before then.
      return { status: 200, jsonBody: { ok: false } };
    }
  }
});
