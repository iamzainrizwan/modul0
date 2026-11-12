# admin dashboard (`/admin/`)

Layout `src/layouts/Admin.astro`, styles `src/styles/admin.css`, one module
per panel here, panels picked by url hash: overview, posts, content,
guestbook, wall, visits.

- posts: split markdown | preview in the blog's `.article` styles via
  `marked`. Images are shrunk to 1600px webp in the browser and committed to
  `public/blog/<slug>/`. Editor parts live in `editor/`; the link picker is
  fed by the `data-site-links` json the admin page builds.
- content: a form generated from each `src/data/content/*.json`, or raw json.
- visits: the `hits` table.
