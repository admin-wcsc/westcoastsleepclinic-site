// ---------------- DRCHRONO OAUTH CALLBACK (one-time re-authorization) ----------------
// Not a recurring integration point -- this exists so a real DrChrono
// consent redirect lands on infrastructure we actually control, instead of
// a throwaway localhost address nothing is listening on. Visited once per
// re-authorization (e.g. expanding granted scope beyond patients/user):
// DrChrono redirects here with ?code=&state=, this exchanges the code for a
// fresh access/refresh token pair and overwrites _drchrono/tokens.json --
// the same blob getDrChronoAccessToken() already reads on every request,
// shared by both the prod and dev environments (same storage account), so
// completing this once against either environment fixes both.
//
// `state` is checked against DrChronoOAuthState (an app setting we choose,
// not a DrChrono-issued value) as CSRF protection -- same constant-time-
// secret-compare pattern the webhook receiver already uses for
// DrChronoWebhookSecret. `redirect_uri` comes from DrChronoRedirectUri
// rather than being derived from the incoming request, since DrChrono's
// token exchange requires it to match character-for-character what was
// registered on the DrChrono app and used in the authorize URL --
// deriving it from request.url risks reflecting an internal hostname the
// SWA proxy uses rather than the public one DrChrono actually redirected to.
const { app } = require('@azure/functions');
const crypto = require('crypto');
const { getContainerClient, fetchWithTimeout, DRCHRONO_BASE_URL, DRCHRONO_TIMEOUT_MS, appendAudit } = require('../shared/drchrono');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

app.http('drchronoOauthCallback', {
  methods: ['GET'],
  authLevel: 'anonymous', // DrChrono redirects here directly with no way to attach a function key; state param is the real check
  route: 'drchrono/oauth-callback',
  handler: async (request, context) => {
    const expectedState = process.env.DrChronoOAuthState;
    const state = request.query.get('state');
    if (!expectedState || !safeEqual(state, expectedState)) {
      context.warn('drchrono-oauth-callback: state mismatch, rejecting');
      return { status: 401, body: 'Invalid or missing state.' };
    }

    const oauthError = request.query.get('error');
    if (oauthError) {
      return { status: 400, body: 'DrChrono returned an error: ' + oauthError };
    }

    const code = request.query.get('code');
    if (!code) {
      return { status: 400, body: 'Missing code.' };
    }

    const redirectUri = process.env.DrChronoRedirectUri;
    if (!redirectUri) {
      context.error('drchrono-oauth-callback: DrChronoRedirectUri not configured');
      return { status: 503, body: 'Callback not configured.' };
    }

    let tokens;
    try {
      const tokenRes = await fetchWithTimeout(`${DRCHRONO_BASE_URL}/o/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env.DrChronoClientId,
          client_secret: process.env.DrChronoClientSecret
        })
      }, DRCHRONO_TIMEOUT_MS);

      if (!tokenRes.ok) {
        const text = await tokenRes.text().catch(() => '');
        context.error('drchrono-oauth-callback: token exchange failed', tokenRes.status, text);
        return { status: 502, body: 'Token exchange failed (' + tokenRes.status + '). ' + text };
      }
      tokens = await tokenRes.json();
    } catch (err) {
      context.error('drchrono-oauth-callback: token exchange threw', err.message);
      return { status: 502, body: 'Token exchange failed: ' + err.message };
    }

    const newTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      obtained_at: new Date().toISOString(),
      expires_in: tokens.expires_in
    };
    const content = JSON.stringify(newTokens, null, 2);

    const containerClient = getContainerClient();
    await containerClient.getBlockBlobClient('_drchrono/tokens.json').upload(content, Buffer.byteLength(content));

    await appendAudit(containerClient, { kind: 'event', ts: Date.now(), type: 'drchrono_reauthorized', details: {} });

    return { status: 200, body: 'DrChrono re-authorization complete. Tokens updated -- you can close this tab.' };
  }
});
