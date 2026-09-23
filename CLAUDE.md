# CLAUDE.md

modul0: personal site that is **purely a terminal** — portfolio + blog, no
conventional nav/pages. Astro 7, fully static, deployed to GitHub Pages by
`.github/workflows/deploy.yml` on push to `main`.

## Layout

- `src/data/fs.ts` — the fake filesystem's static files (`about.txt`,
  `projects/*.md`, …) as html strings. Edit content here.
- `src/content/blog/*.md` — blog posts (schema in `src/content.config.ts`,
  `draft: true` hides a post from production builds).
- `src/data/buildFs.ts` — assembles fs + rendered posts into the JSON blob
  embedded in every page (`<script id="fs">`).
- `src/scripts/terminal.ts` — the whole client: command parser, path
  resolution (`cd`/`..`/`~`), tab completion, history, boot sequence.
- `src/scripts/render.ts` — html shared by client *and* build-time pages
  (blog listing, post view). Keep them in sync through this file only.
- `src/layouts/Terminal.astro` — the single layout. `initial` prop
  pre-renders a command + output server-side; that's how `/blog/<slug>/`
  works without js and gets indexed.

## Rules

- Stay terminal-only. New features are new commands or files, not new UI chrome.
- Anything user-typed goes through `escape()` before hitting innerHTML.
- Clickable output uses `<a class="run" data-cmd="...">` (with a real href
  when one exists) so mobile/recruiter visitors never *have* to type.
- Check new output at 390px wide as well as desktop — grid/flex layouts
  (`.cols`, `.posts`, `.ls`) stack on narrow screens, `<pre>` padding doesn't.
- Base path: the site is served under `/modulo/` on Pages until a custom
  domain exists. Always build urls from `import.meta.env.BASE_URL` / `fs.base`,
  never a hardcoded `/`.
- Local build needs node >= 22.12 (system node may be older:
  `npx -y node@22 node_modules/.bin/astro dev`).
