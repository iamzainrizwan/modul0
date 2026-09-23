# CLAUDE.md

modul0: personal portfolio + blog. Two faces:

1. **The readable site** (`/`, `/blog/`, `/blog/<slug>/`) — the default, written
   for non-technical recruiters. Plain English, fast to scan.
2. **The terminal** (`/terminal/`) — an easter egg. Reached via the blinking
   cursor after the name on the home page, the footer link, or pressing `` ` ``
   on any page; `exit` returns to the site.

Astro 7, fully static, deployed to GitHub Pages by
`.github/workflows/deploy.yml` on push to `main`.

## Layout

- `src/data/profile.ts` — content for the readable site (intro, projects,
  recognition, contact links). Written for non-technical readers.
- `src/layouts/Site.astro` + `src/styles/site.css` — the readable site's one
  layout. IBM Plex Sans, light by default, true-black dark mode.
- `src/data/fs.ts` — the fake filesystem's static files (`about.txt`,
  `projects/*.md`, …) as html strings. Edit content here.
- `src/content/blog/*.md` — blog posts (schema in `src/content.config.ts`,
  `draft: true` hides a post from production builds).
- `src/data/buildFs.ts` — assembles fs + rendered posts into the JSON blob
  embedded in the terminal page (`<script id="fs">`).
- `src/scripts/terminal.ts` — the whole client: command parser, path
  resolution (`cd`/`..`/`~`), tab completion, history, boot sequence.
- `src/scripts/render.ts` — blog listing / post html inside the terminal.
- `src/layouts/Terminal.astro` — terminal layout (only `/terminal/` uses it).

## Rules

- The readable site comes first: anything a recruiter needs must be on it,
  never only in the terminal. The terminal is a bonus, in its own lowercase,
  more technical voice; `profile.ts` and `fs.ts` are deliberately separate,
  so update both when a project changes.
- Anything user-typed goes through `escape()` before hitting innerHTML.
- Terminal: clickable output uses `<a class="run" data-cmd="...">` (with a
  real href when one exists) so visitors never *have* to type.
- Check new output at 390px wide as well as desktop — grid/flex layouts
  (`.cols`, `.posts`, `.ls`) stack on narrow screens, `<pre>` padding doesn't.
- Base path: the site is served under `/modul0/` on Pages until a custom
  domain exists. Always build urls from `import.meta.env.BASE_URL` / `fs.base`,
  never a hardcoded `/`.
- Local build needs node >= 22.12 (system node may be older:
  `npx -y node@22 node_modules/.bin/astro dev`).
