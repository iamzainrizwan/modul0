// tiny inline markup for content strings in profile.ts: [text](url) becomes a
// link, everything else is escaped. content is ours, but escaping keeps a
// stray < or & from breaking the page.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// content links to a section (#project-s3ntry, #leadership) go to the page
// that section now lives on; home only has the teasers.
const cv = ['experience', 'education', 'leadership', 'awards', 'skills'];
export function route(hash: string): string {
  const base = import.meta.env.BASE_URL;
  const id = hash.slice(1);
  if (id.startsWith('project-')) return `${base}projects/#${id}`;
  if (cv.includes(id)) return `${base}cv/#${id}`;
  if (id === 'failure-drill') return `${base}homelab/#${id}`;
  if (['projects', 'homelab', 'cv', 'productions', 'guestbook'].includes(id)) return `${base}${id}/`;
  if (id === 'writing') return `${base}blog/`;
  return hash;
}

export function inline(s: string): string {
  return esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    if (href.startsWith('#')) href = route(href);
    const external = /^https?:/.test(href);
    return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${text}</a>`;
  });
}

// the same string with the markup stripped, for places that need plain text
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
