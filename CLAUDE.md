# CLAUDE.md

modul0: Zain's portfolio + blog. Astro 7 with React islands, fully static,
deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.
Live at https://modul0.dev (GitHub Pages custom domain, DNS at name.com; the old
iamzainrizwan.github.io/modul0/ URL redirects there).

Look: brutalist AMOLED + purple (`src/styles/tokens.css`). Dark is the
default for everyone, whatever the browser prefers; light (ink on paper,
deeper purple) is opt-in via the rail toggle or `theme light` in the terminal,
saved per browser (`src/scripts/theme.ts`), set before paint by the body
scripts in Site.astro and Terminal.astro and carried across router swaps.
Colours only via tokens: `--void` is the paper, `--white` the ink. Zain's rules: square corners only (no border-radius anywhere), serif
or monospace fonts only (Newsreader for reading/display, IBM Plex Mono for
ui/terminal, never sans-serif), loud but minimal: hard 2px rules, hard offset
shadows, solid purple blocks, no blur or glow.

## Accuracy is the top rule

Recruiters read this. Every claim in `src/data/profile.ts` must trace to a
source: the current CV (vault `cv/bsc/cv-master.tex`, never its `% DREAM`
blocks or `cv/dream/`), LinkedIn, the GitHub profile README, a project's own
README, or something Zain confirmed. The header comment in `profile.ts` lists
conflicts Zain has already resolved (degree wording, Uber result, CTFs) - keep
those. When sources disagree, ask; don't pick one.

## Layout

- `src/data/profile.ts` - all site content (projects, homelab, experience,
  education, leadership, awards, skills...). Edit content here, not in pages.
  Strings may contain `[text](url)` links, rendered by `src/data/inline.ts`
  (Astro: `set:html={inline(x)}`, React: `dangerouslySetInnerHTML`). Link
  claims to their evidence wherever it exists (a writeup, the source file, a
  report), and check every URL resolves.
- `src/data/fs.ts` - the terminal's files, same facts in a lowercase voice.
  Deliberately separate from profile.ts: update both when facts change.
- `src/data/buildFs.ts` - `getPosts()` (drafts shown in dev only) and
  `buildFs()`, which serialises fs.ts + rendered posts into each page for the
  client-side terminal.
- `src/layouts/Site.astro` - the one site layout: sticky rail (file-tree nav,
  now/uptime/visits, links, terminal button) + content. `boot` prop plays the
  boot animation (home only); `section` highlights a nav item on non-home
  pages; `noindex` for the guestbook admin. Nav: files (about, contact)
  scroll home, directories (`href`) open their page; scroll-spy highlights
  home's teaser with the same id. `cv/` is a folder (`children`): open on
  desktop while its teaser or one of its /cv/ sections is current; flattened
  into the grid on mobile, where its first child stands in for it
  (`.tree-proxy`). Zain wants mobile's nav grid left as is.
- `src/pages/index.astro` - home, the skim: hero, then a teaser per section
  (projects, homelab, cv, productions, writing, guestbook) that links to its
  full page, then contact. Zain wants home to stay rich for a skimming
  recruiter, so teasers carry the strongest facts (featured projects, the
  drill readout, the cv at a glance), not just links. Full pages:
  `projects/` (ProjectExplorer), `homelab/`, `cv/` (experience, education,
  leadership, awards, skills), `productions/`, `blog/`, `guestbook/`.
  Teasers: `ProjectTeasers`, `CvGlance`, `GuestbookTeaser` (.astro).
  Content links to a section (`#project-x`, `#leadership`, `#failure-drill`)
  are rewritten to the page it lives on by `route()` in `src/data/inline.ts`.
