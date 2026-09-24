// modul0-api: the guestbook and the view counter behind modul0.dev.
//
//   GET    /messages               newest first, at most 100
//   POST   /messages               json from the page, or a plain form post (no js),
//                                  which is redirected back to the guestbook
//   GET    /admin/messages         the same plus a short poster tag   } need
//   DELETE /messages/:id           one message                        } Authorization:
//   DELETE /messages?poster=tag    everything from one poster         } Bearer ADMIN_TOKEN
//   GET    /views                  the count
//   POST   /views                  count this visit (once per visitor per day)
//
// each new message pings discord (notify). messages go live straight away,
// so everything that can be abused is capped:
// - writes only from the site's own origins (a page elsewhere can't post or
//   pump the counter through its visitors' browsers)
// - per-ip rate limits on every endpoint (workers rate limiting bindings)
// - per-ip and site-wide daily caps on messages, a 60s gap between posts
// - request size, name and message length caps
// - a honeypot field, duplicate and link-spam rejection, reserved names
// - invisible and direction-changing unicode stripped
// ips are never stored, only a salted hash.

const NAME_MAX = 40;
const MESSAGE_MAX = 500;
const BODY_MAX = 4096; // bytes, well over a full message
const LIST_MAX = 100;
const GAP_SECONDS = 60; // between posts from one ip
const PER_IP_DAY = 10;
const SITE_DAY = 200; // everyone, so a flood can't bury the page
const LINKS_MAX = 2;
// nobody else gets to sign as me (compared lowercase with spaces and punctuation removed)
const RESERVED = ['zain', 'zainrizwan', 'iamzainrizwan', 'admin', 'modul0', 'moderator'];

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const res = await route(request, env, new URL(request.url), ctx);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      res.headers.set('x-content-type-options', 'nosniff');
      return res;
    } catch (err) {
      console.error(err);
      return json({ error: 'server' }, 500, cors);
    }
  },
};

