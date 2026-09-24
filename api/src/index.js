// modul0-api: the guestbook and the view counter behind modul0.dev.
//
//   GET    /messages        newest first, at most 100
//   POST   /messages        json from the page, or a plain form post (no js),
//                           which is redirected back to the guestbook
//   DELETE /messages/:id    needs `Authorization: Bearer <ADMIN_TOKEN>`
//   GET    /views           the count
//   POST   /views           count this visit, return the new total
//
// messages go live straight away. spam control is a honeypot field, length
// limits, and rate limits per (hashed) ip and for the whole site per day.

const NAME_MAX = 40;
const MESSAGE_MAX = 500;
const LIST_MAX = 100;
const GAP_SECONDS = 60; // between posts from one ip
const PER_IP_DAY = 10;
const SITE_DAY = 200; // everyone, so a flood can't bury the page

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const res = await route(request, env, url);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error(err);
      return json({ error: 'server' }, 500, cors);
    }
  },
};

async function route(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/messages' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, message, created FROM messages ORDER BY id DESC LIMIT ?',
    ).bind(LIST_MAX).all();
    return json({ messages: results });
  }

  if (pathname === '/messages' && method === 'POST') return post(request, env);

  const del = pathname.match(/^\/messages\/(\d+)$/);
  if (del && method === 'DELETE') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorised' }, 401);
    const { meta } = await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(Number(del[1])).run();
    return json({ deleted: meta.changes > 0 });
  }

  if (pathname === '/views' && method === 'GET') return json({ views: await views(env) });
  if (pathname === '/views' && method === 'POST') {
    const row = await env.DB.prepare(
      "UPDATE counters SET value = value + 1 WHERE name = 'views' RETURNING value",
    ).first();
    return json({ views: row?.value ?? 0 });
  }

  return json({ error: 'not found' }, 404);
}

async function post(request, env) {
  const type = request.headers.get('content-type') ?? '';
  const isForm = !type.includes('application/json');
  let body;
  try {
    body = isForm ? Object.fromEntries(await request.formData()) : await request.json();
  } catch {
    return reply(isForm, env, { error: 'bad-request' }, 400);
  }

  // the honeypot is hidden from people; anything filling it is a bot. pretend it worked.
  if (String(body.website ?? '').trim()) return reply(isForm, env, { ok: true }, 201);

  const name = [...clean(body.name, false)].slice(0, NAME_MAX).join('').trim() || 'anonymous';
  const message = clean(body.message, true);
  if (!message) return reply(isForm, env, { error: 'empty' }, 400);
  if ([...message].length > MESSAGE_MAX) return reply(isForm, env, { error: 'too-long' }, 400);

  const ip = await sha256((env.IP_SALT ?? '') + (request.headers.get('cf-connecting-ip') ?? 'unknown'));
  const limits = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE ip_hash = ?1 AND created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?2)) AS recent,
       (SELECT COUNT(*) FROM messages WHERE ip_hash = ?1 AND created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')) AS mine,
       (SELECT COUNT(*) FROM messages WHERE created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')) AS everyone`,
  ).bind(ip, `-${GAP_SECONDS} seconds`).first();
  if (limits.recent > 0 || limits.mine >= PER_IP_DAY || limits.everyone >= SITE_DAY) {
    return reply(isForm, env, { error: 'slow-down' }, 429);
  }

  const row = await env.DB.prepare(
    'INSERT INTO messages (name, message, ip_hash) VALUES (?, ?, ?) RETURNING id, name, message, created',
  ).bind(name, message, ip).first();
  return reply(isForm, env, { ok: true, message: row }, 201);
}

// trims and drops control characters. newlines survive only in the message,
// and never more than one blank line in a row.
function clean(value, multiline) {
  let s = String(value ?? '').replace(/\r\n?/g, '\n');
  s = s.replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, '');
  if (multiline) s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

// a json caller gets json; a form post (no js) goes back to the guestbook
function reply(isForm, env, data, status) {
  if (!isForm) return json(data, status);
  const to = new URL(env.RETURN_URL);
  to.searchParams.set(data.error ? 'error' : 'posted', data.error ?? '1');
  // the page shows the matching note with :target, so it works without js
  to.hash = data.error ? 'not-posted' : 'posted';
  return new Response(null, { status: 303, headers: { location: to.toString() } });
}

async function views(env) {
  const row = await env.DB.prepare("SELECT value FROM counters WHERE name = 'views'").first();
  return row?.value ?? 0;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  // hash both sides so the comparison is constant time over equal lengths
  const [a, b] = await Promise.all([digest(given), digest(env.ADMIN_TOKEN)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

const digest = (s) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
const sha256 = async (s) => [...new Uint8Array(await digest(s))].map((b) => b.toString(16).padStart(2, '0')).join('');