- `src/components/` - React islands: `BootSequence` (first visit per session;
  log -> typed name with a deliberate typo + backspace fix -> purple wipe. The
  "N archived" count in its log is hardcoded: keep it equal to `archive.length`;
  skipped for reduced motion; an inline script in Site.astro sets
  `html[data-boot=pending]` before paint so there's no flash), `ProjectExplorer`
  (featured + filterable archive), `QuakeTerminal` (drop-down terminal on every
  page, `` ` `` toggles, esc/exit closes), `SectionNav`, `Uptime`. Astro:
  `Pipeline` (s3ntry diagram), `Timeline`.
- `src/scripts/terminal.ts` - terminal engine, `boot(root, fs, opts)`; mounted
  by QuakeTerminal and by the full-screen `/terminal/` page
  (`src/layouts/Terminal.astro`). `src/scripts/render.ts` - blog html inside it.
  Beyond the fs commands it has `expr` (bigint `+ - * / %`, also bare `17 % 5`),
  `man modul0` (why the name: Zain's own words, keep them), `uptime -v`,
  `grep` (every file), `curl -L modul0.dev/cv.txt`, `theme`, `neofetch` (the %
  mark in blocks beside sourced facts) and `git log` (the build's real last
  15 commits, from `build.log` in `src/data/build.ts`; ci checks out 20 deep
  for it, keep `fetch-depth` in deploy.yml and test.yml). Easter eggs, not
  in `help`, live in `src/scripts/eggs.ts`: `EGGS` is the list `eggs` tallies
  (per browser, "+1 egg · n/N" on a first find), `quick()` the one-liners
  (sudo, make, cowsay, fortune, ssh, brew coffee, weather, `%`, `:wq`), and
  the long ones animate in the output and take the keyboard until ctrl+c,
  q or esc: `yes`, the fork bomb, `hack`, `cmatrix`, `snake` (best score per
  browser). The engine keeps `rm -rf /` (sets `html[data-broken]`: the page
  tears, a fixed `body::after` cover blacks out and lifts, then "restored in
  Ns", the real downtime), `sl`, `vim` (stuck until `:q`), `ls -a` / `.secrets`,
  `echo $SHELL`, `man man`, `git push`/`blame`, `reboot` (replays the boot on
  a real load of home) and `shutdown`, each counted with `found(id)`. A new
  egg goes in `EGGS` too. Keep their jokes free of facts about Zain's setup
  that nothing sources. `TIPS` there are the nudges: one you haven't found,
  new every time the drop-down opens (in its title bar, click runs it; the
  title hides under 420px to make room) and at the end of `/terminal/`'s boot.
  Loud eggs only; the quiet ones stay unhinted. `help` is two pages
  (`COMMANDS`, then `MORE` for `help more`): keep the first page to the way
  around, and don't let it grow past about ten.
- Page keys (Site.astro): `j`/`k` jump between headings, `gg`/`G`, and `/`
  opens the terminal on `grep ` (`modul0:terminal` with `detail.input`), `?`
  opens `dialog.keys` (every key; hints at the hidden commands without naming
  them). Off while typing, with modifiers, or with the terminal or the list
  open. New keys go in that list too.
- `src/pages/cv.txt.ts` - the cv as plain text from profile.ts (76 columns),
  for `curl -L modul0.dev/cv.txt`: always advertise the `-L`, since a bare
  domain means plain http, and Pages (https enforced) answers that with a 301
  that curl doesn't follow on its own. Pages can't sniff curl either, so the
  bare domain stays html. `src/data/build.ts` - commit sha and commit time, read
  from git at build: the footer's "updated 3h ago · sha" (commit time, not
  build time, or the daily snake rebuild would make it always fresh).
- `src/scripts/uptime.ts` - the uptime maths, shared by the rail's `Uptime`
  island (a `<details>` that opens into the remainders) and the terminal.
- The % motif: `ModMark.astro` (two squares + slash; squares use `--mark-sq`,
  slash `currentColor`) in the rail name and footer, same shape as
  `public/favicon.svg`. A `%` meant to be noticed gets `.op` (black on a solid
  purple block), in both site.css and terminal.css.
- `src/pages/404.astro` - the missing path "leaves a remainder"; its `%` is a
  button that reveals `snake.svg` (Platane/snk, eating Zain's contribution
  grid). The svg is generated in `deploy.yml` (pinned by sha, `rx`/`ry`
  stripped for square corners, rebuilt daily by cron), never committed, so
  locally the page shows its "snake's asleep" fallback. The boot log's
  statuses are remainders too: `r0` done, `r1` still in progress.
- Productions: `productions` in profile.ts (sources in its comment; the named
  shows only, smaller events make up the rest of "about 14"), rendered by
  `Productions.astro` as a 3-item teaser on home and in full on
  `src/pages/productions/`. Terminal copy is `productions.log` in fs.ts.
- Guestbook + view counter: `api/` is a Cloudflare Worker + D1 (setup,
  moderation and local dev in `api/README.md`), deployed by
  `.github/workflows/api.yml`. The site reads its url from `PUBLIC_API` at
  build time (`src/data/api.ts`; repo variable in CI); unset, the guestbook
  shows as offline and the counter stays hidden. `src/pages/guestbook/`
  (posts work without js via a form post + 303 back to `#posted`),
  `guestbook/admin/` (delete with the worker's `ADMIN_TOKEN`). The page also
  has the pixel wall (`src/scripts/wall.ts`, worker `/wall`): 32x32, one pixel
  a day per visitor, drawn on a canvas from the theme tokens at whole device
  pixels per cell; without js it's the worker's `/wall.svg`. "replay" redraws
  it from `/wall/history` (3 base-32 chars a placement). Admin undoes a
  poster or clears it. Zain can reply to a message from the admin page
  (`replies` table, joined into `/messages`, shown under it as "↳ zain");
  deleting a message deletes its reply.
  `src/scripts/guestbook.ts` renders messages with textContent only. Messages
  go live straight away (Zain's call), so the worker caps every abuse path
  (listed in `api/README.md`); admin can delete one message or everything
  from one poster; each new message pings Discord (`DISCORD_WEBHOOK` worker
  secret, never in the repo). Schema changes: re-run `schema.sql` remotely (it's all
  IF NOT EXISTS) before pushing worker code that needs them. Don't write
  `\u` escapes through tool calls: they arrive as raw characters, and a raw
  U+2028 breaks a JS regex.
- `src/content/blog/*.md` - posts; frontmatter `title`, `date`,
  `description`, optional `draft: true` (hides it in production). Schema in
  `src/content.config.ts`. Also `src/pages/rss.xml.js` and `404.astro`.

## Motion

Terminal-esque on purpose: nothing glides. One style (`html[data-motion]`)
drives every "something appears" moment, split into surfaces (`--sf-*`: boot
wipe) and text (`--tx-*`: scroll reveal, project filter):
dither (surfaces dissolve in 8px blue-noise pixels, text pops; never
dissolve text, it reads as diagonal dashes), redraw (top-down bands), print
(appears in order, like `cat`), instant, smooth (the original eased motion).
Hover and terminal-drop timing come from the style too (`--hv`, `--qk-dur`;
the drop is the "loader": the quake's title bar fills in five steps, then the
body lands, 190ms; Zain's pick from five mockups, 2026-09-25). Extras stack via `data-mx-*`: reveal, cursor (block cursor
sweeps hovered links), decode (two characters per heading flicker through
glyphs, width-locked). Defaults in `src/data/motion.ts`; the head script in
Site.astro sets the attributes before paint; `src/scripts/motion.ts` does
the js half. Page changes are instant, prefetched loads with no animation:
view transitions and a per-page arrival draw were both tried and dropped
(a blank frame; body text dissolving reads as dashed lines). Don't
dissolve body text. Animations that hand off on animationend need distinct
keyframes for each step. Never touch DOM inside React islands, never hide
anything without js, everything off for reduced motion.

## Test site

Any branch except main deploys to https://modul0-test.modul0.workers.dev
(`.github/workflows/test.yml`, `deploy/test/wrangler.toml`: a Worker serving
`dist` as static files, noindex, guestbook offline). Last push wins. Built
with `PUBLIC_TEST=1`: a motion panel (`MotionPanel.astro`, per-browser
settings in localStorage) and the boot replays on every load.

## SEO

Every page gets a canonical URL and og tags from Site.astro (`noindex` pages,
the guestbook admin and 404, get no canonical). `src/pages/sitemap.xml.ts`
and `robots.txt.ts` are generated at build (add new top-level pages to
`PAGES` in the sitemap; posts are picked up automatically).
Share cards: `src/data/og.ts` lists each page's card (its own title and
description) plus one per post; `src/pages/og/[slug].png.ts` renders them at
build with satori + resvg in the style of the hand-made `public/og.png`
(fonts from `@fontsource`, not Google Fonts). Home, 404 and admin keep
`og.png`. A new top-level page gets an entry in `PAGES` there too.
`src/data/seo.ts` builds the schema.org JSON-LD (Person, ProfilePage and
WebSite on home, BlogPosting on posts) from profile.ts, so it follows the
accuracy rule: don't add facts there that profile.ts doesn't have.

## Commands

`npm run dev` / `npm run build` / `npm run preview`. No tests or linter: the
checks are `npm run build` passing plus the screenshot pass below.
`astro.config.mjs` reads `SITE`/`BASE` env vars (defaults: modul0.dev, `/`)
and uses `trailingSlash: 'always'`, so internal links end in `/`.

## Rules

- Page changes use Astro's `<ClientRouter />` (Site.astro, no animation):
  the router swaps the page in without a reload, and the rail, the quake
  terminal (session included) and the motion panel persist
  (`transition:persist`). So a page's `<script>` runs once per session, not
  per page: wrap its setup in a function, call it, and also run it on
  `astro:page-load`, with a marker on the page's root element so it never
  wires the same page twice (see guestbook/index.astro). SectionNav works out
  the current page from the url on each `astro:page-load`. Links that must
  do a real navigation (the terminal links, which the click handler turns
  into opening the drop-down) carry `data-astro-reload`. `/terminal/` uses
  its own layout without the router, so it's a full load.
- Anything user-typed in the terminal goes through `escape()` before innerHTML.
- The pre-paint script (motion attributes, boot decision) lives at the top of
  `<body>`, not in `<head>`: Astro puts the site stylesheet last in head, and
  a head script calling `matchMedia` made Firefox paint one unstyled frame
  (a screen-wide `%` slash). Keep head scripts out, and keep intrinsic
  `width`/`height` on inline SVGs.
- React islands are wrapped in `<astro-island>`, so `.parent > *` selectors
  don't reach them (the rail uses `display: contents` on the wrapper).
- Terminal CSS is scoped under `.terminal`; don't add global classes that
  could collide with the engine's (`entry`, `boot`, `echo`, `response`, `run`).
- Every page must work without JS (islands render server-side) and at 320px
  wide with no horizontal scroll. Respect `prefers-reduced-motion`.
- UI changes need an explicit visual/alignment pass on screenshots (desktop,
  390px, 320px), not just functional checks.
- Build urls from `import.meta.env.BASE_URL` / `fs.base`, never a hardcoded `/`.
- No Claude co-author trailers in commits here.
- Local build needs node >= 22.12 (system node may be older:
  `npx -y node@22 node_modules/.bin/astro dev`). If `npm i` downgrades astro
  to 6.x, reinstall `astro@^7`.
