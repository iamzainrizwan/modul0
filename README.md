# modul0

`shhh...`

a terminal that happens to be a portfolio, plus a blog you read with `cat`.

```sh
npm i
npm run dev      # node >= 22.12
```

new post: add `src/content/blog/<slug>.md` with `title`, `date`, `description`
frontmatter. it shows up in `ls blog/`, gets its own page at `/blog/<slug>/`,
and goes into `/rss.xml`.
