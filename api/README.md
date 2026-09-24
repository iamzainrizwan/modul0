# modul0-api

The guestbook and view counter behind modul0.dev: a Cloudflare Worker with a
D1 (SQLite) database. The site stays static on GitHub Pages and calls this
from the browser. Free tier is plenty.

## One-time setup

```sh
cd api
npm install                              # wrangler, pinned in package.json
npx wrangler login                       # opens the browser
npx wrangler d1 create modul0            # copy the database_id into wrangler.toml
npx wrangler d1 execute modul0 --remote --file=schema.sql   # safe to re-run
npx wrangler secret put ADMIN_TOKEN      # a long random string: `openssl rand -hex 32`
npx wrangler secret put IP_SALT          # another one
npx wrangler secret put DISCORD_WEBHOOK  # optional: a discord webhook url, pinged on each new message
npx wrangler deploy                      # prints https://modul0-api.<you>.workers.dev
```

Then in the GitHub repo (Settings > Secrets and variables > Actions):

- variable `PUBLIC_API` = the workers.dev url from `wrangler deploy`
- secret `CLOUDFLARE_API_TOKEN` = a token from the "Edit Cloudflare Workers" template
- secret `CLOUDFLARE_ACCOUNT_ID` = from the Cloudflare dashboard sidebar

Re-run the `deploy` workflow so the site picks up `PUBLIC_API`. After that,
changes under `api/` deploy themselves (`.github/workflows/api.yml`).

## What stops abuse

Messages go live straight away, so the worker caps everything
(`src/index.js`, top comment):

- writes (posts, counting a visit, deletes) only from the site's origins
- per-IP rate limits on every endpoint (`[[ratelimits]]` in `wrangler.toml`)
- one post a minute per IP, 10 a day per IP, 200 a day for the whole site
- 4 KB bodies, 40-character names, 500-character messages, 2 links max
- a honeypot field, no repeats of a message within a week, reserved names
  (zain, admin, modul0...)
- invisible and text-direction characters stripped, zalgo trimmed
- the visit counter moves once per visitor per day
- IPs are never stored, only a salted hash

If spam still gets through, the next step is Cloudflare Turnstile (a free,
mostly invisible captcha), at the cost of posting without JavaScript.

## Notifications

With the `DISCORD_WEBHOOK` secret set, every new message posts to Discord:
the name, the text in a code block (no markdown, links or mentions render),
its id and poster tag, and a link to the admin page. Honeypot hits and
rejected posts don't ping. A failed ping is logged (`npx wrangler tail`) and
never fails the post.

## Moderating

Delete messages at https://modul0.dev/guestbook/admin/ with the
`ADMIN_TOKEN`. With the token saved, each message shows a short poster tag
(from the salted IP hash) and a button to delete everything from that poster,
for spam waves. Or from here:

```sh
npx wrangler d1 execute modul0 --remote --command "SELECT id, name, message FROM messages ORDER BY id DESC LIMIT 20"
npx wrangler d1 execute modul0 --remote --command "DELETE FROM messages WHERE id = 12"
```

## Local

```sh
npx wrangler d1 execute modul0 --local --file=schema.sql
npx wrangler dev --port 8787             # reads .dev.vars (ADMIN_TOKEN, IP_SALT, RETURN_URL)
PUBLIC_API=http://localhost:8787 npm run dev   # from the repo root, on port 4321
```
