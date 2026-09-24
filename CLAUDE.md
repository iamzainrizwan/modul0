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
  now/uptime, links, terminal button) + content. `boot` prop plays the boot
  animation (home only); `section` highlights a nav item on non-home pages.
- `src/pages/index.astro` - home, every section in order.
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
- `src/content/blog/*.md` - posts; frontmatter `title`, `date`,
  `description`, optional `draft: true` (hides it in production). Schema in
  `src/content.config.ts`. Also `src/pages/rss.xml.js` and `404.astro`.

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
