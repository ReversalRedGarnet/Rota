/**
 * Decap CMS login endpoint for Rotaract Club of Honiara, running as a
 * Cloudflare Worker.
 *
 * CURRENT FLOW — Cloudflare Access (email + one-time code), no GitHub
 * account needed by board members:
 *
 *   Both /auth and /callback are expected to sit behind a Cloudflare
 *   Access Application (see ../README.md, "Switching to email-based
 *   login (Cloudflare Access)"). Access itself is the actual login
 *   screen and gatekeeper — it only lets a request through to this
 *   Worker once the visitor has verified their email with a one-time
 *   code AND belongs to an allowed Access Group. Once let through,
 *   Access attaches a signed JWT in the Cf-Access-Jwt-Assertion header.
 *
 *   This Worker's only job at that point is to double-check that header
 *   is present and genuinely signed by this team's Access instance
 *   (defense in depth — Access is the front door; this is a second lock
 *   on the same door, not a substitute for it), then hand Decap CMS a
 *   single shared bot token (GITHUB_BOT_TOKEN) so it can read/write the
 *   repo. Every board member ends up committing through that same bot
 *   identity — see the accountability note in the main README: who
 *   edited what now lives in Cloudflare Access's login logs, not git
 *   blame.
 *
 *   This intentionally does NOT check the JWT's "aud" claim, only its
 *   signature and issuer — that's a reasonable trade-off here because
 *   Access is already restricting who can reach these routes at all.
 *   If you want a second layer that also pins the JWT to this specific
 *   Access Application, add an "aud" check against that application's
 *   AUD tag (Cloudflare's docs on validating Access JWTs cover this).
 *
 * PREVIOUS FLOW — real per-user GitHub OAuth — is kept below, unused,
 * in case this ever needs to be rolled back. It required every board
 * member to have their own GitHub account, which doesn't work for
 * under-18 board members without one. GITHUB_OAUTH_ID / GITHUB_OAUTH_SECRET
 * are still valid secrets on the Worker; they're just not read by the
 * active routes at the bottom of this file.
 *
 * Env vars used by the ACTIVE (Access) flow:
 *   CF_ACCESS_TEAM_DOMAIN  — secret. Your Cloudflare Zero Trust team
 *                            domain (the part before
 *                            ".cloudflareaccess.com"), used to fetch the
 *                            JWKS that verifies the Access JWT.
 *   GITHUB_BOT_TOKEN       — secret. A GitHub fine-grained PAT scoped to
 *                            only this repo, handed to every logged-in
 *                            board member's Decap session.
 *
 * Env vars used only by the UNUSED legacy flow below:
 *   GITHUB_OAUTH_ID, GITHUB_OAUTH_SECRET, GITHUB_REPO_PRIVATE
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

/* ---------------------------------------------------------------------
   Shared with both flows: the postMessage page Decap's popup expects.
   Decap CMS's GitHub backend waits for a handshake ("authorizing:github")
   then a result message ("authorization:github:success:{...}") from the
   popup it opened — this format is unchanged from the original OAuth
   flow, only *how* we decide to send "success" (and which token we send)
   has changed.
   --------------------------------------------------------------------- */
function callbackScriptResponse(status, token) {
  var payload = JSON.stringify({ token: token });
  var html =
    "<!DOCTYPE html><html><head><script>" +
    "function receiveMessage(message) {" +
    "  window.opener.postMessage(" +
    "    'authorization:github:" + status + ":" + payload + "'," +
    "    '*'" +
    "  );" +
    "  window.removeEventListener('message', receiveMessage, false);" +
    "}" +
    "window.addEventListener('message', receiveMessage, false);" +
    "window.opener.postMessage('authorizing:github', '*');" +
    "</script></head><body><p>Authorizing Decap CMS…</p></body></html>";

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

/* ---------------------------------------------------------------------
   ACTIVE: Cloudflare Access verification
   --------------------------------------------------------------------- */

async function verifyAccessRequest(request, env) {
  var token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    throw new Error("No Cf-Access-Jwt-Assertion header on the request.");
  }
  if (!env.CF_ACCESS_TEAM_DOMAIN) {
    throw new Error("Worker is missing the CF_ACCESS_TEAM_DOMAIN secret.");
  }

  var issuer = "https://" + env.CF_ACCESS_TEAM_DOMAIN + ".cloudflareaccess.com";
  var JWKS = createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"));

  var verified = await jwtVerify(token, JWKS, { issuer: issuer });
  return verified.payload;
}

