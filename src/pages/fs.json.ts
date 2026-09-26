// the terminal's filesystem as json, fetched by the drop-down (QuakeTerminal)
// the first time it opens, instead of inlined into every page. /terminal/
// still inlines it: there, it's the whole page.
import type { APIRoute } from 'astro';
import { buildFs } from '../data/buildFs';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await buildFs()), { headers: { 'content-type': 'application/json' } });
