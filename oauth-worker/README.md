# Decap CMS OAuth proxy (Cloudflare Worker)

Decap CMS's GitHub backend (used at `/admin` on the main site) needs to
exchange a GitHub OAuth code for an access token, which requires a client
secret — something a static site with no server can't hold safely on its
own. This Worker is a small standalone proxy that holds that secret and
does the exchange, following the standard community pattern for this
(e.g. [sterlingwes/decap-proxy](https://github.com/sterlingwes/decap-proxy),
[ottmartens/decap-cms-github-oauth-provider-cloudflare](https://github.com/ottmartens/decap-cms-github-oauth-provider-cloudflare)).

It is entirely separate from the main site — it doesn't touch the site's
design, and the main site doesn't need it to load or run normally. It's
only used the moment someone clicks "Login with GitHub" on `/admin`.

**None of the steps below have been done yet.** They all require access to
your own GitHub and Cloudflare accounts, so they need to be done by you (or
whoever holds those accounts) — not by Claude.

## What you still need to do

### 1. Create a GitHub OAuth App

In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**
(for a personal account) — or under the organisation's settings if the repo
moves to one later.

- **Application name**: anything recognisable, e.g. "Rotaract Honiara CMS"
- **Homepage URL**: the site's live URL (the Vercel domain)
- **Authorization callback URL**: `https://<your-worker-subdomain>.workers.dev/callback`
  (you'll get the exact subdomain after step 3 — you can come back and fill
  this in once you have it, GitHub lets you edit it later)

Once created, GitHub gives you a **Client ID** immediately, and lets you
**generate a Client Secret**. Copy both somewhere safe — the secret is only
shown once.

### 2. Install Wrangler (Cloudflare's CLI)

From inside this `/oauth-worker/` folder:

```
npm install
npx wrangler login
```

`wrangler login` opens a browser window to authorize the CLI against your
Cloudflare account.

### 3. Deploy the Worker

Still from `/oauth-worker/`:

```
npx wrangler deploy
```

This publishes the Worker and prints its URL, something like
`https://rotaract-honiara-decap-oauth.<your-subdomain>.workers.dev`.
That's the URL to:
- use as the callback base in the GitHub OAuth App above
  (`<that URL>/callback`)
- paste into `../admin/config.yml` as `backend.base_url` (replacing the
  `https://REPLACE-ME.workers.dev` placeholder currently there)

### 4. Set the two secrets

```
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Each command prompts you to paste in the value — paste the Client ID for
the first, the Client Secret for the second. These are stored encrypted by
Cloudflare, not in this repo.

If `ReversalRedGarnet/Rota` is (or ever becomes) a **private** repo, also
set:

```
npx wrangler secret put GITHUB_REPO_PRIVATE
```

and enter `1`. This widens the OAuth scope the Worker requests from
`public_repo` to `repo`, which is required to read/write a private repo.
Leave this unset for a public repo.

### 5. Try it

Visit `https://<your-site-domain>/admin`, click "Login with GitHub", and
authorize the app. If it works, you'll land in the Decap CMS dashboard. If
something's wrong, the browser's dev console (on the `/admin` page) and the
Worker's logs (`npx wrangler tail` from this folder) are the two places to
look.

## Files here

- `src/index.js` — the Worker itself (`/auth` redirects to GitHub's login
  screen; `/callback` exchanges the code GitHub sends back for a token and
  hands it to the Decap popup).
- `wrangler.toml` — Worker config (name, entry point). Does **not** contain
  secrets.
- `package.json` — just enough to install `wrangler` locally.
