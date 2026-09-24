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
