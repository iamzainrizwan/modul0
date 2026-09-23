// html for blog output inside the terminal. links point at the readable
// post pages (/blog/<slug>/).

type Post = { title: string; date: string; description: string; html: string };

const slugOf = (name: string) => name.replace(/\.md$/, '');

export function listing(blog: Record<string, Post>, base: string, prefix = 'blog/') {
  const names = Object.keys(blog);
  if (!names.length) return 'no posts yet';
  const rows = names.map((name) => {
    const p = blog[name];
    return `<span class="dim">${p.date}</span><a class="run" href="${base}blog/${slugOf(name)}/" data-cmd="cat ${prefix}${name}">${name}</a><span class="dim">${p.title}</span>`;
  });
  return `<div class="posts">${rows.join('')}</div>`;
}

export function postView(name: string, post: Post, base: string) {
  const url = `${base}blog/${slugOf(name)}/`;
  return `<article class="post">
<header><h1>${post.title}</h1><p class="dim">${post.date}, <a href="${url}">read on the normal site</a></p></header>
${post.html}
</article>`;
}
