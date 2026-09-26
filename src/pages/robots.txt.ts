// crawl everything, and point at the sitemap. the guestbook admin isn't
// disallowed: it carries noindex, and a crawler has to reach it to see that
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL;
  return new Response(`User-agent: *
Allow: /

Sitemap: ${new URL(`${base}sitemap.xml`, site)}
`);
};
