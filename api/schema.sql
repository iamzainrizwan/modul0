-- guestbook messages and the site-wide view counter.
-- apply with: npx wrangler d1 execute modul0 --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- salted sha-256 of the poster's ip, only for rate limiting. never returned.
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_ip ON messages (ip_hash, created);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('views', 0);

-- one row per visitor (salted ip hash) for today only, so the counter moves
-- once per visitor per day. older days are pruned by the worker.
CREATE TABLE IF NOT EXISTS visits (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (ip_hash, day)
);

-- the pixel wall on the guestbook page: 32x32, one pixel a day per visitor.
-- every placement is kept and the wall is the newest row per cell, so
-- undoing a poster brings back whatever their pixels covered.
CREATE TABLE IF NOT EXISTS pixels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  -- 0 blank, 1 purple, 2 ink
  color INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS pixels_cell ON pixels (x, y, id);
CREATE INDEX IF NOT EXISTS pixels_ip ON pixels (ip_hash, created);

-- zain's replies to guestbook messages (one per message, shown under it).
-- a table of its own: sqlite can't add a column "if not exists", and this
-- file has to stay safe to re-run.
CREATE TABLE IF NOT EXISTS replies (
  message_id INTEGER PRIMARY KEY,
  reply TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
