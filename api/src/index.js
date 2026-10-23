// modul0-api: the guestbook and the view counter behind modul0.dev.
//
//   GET    /messages               newest first, at most 100
//   POST   /messages               json from the page, or a plain form post (no js),
//                                  which is redirected back to the guestbook
//   GET    /admin/messages         the same plus a short poster tag   } need
//   DELETE /messages/:id           one message                        } Authorization:
//   DELETE /messages?poster=tag    everything from one poster         } Bearer ADMIN_TOKEN
//   PUT    /messages/:id/reply     zain's reply under a message       }
//                                  ({reply}; empty removes it)
//   GET    /views                  the count
//   POST   /views                  count this visit (once per visitor per day)
//   POST   /hit                    log a page load: {path, ref} (kept HITS_DAYS)
//   GET    /admin/stats?days=n     visits by day, top pages, referrers,     } admin
//                                  countries and the latest page loads     }
//   GET    /admin/posts            every blog post's markdown, with its sha }
//   GET    /admin/content          every src/data/content/*.json, ditto     }
//   PUT    /admin/files            save one file: {path, text or base64,    }
//                                  sha (none = new)}; a commit to main,     }
//                                  which redeploys                          }
//   DELETE /admin/files?path=&sha= delete one (also a commit)               }
//   GET    /wall                   the pixel wall, plus how long until you can place
//   GET    /wall.svg               the same as an image (the page without js)
//   POST   /wall                   place one pixel: {x, y, color}, one a day each
//   GET    /wall/history           every placement in order, for the replay
//   GET    /admin/wall             recent placements with poster tags     } admin
//   DELETE /wall?poster=tag        undo everything from one poster        }
//   DELETE /wall?all=1             clear the wall                         }
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
// the wall: SIZE x SIZE cells, colours 0 blank, 1 purple, 2 ink
const SIZE = 32;
const COLORS = 3;
const WALL_SITE_DAY = 1000; // placements a day for everyone, so a botnet can't repaint it all
const HISTORY_MAX = 20000; // placements the replay gets (the newest, if there are more)
const PLACE_MAX = 256; // bytes: a placement is {x, y, color}
const HITS_DAYS = 90; // page loads kept for the stats
const HIT_MAX = 512; // bytes: a hit is {path, ref}
const TOP_MAX = 15; // rows in each stats top list
const FILE_MAX = 6_000_000; // bytes in one saved file (an image, after the page shrinks it)
const POSTS_MAX = 40; // files a listing loads (one github fetch each; workers allow 50)
const POSTS_DIR = 'src/content/blog';
const CONTENT_DIR = 'src/data/content';
// the only files the admin can write: posts, the site's content, post images
const EDITABLE = [
  /^src\/content\/blog\/[a-z0-9][a-z0-9-]{0,80}\.md$/,
  /^src\/data\/content\/[a-z0-9-]{1,40}\.json$/,
  /^public\/blog\/[a-z0-9][a-z0-9-]{0,80}\/[a-z0-9][a-z0-9._-]{0,80}\.(png|jpe?g|webp|gif)$/,
];

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
      `SELECT m.id, m.name, m.message, m.created, r.reply, r.created AS replied
       FROM messages m LEFT JOIN replies r ON r.message_id = m.id ORDER BY m.id DESC LIMIT ?`,
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

  if (pathname === '/hit' && method === 'POST') {
    if (!(await allow(env.VIEW_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    return hit(request, env, ip);
  }

  if ((pathname === '/wall' || pathname === '/wall.svg') && method === 'GET') {
    if (!(await allow(env.READ_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    const { cells } = await wallState(env);
    if (pathname === '/wall.svg') {
      return new Response(svg(cells), { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=60' } });
    }
    return json({ size: SIZE, cells, wait: await wallWait(env, ip) });
  }

  if (pathname === '/wall/history' && method === 'GET') {
    if (!(await allow(env.READ_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    const { moves } = await wallState(env);
    return json({ size: SIZE, moves, max: HISTORY_MAX }, 200, { 'cache-control': 'public, max-age=60' });
  }

  if (pathname === '/wall' && method === 'POST') {
    if (!(await allow(env.WALL_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    return place(request, env, ip);
  }

  // everything below is admin
  const one = pathname.match(/^\/messages\/(\d+)$/);
  const replyTo = pathname.match(/^\/messages\/(\d+)\/reply$/);
  const admin =
    ((pathname === '/admin/posts' || pathname === '/admin/content') && method === 'GET') ||
    (pathname === '/admin/files' && (method === 'PUT' || method === 'DELETE')) ||
    ((pathname === '/admin/messages' || pathname === '/admin/wall' || pathname === '/admin/stats') && method === 'GET') ||
    (method === 'DELETE' && (one || pathname === '/messages' || pathname === '/wall')) ||
    (method === 'PUT' && replyTo);
  if (admin) {
    if (!(await allow(env.ADMIN_LIMIT, ip))) return json({ error: 'slow-down' }, 429);
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorised' }, 401);

    if (replyTo) return setReply(request, env, Number(replyTo[1]));
    if (pathname === '/admin/stats') return stats(env, url);
    if (pathname === '/admin/posts') return listFiles(env, POSTS_DIR, '.md');
    if (pathname === '/admin/content') return listFiles(env, CONTENT_DIR, '.json');
    if (pathname === '/admin/files' && method === 'PUT') return saveFile(request, env);
    if (pathname === '/admin/files') return deleteFile(env, url.searchParams.get('path') ?? '', url.searchParams.get('sha') ?? '');
    if (pathname === '/admin/wall') {
      const { results } = await env.DB.prepare(
        'SELECT id, x, y, color, created, substr(ip_hash, 1, 8) AS poster FROM pixels ORDER BY id DESC LIMIT ?',
      ).bind(LIST_MAX).all();
      return json({ pixels: results });
    }
    if (pathname === '/wall') {
      if (url.searchParams.get('all') === '1') {
        const { meta } = await env.DB.prepare('DELETE FROM pixels').run();
        await rebuildWall(env);
        return json({ deleted: meta.changes });
      }
      const poster = url.searchParams.get('poster') ?? '';
      if (!/^[0-9a-f]{8}$/.test(poster)) return json({ error: 'bad-request' }, 400);
      const { meta } = await env.DB.prepare('DELETE FROM pixels WHERE substr(ip_hash, 1, 8) = ?').bind(poster).run();
      await rebuildWall(env);
      return json({ deleted: meta.changes });
    }
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT m.id, m.name, m.message, m.created, substr(m.ip_hash, 1, 8) AS poster, r.reply, r.created AS replied
         FROM messages m LEFT JOIN replies r ON r.message_id = m.id ORDER BY m.id DESC LIMIT ?`,
      ).bind(LIST_MAX).all();
      return json({ messages: results });
    }
    // a message's reply goes with it
    if (one) {
      const id = Number(one[1]);
      const [, gone] = await env.DB.batch([
        env.DB.prepare('DELETE FROM replies WHERE message_id = ?').bind(id),
        env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id),
      ]);
      return json({ deleted: gone.meta.changes });
    }
    const poster = url.searchParams.get('poster') ?? '';
    if (!/^[0-9a-f]{8}$/.test(poster)) return json({ error: 'bad-request' }, 400);
    const [, gone] = await env.DB.batch([
      env.DB.prepare('DELETE FROM replies WHERE message_id IN (SELECT id FROM messages WHERE substr(ip_hash, 1, 8) = ?)').bind(poster),
      env.DB.prepare('DELETE FROM messages WHERE substr(ip_hash, 1, 8) = ?').bind(poster),
    ]);
    return json({ deleted: gone.meta.changes });
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

// zain's reply under a message (admin only): cleaned like a message, same
// length cap; an empty reply removes it
async function setReply(request, env, id) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > BODY_MAX) return json({ error: 'too-long' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const text = clean(body?.reply, true);
  if ([...text].length > MESSAGE_MAX) return json({ error: 'too-long' }, 400);
  const exists = await env.DB.prepare('SELECT 1 FROM messages WHERE id = ?').bind(id).first();
  if (!exists) return json({ error: 'not found' }, 404);
  if (!text) {
    await env.DB.prepare('DELETE FROM replies WHERE message_id = ?').bind(id).run();
    return json({ ok: true, reply: null });
  }
  const row = await env.DB.prepare(
    `INSERT INTO replies (message_id, reply) VALUES (?1, ?2)
     ON CONFLICT (message_id) DO UPDATE SET reply = ?2, created = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
     RETURNING reply, created`,
  ).bind(id, text).first();
  return json({ ok: true, reply: row.reply, replied: row.created });
}

// a discord ping for each new message (DISCORD_WEBHOOK secret; skipped if
// unset). the text goes in a code block so it shows exactly as written, with
// no markdown or links rendered, and allowed_mentions is empty so a message
// can never ping @everyone or anyone else.
async function notify(env, row, hash) {
  if (!env.DISCORD_WEBHOOK) return;
  const plain = (s, max) => [...String(s).replace(/`/g, "'")].slice(0, max).join('');
  const admin = new URL('/admin/', env.RETURN_URL).toString();
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

// the wall as it stands: cells, SIZE*SIZE digits row by row, and moves, the
// replay (3 base-32 chars a placement: x, y, colour; oldest first). read from
// the one wall_state row; built from pixels the first time, or after an admin
// undo or clear. a full scan, so only then
async function wallState(env) {
  const row = await env.DB.prepare('SELECT cells, moves FROM wall_state WHERE id = 1').first();
  return row ?? rebuildWall(env);
}

async function rebuildWall(env) {
  const cells = Array(SIZE * SIZE).fill('0');
  const [latest, recent] = await env.DB.batch([
    env.DB.prepare('SELECT x, y, color FROM pixels WHERE id IN (SELECT MAX(id) FROM pixels GROUP BY x, y)'),
    env.DB.prepare('SELECT x, y, color FROM pixels ORDER BY id DESC LIMIT ?').bind(HISTORY_MAX),
  ]);
  for (const p of latest.results) cells[p.y * SIZE + p.x] = String(p.color);
  const state = { cells: cells.join(''), moves: recent.results.reverse().map(move).join('') };
  await env.DB.prepare('INSERT OR REPLACE INTO wall_state (id, cells, moves) VALUES (1, ?, ?)').bind(state.cells, state.moves).run();
  return state;
}

const move = (p) => p.x.toString(32) + p.y.toString(32) + p.color.toString(32);

// seconds until this visitor's next pixel: one per utc day
async function wallWait(env, ip) {
  const hash = await sha256((env.IP_SALT ?? '') + ip);
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM pixels WHERE ip_hash = ? AND created >= ?').bind(hash, `${day}T00:00:00Z`).first();
  if (!row?.n) return 0;
  const midnight = Date.parse(`${day}T00:00:00Z`) + 86400 * 1000;
  return Math.ceil((midnight - Date.now()) / 1000);
}

async function place(request, env, ip) {
  if (Number(request.headers.get('content-length') ?? 0) > PLACE_MAX) return json({ error: 'too-long' }, 413);
  let body;
  try {
    // the header can be missing (a chunked body), so check what actually came
    const raw = await request.text();
    if (raw.length > PLACE_MAX) return json({ error: 'too-long' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const { x, y, color } = body ?? {};
  const cell = (n, max) => Number.isInteger(n) && n >= 0 && n < max;
  if (!cell(x, SIZE) || !cell(y, SIZE) || !cell(color, COLORS)) return json({ error: 'bad-request' }, 400);

  const wait = await wallWait(env, ip);
  if (wait > 0) return json({ error: 'one-a-day', wait }, 429);
  const today = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  const everyone = await env.DB.prepare('SELECT COUNT(*) AS n FROM pixels WHERE created >= ?').bind(today).first();
  if (everyone.n >= WALL_SITE_DAY) return json({ error: 'wall-busy' }, 429);
  // painting a cell the colour it already is would waste the day's pixel
  const { cells } = await wallState(env);
  const i = y * SIZE + x;
  if (cells[i] === String(color)) return json({ error: 'same' }, 409);

  // the once-a-day check again inside the insert, so two requests racing
  // each other can't both land
  const hash = await sha256((env.IP_SALT ?? '') + ip);
  const { meta } = await env.DB.prepare(
    'INSERT INTO pixels (x, y, color, ip_hash) SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS (SELECT 1 FROM pixels WHERE ip_hash = ?4 AND created >= ?5)',
  ).bind(x, y, color, hash, today).run();
  if (!meta.changes) return json({ error: 'one-a-day', wait: await wallWait(env, ip) }, 429);
  // the wall row, updated in one statement so two people placing at once
  // can't overwrite each other's cell; the replay keeps its newest moves
  await env.DB.prepare(
    'UPDATE wall_state SET cells = substr(cells, 1, ?1) || ?2 || substr(cells, ?1 + 2), moves = substr(moves || ?3, -?4) WHERE id = 1',
  ).bind(i, String(color), move({ x, y, color }), HISTORY_MAX * 3).run();
  const after = cells.slice(0, i) + color + cells.slice(i + 1);
  return json({ ok: true, cells: after, wait: await wallWait(env, ip) }, 201);
}

// the wall as an image, drawn for black like the 404 snake: purple and white on #000
function svg(cells) {
  const fill = ['', '#a769ff', '#fff'];
  const rects = [...cells]
    .map((c, i) => (c === '0' ? '' : `<rect x="${i % SIZE}" y="${Math.floor(i / SIZE)}" width="1" height="1" fill="${fill[c]}"/>`))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="512" height="512" shape-rendering="crispEdges"><rect width="${SIZE}" height="${SIZE}" fill="#000"/>${rects}</svg>`;
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

// a page load for the stats. the path is the site's own (checked against a
// plain pattern, query and hash dropped by the page); the referrer keeps only
// its host, and only when it's another site. old rows are pruned as we go.
async function hit(request, env, ip) {
  if (Number(request.headers.get('content-length') ?? 0) > HIT_MAX) return json({ error: 'too-long' }, 413);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > HIT_MAX) return json({ error: 'too-long' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const path = String(body?.path ?? '');
  if (!/^\/[a-z0-9/._-]{0,120}$/i.test(path)) return json({ error: 'bad-request' }, 400);
  let ref = null;
  try {
    const host = new URL(String(body?.ref ?? '')).hostname.toLowerCase();
    const own = origins(env).map((o) => new URL(o).hostname);
    if (host && !own.includes(host)) ref = host.slice(0, 80);
  } catch {}
  const country = typeof request.cf?.country === 'string' ? request.cf.country.slice(0, 2) : null;
  const visitor = (await sha256((env.IP_SALT ?? '') + ip)).slice(0, 8);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM hits WHERE at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)").bind(`-${HITS_DAYS} days`),
    env.DB.prepare('INSERT INTO hits (path, ref, country, visitor) VALUES (?, ?, ?, ?)').bind(path, ref, country, visitor),
  ]);
  return json({ ok: true }, 201);
}

// the admin stats over the last n days (1 to HITS_DAYS): one batch, one scan
// of the window per list
async function stats(env, url) {
  const days = Math.min(HITS_DAYS, Math.max(1, Number(url.searchParams.get('days')) || 30));
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 19) + 'Z';
  const q = (sql, ...args) => env.DB.prepare(sql).bind(since, ...args);
  const [total, daily, pages, refs, countries, recent] = await env.DB.batch([
    q('SELECT COUNT(*) AS hits, COUNT(DISTINCT visitor) AS visitors FROM hits WHERE at >= ?'),
    q('SELECT substr(at, 1, 10) AS day, COUNT(*) AS hits, COUNT(DISTINCT visitor) AS visitors FROM hits WHERE at >= ? GROUP BY day ORDER BY day'),
    q('SELECT path, COUNT(*) AS hits, COUNT(DISTINCT visitor) AS visitors FROM hits WHERE at >= ? GROUP BY path ORDER BY hits DESC LIMIT ?', TOP_MAX),
    q('SELECT ref, COUNT(*) AS hits FROM hits WHERE at >= ? AND ref IS NOT NULL GROUP BY ref ORDER BY hits DESC LIMIT ?', TOP_MAX),
    q('SELECT country, COUNT(DISTINCT visitor) AS visitors FROM hits WHERE at >= ? AND country IS NOT NULL GROUP BY country ORDER BY visitors DESC LIMIT ?', TOP_MAX),
    q('SELECT at, path, ref, country, visitor FROM hits WHERE at >= ? ORDER BY at DESC LIMIT ?', LIST_MAX),
  ]);
  return json({
    days,
    views: await views(env),
    ...total.results[0],
    daily: daily.results,
    pages: pages.results,
    refs: refs.results,
    countries: countries.results,
    recent: recent.results,
  });
}

// the admin edits the repo's own files (EDITABLE: posts, the site's content
// json, post images) through github's contents api with the GITHUB_TOKEN
// secret (a fine-grained token, contents read and write on this repo only).
// each save is a commit to GITHUB_BRANCH, and the push redeploys the site.
// GITHUB_API is only there so local dev can point at a mock.
async function gh(env, path, init = {}) {
  const base = env.GITHUB_API ?? 'https://api.github.com';
  return fetch(`${base}/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'modul0-api',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
}
const branch = (env) => env.GITHUB_BRANCH ?? 'main';
const github = (env) => !!(env.GITHUB_TOKEN && env.GITHUB_REPO);
const editable = (path) => EDITABLE.some((re) => re.test(path));

// every file in dir ending in ext, as {name, path, sha, text}
async function listFiles(env, dir, ext) {
  if (!github(env)) return json({ error: 'no-github' }, 503);
  const res = await gh(env, `${dir}?ref=${branch(env)}`);
  if (res.status === 404) return json({ files: [] });
  if (!res.ok) return json({ error: 'github', status: res.status }, 502);
  const list = (await res.json()).filter((f) => f.type === 'file' && f.name.endsWith(ext)).slice(0, POSTS_MAX);
  const files = await Promise.all(
    list.map(async (f) => {
      const r = await gh(env, `${dir}/${f.name}?ref=${branch(env)}`);
      if (!r.ok) return null;
      const d = await r.json();
      return { name: f.name.slice(0, -ext.length), path: `${dir}/${f.name}`, sha: d.sha, text: fromBase64(d.content) };
    }),
  );
  return json({ files: files.filter(Boolean) });
}

// {path, text} or {path, base64} (images), with the sha it was loaded at;
// no sha makes a new file
async function saveFile(request, env) {
  if (!github(env)) return json({ error: 'no-github' }, 503);
  if (Number(request.headers.get('content-length') ?? 0) > FILE_MAX * 1.4) return json({ error: 'too-long' }, 413);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > FILE_MAX * 1.4) return json({ error: 'too-long' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const path = String(body?.path ?? '');
  if (!editable(path)) return json({ error: 'not-editable' }, 400);
  let content;
  if (typeof body.base64 === 'string') {
    content = body.base64.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+=*$/.test(content) || content.length > FILE_MAX * 1.37) return json({ error: 'bad-request' }, 400);
  } else {
    const text = String(body.text ?? '');
    if (!text.trim() || new TextEncoder().encode(text).length > FILE_MAX) return json({ error: 'bad-request' }, 400);
    // content json must stay json, or the next build fails
    if (path.endsWith('.json')) try { JSON.parse(text); } catch { return json({ error: 'bad-json' }, 400); }
    content = toBase64(text);
  }
  const sha = typeof body.sha === 'string' && body.sha ? body.sha : undefined;
  const name = path.split('/').pop();
  const res = await gh(env, path, {
    method: 'PUT',
    body: JSON.stringify({ message: `${sha ? 'update' : 'add'} ${name} from admin`, content, branch: branch(env), sha }),
  });
  // 409/422: the file changed since it was loaded, or a new file's name is taken
  if (res.status === 409 || res.status === 422) return json({ error: 'conflict' }, 409);
  if (!res.ok) return json({ error: 'github', status: res.status }, 502);
  const d = await res.json();
  return json({ ok: true, sha: d.content.sha });
}

async function deleteFile(env, path, sha) {
  if (!github(env)) return json({ error: 'no-github' }, 503);
  if (!editable(path) || !/^[0-9a-f]{40}$/.test(sha)) return json({ error: 'bad-request' }, 400);
  const res = await gh(env, path, {
    method: 'DELETE',
    body: JSON.stringify({ message: `delete ${path.split('/').pop()} from admin`, sha, branch: branch(env) }),
  });
  if (res.status === 409 || res.status === 422) return json({ error: 'conflict' }, 409);
  if (!res.ok) return json({ error: 'github', status: res.status }, 502);
  return json({ ok: true });
}

function toBase64(s) {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
}
const fromBase64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

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
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
