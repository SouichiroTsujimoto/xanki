ALTER TABLE cards ADD COLUMN image_hash TEXT;

ALTER TABLE review_state ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

UPDATE review_state SET updated_at = due_at WHERE updated_at = 0;

CREATE TABLE IF NOT EXISTS sync_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_seq INTEGER NOT NULL DEFAULT 0,
  device_id TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO sync_meta (id, last_seq, device_id) VALUES (1, 0, '');

CREATE TABLE IF NOT EXISTS pending_uploads (
  hash TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_image_hash ON cards(image_hash);
