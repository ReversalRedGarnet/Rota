/**
 * Minimal GitHub OAuth proxy for Decap CMS, running as a Cloudflare Worker.
 *
 * Adapted from the standard community pattern for this exact problem
 * (see e.g. github.com/sterlingwes/decap-proxy and
 * github.com/ottmartens/decap-cms-github-oauth-provider-cloudflare) —
 * Decap's GitHub backend needs *something* to hold the OAuth client secret
 * and complete the "exchange a code for a token" step server-side, since a
 * static site has no server of its own. This Worker is that something.
 *
 * Routes:
 *   GET /auth      — Decap opens this in a popup; we redirect to GitHub's
 *                    own login/authorize screen.
 *   GET /callback  — GitHub redirects back here with a `code`; we exchange
 *                    it for an access token and hand it back to the Decap
 *                    popup via postMessage, using the handshake Decap
 *                    expects (wait for "authorizing:github" ack, then send
 *                    "authorization:github:success:{...}").
 *
 * Needs two secrets set on the deployed Worker (see ../README.md):
 *   GITHUB_OAUTH_ID      — the OAuth App's Client ID
 *   GITHUB_OAUTH_SECRET  — the OAuth App's Client Secret
 *
 * Optional var:
 *   GITHUB_REPO_PRIVATE  — set to "1" if data/Rota is a private repo, so
 *                          the token request asks for the wider "repo"
 *                          scope instead of "public_repo".
 */

function randomHex(bytes) {
  var buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function authorizeURL(env, redirectUri, state) {
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

async function exchangeCodeForToken(env, code, redirectUri) {
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

async function handleAuth(url, env) {
  if (!env.GITHUB_OAUTH_ID) {
    return new Response("Worker is missing the GITHUB_OAUTH_ID secret.", { status: 500 });
  }

  var redirectUri = url.origin + "/callback";
  var state = randomHex(4);
  return Response.redirect(authorizeURL(env, redirectUri, state), 302);
}

async function handleCallback(url, env) {
  var code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing ?code from GitHub.", { status: 400 });
  }
  if (!env.GITHUB_OAUTH_ID || !env.GITHUB_OAUTH_SECRET) {
    return new Response("Worker is missing GITHUB_OAUTH_ID / GITHUB_OAUTH_SECRET secrets.", { status: 500 });
  }

  try {
    var redirectUri = url.origin + "/callback";
    var token = await exchangeCodeForToken(env, code, redirectUri);
    return callbackScriptResponse("success", token);
  } catch (err) {
    return new Response("OAuth exchange failed: " + err.message, { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (url.pathname === "/auth") return handleAuth(url, env);
    if (url.pathname === "/callback") return handleCallback(url, env);

    return new Response(
      "Decap CMS GitHub OAuth proxy for Rotaract Club of Honiara.\n" +
      "Routes: /auth, /callback — see /oauth-worker/README.md.",
      { headers: { "Content-Type": "text/plain" } }
    );
  }
};
