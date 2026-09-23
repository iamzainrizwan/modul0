// tiny inline markup for content strings in profile.ts: [text](url) becomes a
// link, everything else is escaped. content is ours, but escaping keeps a
// stray < or & from breaking the page.
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function inline(s: string): string {
  return esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const external = /^https?:/.test(href);
    return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${text}</a>`;
  });
}

// the same string with the markup stripped, for places that need plain text
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
