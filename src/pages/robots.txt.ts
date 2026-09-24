// crawl everything but the guestbook admin, and point at the sitemap
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL;
  return new Response(`User-agent: *
Allow: /
Disallow: ${base}guestbook/admin/

Sitemap: ${new URL(`${base}sitemap.xml`, site)}
`);
};
