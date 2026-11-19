// is this post marked draft? the last check before a commit to the public
// repo. it reads the frontmatter the way yaml does: `True`, `TRUE`, a
// trailing comment and a quoted key all mean true to astro's parser, so they
// count here too. only the frontmatter: "draft: true" in the body is just text.
export function isDraft(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(String(text));
  return !!fm && /^["']?draft["']?[ \t]*:[ \t]*true\b/im.test(fm[1]);
}

// draft image names end in the time they were added, base 36 ms
// (posts.ts addImages: `<stem>-<Date.now() in base 36>.<ext>`); NaN for any
// other name, so it's never taken for old
export function imageTime(name) {
  const t = parseInt(/-([0-9a-z]{8,9})\.[a-z]+$/.exec(name)?.[1] ?? '', 36);
  return t > 1.6e12 ? t : NaN;
}
