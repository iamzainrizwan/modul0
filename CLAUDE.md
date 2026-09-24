# CLAUDE.md

modul0: Zain's portfolio + blog. Astro 7 with React islands, fully static,
deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.
Live at https://modul0.dev (GitHub Pages custom domain, DNS at name.com; the old
iamzainrizwan.github.io/modul0/ URL redirects there).

Look: brutalist AMOLED + purple (`src/styles/tokens.css`), dark-only on
purpose. Zain's rules: square corners only (no border-radius anywhere), serif
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
  `man modul0` (why the name: Zain's own words, keep them) and `uptime -v`.
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
  `guestbook/admin/` (delete with the worker's `ADMIN_TOKEN`).
  `src/scripts/guestbook.ts` renders messages with textContent only. Messages
  go live straight away (Zain's call), so the worker caps every abuse path
  (listed in `api/README.md`); admin can delete one message or everything
  from one poster. Schema changes: re-run `schema.sql` remotely (it's all
  IF NOT EXISTS) before pushing worker code that needs them. Don't write
  `\u` escapes through tool calls: they arrive as raw characters, and a raw
  U+2028 breaks a JS regex.
- `src/content/blog/*.md` - posts; frontmatter `title`, `date`,
  `description`, optional `draft: true` (hides it in production). Schema in
  `src/content.config.ts`. Also `src/pages/rss.xml.js` and `404.astro`.

## Motion

Terminal-esque on purpose: nothing glides. One style (`html[data-motion]`)
drives every "something appears" moment, split into surfaces (`--sf-*`: boot
wipe, terminal scrim) and text (`--tx-*`: scroll reveal, project filter):
dither (surfaces dissolve in 8px blue-noise pixels, text pops; never
dissolve text, it reads as diagonal dashes), redraw (top-down bands), print
(appears in order, like `cat`), instant, smooth (the original eased motion).
Hover and terminal-drop timing come from the style too (`--hv`, `--qk`). Extras stack via `data-mx-*`: reveal, cursor (block cursor
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

## Commands

`npm run dev` / `npm run build` / `npm run preview`. No tests or linter: the
checks are `npm run build` passing plus the screenshot pass below.
`astro.config.mjs` reads `SITE`/`BASE` env vars (defaults: modul0.dev, `/`)
and uses `trailingSlash: 'always'`, so internal links end in `/`.

## Rules

- Anything user-typed in the terminal goes through `escape()` before innerHTML.
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
