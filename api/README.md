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
npx wrangler d1 execute modul0 --remote --file=schema.sql
npx wrangler secret put ADMIN_TOKEN      # a long random string: `openssl rand -hex 32`
npx wrangler secret put IP_SALT          # another one
npx wrangler deploy                      # prints https://modul0-api.<you>.workers.dev
```

Then in the GitHub repo (Settings > Secrets and variables > Actions):

- variable `PUBLIC_API` = the workers.dev url from `wrangler deploy`
- secret `CLOUDFLARE_API_TOKEN` = a token from the "Edit Cloudflare Workers" template
- secret `CLOUDFLARE_ACCOUNT_ID` = from the Cloudflare dashboard sidebar

Re-run the `deploy` workflow so the site picks up `PUBLIC_API`. After that,
changes under `api/` deploy themselves (`.github/workflows/api.yml`).

## Moderating

Messages go live straight away. Delete them at
https://modul0.dev/guestbook/admin/ with the `ADMIN_TOKEN`, or from here:

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
