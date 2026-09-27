CREATE TABLE IF NOT EXISTS post_loves (
  slug TEXT NOT NULL,
  client_id TEXT NOT NULL,
  claps INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (slug, client_id)
);
