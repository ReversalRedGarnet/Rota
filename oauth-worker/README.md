# Decap CMS login endpoint (Cloudflare Worker)

Decap CMS (used at `/admin` on the main site) needs something to hand it
a token after a board member logs in — a static site has no server of its
own to do that, so this small Cloudflare Worker does it instead.

**Current setup: Cloudflare Access, email + one-time code.** Board members
log in with just their email address — no GitHub account needed anywhere.
This matters because the board includes people under 18 who shouldn't need
to create a GitHub account just to edit the website. Access itself is the
actual login screen (see the walkthrough below); this Worker's job is only
to double-check Access really did authenticate the request, then hand Decap
a single shared GitHub bot token so it can read/write the repo.

**Previous setup: real per-user GitHub OAuth** is kept in the code
(`src/index.js`, the `legacy*` functions) but is no longer used by the
active routes — see that file's header comment. It's there in case this
ever needs to be rolled back; that section of this README is further down,
under "Rolling back to GitHub OAuth login".

It is entirely separate from the main site either way — it doesn't touch
the site's design, and the main site doesn't need it to load or run
normally. It's only used the moment someone opens `/admin` and logs in.

**None of the steps below have been done for the Access setup yet.** They
all require access to your own Cloudflare and GitHub accounts (and the list
of who's actually allowed to log in), so they need to be done by you — not
by Claude, and not scriptable from here.

## Switching to email-based login (Cloudflare Access)

These are Cloudflare **dashboard** steps (Zero Trust → ...), done by hand,
in this order:

### 1. Turn on Cloudflare Zero Trust and note your team domain

In the Cloudflare dashboard, open **Zero Trust** (left sidebar). If it's
not turned on for this account yet, it'll walk you through a one-time
setup (picking a **team name**). Whatever you pick becomes your **team
domain**: `<team-name>.cloudflareaccess.com`. Write that team name down —
it's the `CF_ACCESS_TEAM_DOMAIN` value from step 7.

### 2. Create four Access Groups with real member emails

Zero Trust → **Access → Access groups → Add a group**. Create one group
per role, and add the actual email address of every real person who should
have that level of access to each group:

- **Owner**
- **President/VP**
- **Board Member**
- **Social Media Admin**

(Add or remove people from these groups any time — that's the actual
membership-management step going forward, not something in this repo.)

### 3. Create an Access Application protecting `/admin/*` on the live site

Zero Trust → **Access → Applications → Add an application → Self-hosted**.

- **Application domain**: your live site's domain, path `/admin/*`
  (e.g. `yoursite.com/admin*`)
- **Policy**: allow — add all four groups from step 2 (Owner, President/VP,
  Board Member, Social Media Admin) as "Include" rules, so any of them can
  get in
- **Login method**: enable **One-time PIN** (email code) — this is what
  lets someone log in with just an email address, no account to create
  anywhere

### 4. Create a second Access Application protecting the Worker's `/auth` and `/callback`

Same steps as #3, but:

- **Application domain**: the Worker's own domain/route — either its
  `*.workers.dev` URL or a custom route if you've set one up — restricted
  to `/auth*` and `/callback*` (you can list both paths, or protect the
  whole Worker domain since it doesn't serve anything else sensitive)
- **Policy**: the same four groups as #3
- **Login method**: One-time PIN, same as #3

This is the piece that makes the Worker's own 401-if-missing-JWT check
meaningful — Access has to be sitting in front of these two routes for a
`Cf-Access-Jwt-Assertion` header to ever show up on the request.

### 5. Create a GitHub fine-grained Personal Access Token, scoped to only this repo

GitHub → your avatar → **Settings → Developer settings → Personal access
tokens → Fine-grained tokens → Generate new token**.

- **Repository access**: "Only select repositories" → `ReversalRedGarnet/Rota`
  — not "All repositories"
- **Permissions**: under "Repository permissions", set:
  - **Contents**: Read and write
  - **Pull requests**: Read and write
  - everything else: leave as "No access"
- Give it an expiry you're comfortable rotating on (GitHub will remind you
  before it expires)

Copy the token — GitHub only shows it once.

This is the `GITHUB_BOT_TOKEN` every board member's Decap session will
share. It's not tied to any one person's GitHub account, and it can't
touch anything outside this one repo.

### 6. Set `GITHUB_BOT_TOKEN` on the Worker

From `/oauth-worker/`:

```
npx wrangler secret put GITHUB_BOT_TOKEN
```

Paste the token from step 5 when prompted.

### 7. Set `CF_ACCESS_TEAM_DOMAIN` on the Worker

```
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
```

Enter just the team name from step 1 (the part before
`.cloudflareaccess.com` — e.g. if your team domain is
`rotaract-honiara.cloudflareaccess.com`, enter `rotaract-honiara`).

### Try it

Visit `/admin` on the live site. You should land on a Cloudflare Access
page asking for your email, then a one-time code sent to that address —
not a GitHub login screen. After that, you should land straight in the
Decap CMS dashboard, same as before. If something's wrong, `npx wrangler
tail` (from this folder) shows the Worker's logs, including the 401 detail
message if Access didn't attach a JWT the Worker could verify.

Nothing on the `admin/config.yml` side needed to change for this — it
still points at the same Worker URL as before, and Decap still thinks it's
doing GitHub OAuth. The Worker is just answering that conversation
differently now.

---

## Rolling back to GitHub OAuth login (legacy)

This was the original setup (each board member needed their own GitHub
account with access to the repo). It's been replaced by the Access flow
above, but the code and these steps are kept here in case you ever need to
roll back — the secrets below (`GITHUB_OAUTH_ID` / `GITHUB_OAUTH_SECRET`)
should still be set from when this was first deployed; nothing here
deletes them.

To actually roll back, you'd also need to repoint the two routes in
`src/index.js` at `legacyHandleAuth` / `legacyHandleCallback` instead of
`handleAccessLogin` (see the comment above the `export default` at the
bottom of that file) and redeploy.

### 1. Create a GitHub OAuth App

In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**
(for a personal account) — or under the organisation's settings if the repo
moves to one later.

- **Application name**: anything recognisable, e.g. "Rotaract Honiara CMS"
- **Homepage URL**: the site's live URL (the Vercel domain)
- **Authorization callback URL**: `https://<your-worker-subdomain>.workers.dev/callback`

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

```
npx wrangler deploy
```

This publishes the Worker and prints its URL, something like
`https://rotaract-honiara-decap-oauth.<your-subdomain>.workers.dev`. That's
the URL to use as the callback base in the GitHub OAuth App above
(`<that URL>/callback`), and it's what `../admin/config.yml`'s
`backend.base_url` should already point at.

### 4. Set the OAuth secrets

```
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
```

Paste the Client ID for the first, the Client Secret for the second.

If `ReversalRedGarnet/Rota` is (or ever becomes) a **private** repo, also
set `GITHUB_REPO_PRIVATE` to `1` the same way — this widens the OAuth scope
the legacy flow requests from `public_repo` to `repo`.

## Files here

- `src/index.js` — the Worker. The active routes (`handleAccessLogin`,
  used by both `/auth` and `/callback`) verify a Cloudflare Access JWT and
  hand back `GITHUB_BOT_TOKEN`. The `legacy*` functions below them are the
  original real-GitHub-OAuth flow, unused but kept for rollback.
- `wrangler.toml` — Worker config (name, entry point). Does **not** contain
  secrets.
- `package.json` — installs `wrangler` and `jose` (used to verify the
  Access JWT).
