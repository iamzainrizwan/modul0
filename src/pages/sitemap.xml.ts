// the sitemap search engines read (linked from robots.txt and every page's
// head). every public page, plus each published post with its date; the
// guestbook admin and 404 stay out (both noindex).
import type { APIRoute } from 'astro';
import { getPosts } from '../data/buildFs';

const PAGES = ['', 'projects/', 'homelab/', 'cv/', 'productions/', 'blog/', 'guestbook/', 'terminal/'];

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const url = (path: string) => new URL(`${base}${path}`, site).toString();
  const posts = await getPosts();
  const entries = [
    ...PAGES.map((p) => ({ loc: url(p) })),
    ...posts.map((p) => ({ loc: url(`blog/${p.id}/`), lastmod: p.data.date.toISOString().slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