async function handleAccessLogin(request, env) {
  var identity;
  try {
    identity = await verifyAccessRequest(request, env);
  } catch (err) {
    return new Response(
      "401 Unauthorized — no valid Cloudflare Access session found for this request.\n\n" +
      "Cloudflare Access should normally block this before it ever reaches this " +
      "Worker, so seeing this page usually means either Access isn't yet set up " +
      "to protect this route (see /oauth-worker/README.md, \"Switching to " +
      "email-based login\"), or you're not logged in.\n\n" +
      "Detail: " + err.message,
      { status: 401, headers: { "Content-Type": "text/plain" } }
    );
  }

  if (!env.GITHUB_BOT_TOKEN) {
    return new Response(
      "500 — Worker is missing the GITHUB_BOT_TOKEN secret. Cloudflare Access " +
      "verified you (" + (identity.email || "unknown email") + ") successfully, " +
      "but there's no bot token configured to hand back to Decap CMS yet. " +
      "See /oauth-worker/README.md.",
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }

  return callbackScriptResponse("success", env.GITHUB_BOT_TOKEN);
}

/* ---------------------------------------------------------------------
   UNUSED — legacy real-GitHub-OAuth flow, kept only for rollback.
   Nothing below this point is called by the routes at the bottom of
   this file (see the file header comment for why it was replaced).
   --------------------------------------------------------------------- */

function legacyRandomHex(bytes) {
  var buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function legacyAuthorizeURL(env, redirectUri, state) {
  var repoIsPrivate = env.GITHUB_REPO_PRIVATE != null && env.GITHUB_REPO_PRIVATE !== "0";
  var scope = repoIsPrivate ? "repo,user" : "public_repo,user";

  var params = new URLSearchParams({
    response_type: "code",
    client_id: env.GITHUB_OAUTH_ID,
    redirect_uri: redirectUri,
    scope: scope,
    state: state
  });

  return "https://github.com/login/oauth/authorize?" + params.toString();
}

async function legacyExchangeCodeForToken(env, code, redirectUri) {
  var res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  var json = await res.json();
  if (!json.access_token) {
    throw new Error("GitHub did not return an access_token: " + JSON.stringify(json));
  }
  return json.access_token;
}

// eslint-disable-next-line no-unused-vars
async function legacyHandleAuth(url, env) {
  if (!env.GITHUB_OAUTH_ID) {
    return new Response("Worker is missing the GITHUB_OAUTH_ID secret.", { status: 500 });
  }

  var redirectUri = url.origin + "/callback";
  var state = legacyRandomHex(4);
  return Response.redirect(legacyAuthorizeURL(env, redirectUri, state), 302);
}

// eslint-disable-next-line no-unused-vars
async function legacyHandleCallback(url, env) {
  var code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing ?code from GitHub.", { status: 400 });
  }
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return new Response("Worker is missing GITHUB_OAUTH_ID / GITHUB_OAUTH_SECRET secrets.", { status: 500 });
  }

  try {
    var redirectUri = url.origin + "/callback";
    var token = await legacyExchangeCodeForToken(env, code, redirectUri);
    return callbackScriptResponse("success", token);
  } catch (err) {
    return new Response("OAuth exchange failed: " + err.message, { status: 500 });
  }
}

/* ---------------------------------------------------------------------
   Routes — both /auth and /callback now run the Access flow above.
   To roll back to real GitHub OAuth, point these two branches at
   legacyHandleAuth(url, env) and legacyHandleCallback(url, env) instead.
   --------------------------------------------------------------------- */

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (url.pathname === "/auth" || url.pathname === "/callback") {
      return handleAccessLogin(request, env);
    }

    return new Response(
      "Decap CMS login endpoint for Rotaract Club of Honiara.\n" +
      "Routes: /auth, /callback — see /oauth-worker/README.md.",
      { headers: { "Content-Type": "text/plain" } }
    );
  }
};