async function route(request, env, url, ctx) {
  const { pathname } = url;
  const method = request.method;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';

  // browsers send Origin on every cross-origin write, form posts included
  if (method !== 'GET' && !allowedOrigin(request, env)) return json({ error: 'forbidden' }, 403);

  if (pathname === '/messages' && method === 'GET') {
    if (!(await allow(env.READ_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    const { results } = await env.DB.prepare(
      'SELECT id, name, message, created FROM messages ORDER BY id DESC LIMIT ?',
    ).bind(LIST_MAX).all();
    return json({ messages: results });
  }

  if (pathname === '/messages' && method === 'POST') {
    const isForm = !(request.headers.get('content-type') ?? '').includes('application/json');
    if (!(await allow(env.WRITE_LIMIT, ip))) return reply(isForm, env, { error: 'slow-down' }, 429);
    return post(request, env, ip, isForm, ctx);
  }

  if (pathname === '/views') {
    if (!(await allow(env.VIEW_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    if (method === 'GET') return json({ views: await views(env) });
    if (method === 'POST') return json({ views: await countVisit(env, ip) });
  }

  // everything below is admin
  const one = pathname.match(/^\/messages\/(\d+)$/);
  const admin = (pathname === '/admin/messages' && method === 'GET') || (method === 'DELETE' && (one || pathname === '/messages'));
  if (admin) {
    if (!(await allow(env.ADMIN_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorised' }, 401);

    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, message, created, substr(ip_hash, 1, 8) AS poster FROM messages ORDER BY id DESC LIMIT ?',
      ).bind(LIST_MAX).all();
      return json({ messages: results });
    }
    if (one) {
      const { meta } = await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(Number(one[1])).run();
      return json({ deleted: meta.changes });
    }
    const poster = url.searchParams.get('poster') ?? '';
    if (!/^[0-9a-f]{8}$/.test(poster)) return json({ error: 'bad-request' }, 400);
    const { meta } = await env.DB.prepare('DELETE FROM messages WHERE substr(ip_hash, 1, 8) = ?').bind(poster).run();
    return json({ deleted: meta.changes });
  }

  return json({ error: 'not found' }, 404);
}

async function post(request, env, ip, isForm, ctx) {
  if (Number(request.headers.get('content-length') ?? 0) > BODY_MAX) return reply(isForm, env, { error: 'too-long' }, 413);
  const raw = await request.text();
  if (raw.length > BODY_MAX) return reply(isForm, env, { error: 'too-long' }, 413);
  let body;
  try {
    body = isForm ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw);
    if (!body || typeof body !== 'object') throw new Error();
  } catch {
    return reply(isForm, env, { error: 'bad-request' }, 400);
  }

  // the honeypot is hidden from people; anything filling it is a bot. pretend it worked.
  if (String(body.website ?? '').trim()) return reply(isForm, env, { ok: true }, 201);

  const name = [...clean(body.name, false)].slice(0, NAME_MAX).join('').trim() || 'anonymous';
  const message = clean(body.message, true);
  if (!message) return reply(isForm, env, { error: 'empty' }, 400);
  if ([...message].length > MESSAGE_MAX) return reply(isForm, env, { error: 'too-long' }, 400);
  if (RESERVED.includes(name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))) return reply(isForm, env, { error: 'reserved-name' }, 400);
  if ((message.match(/https?:\/\/|www\./gi) ?? []).length > LINKS_MAX) return reply(isForm, env, { error: 'links' }, 400);

  const hash = await sha256((env.IP_SALT ?? '') + ip);
  const limits = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM messages WHERE ip_hash = ?1 AND created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?2)) AS recent,
       (SELECT COUNT(*) FROM messages WHERE ip_hash = ?1 AND created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')) AS mine,
       (SELECT COUNT(*) FROM messages WHERE created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 day')) AS everyone,
       (SELECT COUNT(*) FROM messages WHERE message = ?3 AND created > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-7 days')) AS dupes`,
  ).bind(hash, `-${GAP_SECONDS} seconds`, message).first();
  if (limits.dupes > 0) return reply(isForm, env, { error: 'duplicate' }, 409);
  if (limits.recent > 0 || limits.mine >= PER_IP_DAY || limits.everyone >= SITE_DAY) {
    return reply(isForm, env, { error: 'slow-down' }, 429);
  }

  const row = await env.DB.prepare(
    'INSERT INTO messages (name, message, ip_hash) VALUES (?, ?, ?) RETURNING id, name, message, created',
  ).bind(name, message, hash).first();
  // tell zain, without holding up the reply (a failed ping never fails the post)
  ctx?.waitUntil(notify(env, row, hash));
  return reply(isForm, env, { ok: true, message: row }, 201);
}

// a discord ping for each new message (DISCORD_WEBHOOK secret; skipped if
// unset). the text goes in a code block so it shows exactly as written, with
// no markdown or links rendered, and allowed_mentions is empty so a message
// can never ping @everyone or anyone else.
async function notify(env, row, hash) {
  if (!env.DISCORD_WEBHOOK) return;
  const plain = (s, max) => [...String(s).replace(/`/g, "'")].slice(0, max).join('');
  const admin = new URL('admin/', env.RETURN_URL).toString();
  try {
    const res = await fetch(env.DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'modul0 guestbook',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: `New message from ${plain(row.name, 60)}`,
            url: admin,
            description: `\`\`\`\n${plain(row.message, 1000)}\n\`\`\``,
            color: 0xa769ff,
            fields: [{ name: 'Moderate', value: `[open the admin page](${admin})`, inline: true }],
            footer: { text: `#${row.id} · poster ${hash.slice(0, 8)}` },
            timestamp: new Date(row.created).toISOString(),
          },
        ],
      }),
    });
    if (!res.ok) console.error('discord ping rejected', res.status, await res.text());
  } catch (err) {
    console.error('discord ping failed', err);
  }
}

// trims and drops control characters, invisible characters (zero-width,
// bidi overrides that flip text direction) and stacks of combining marks
// (zalgo). newlines survive only in the message, never more than one blank
// line in a row.
function clean(value, multiline) {
  let s = String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n');
  s = s.replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g : /[\u0000-\u001f\u007f-\u009f]/g, '');
  s = s.replace(/[\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/g, '');
  s = s.replace(/(\p{M}{2})\p{M}+/gu, '$1');
  if (multiline) s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
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

// one visit per visitor per utc day: the salted ip hash and the day go in
// `visits`, and the counter only moves when that pair is new. old days are
// pruned as we go, so the table stays one day big.
async function countVisit(env, ip) {
  const day = new Date().toISOString().slice(0, 10);
  const hash = await sha256(`${env.IP_SALT ?? ''}${ip}`);
  const [, inserted] = await env.DB.batch([
    env.DB.prepare('DELETE FROM visits WHERE day < ?').bind(day),
    env.DB.prepare('INSERT OR IGNORE INTO visits (ip_hash, day) VALUES (?, ?)').bind(hash, day),
  ]);
  if (inserted.meta.changes > 0) {
    const row = await env.DB.prepare("UPDATE counters SET value = value + 1 WHERE name = 'views' RETURNING value").first();
    return row?.value ?? 0;
  }
  return views(env);
}

// a missing binding (older config) fails open rather than taking the site down
async function allow(limiter, key) {
  if (!limiter) return true;
  const { success } = await limiter.limit({ key });
  return success;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  // hash both sides so the comparison is constant time over equal lengths
  const [a, b] = await Promise.all([digest(given), digest(env.ADMIN_TOKEN)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const origins = (env) => (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const allowedOrigin = (request, env) => origins(env).includes(request.headers.get('origin') ?? '');

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  if (!origin || !origins(env).includes(origin)) return {};
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
