# CLAUDE.md

modul0: Zain's portfolio + blog. Astro 7 with React islands, fully static,
deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.
Live at https://iamzainrizwan.github.io/modul0/ (base path `/modul0/`).

Look: AMOLED black + purple (`src/styles/tokens.css`), dark-only on purpose.
IBM Plex Mono for display/nav, IBM Plex Sans for reading.

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
- `src/data/fs.ts` - the terminal's files, same facts in a lowercase voice.
  Deliberately separate from profile.ts: update both when facts change.
- `src/layouts/Site.astro` - the one site layout: sticky rail (file-tree nav,
  now/uptime, links, terminal button) + content. `boot` prop plays the boot
  animation (home only); `section` highlights a nav item on non-home pages.
- `src/pages/index.astro` - home, every section in order.
- `src/components/` - React islands: `BootSequence` (first visit per session,
  skipped for reduced motion; an inline script in Site.astro sets
  `html[data-boot=pending]` before paint so there's no flash), `ProjectExplorer`
  (featured + filterable archive), `QuakeTerminal` (drop-down terminal on every
  page, `` ` `` toggles, esc/exit closes), `SectionNav`, `Uptime`. Astro:
  `Pipeline` (s3ntry diagram), `Timeline`.
- `src/scripts/terminal.ts` - terminal engine, `boot(root, fs, opts)`; mounted
  by QuakeTerminal and by the full-screen `/terminal/` page
  (`src/layouts/Terminal.astro`). `src/scripts/render.ts` - blog html inside it.
- `src/content/blog/*.md` - posts (`draft: true` hides one in production).

## Rules

- Anything user-typed in the terminal goes through `escape()` before innerHTML.
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
