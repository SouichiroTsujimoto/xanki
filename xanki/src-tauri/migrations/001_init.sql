CREATE TABLE IF NOT EXISTS decks (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
  id          TEXT PRIMARY KEY,
  deck_id     TEXT NOT NULL REFERENCES decks(id),
  kind        TEXT NOT NULL,
  content     TEXT,
  image_path  TEXT,
  ocr_text    TEXT,
  ocr_data    TEXT,
  masks       TEXT NOT NULL,
  note        TEXT,
  source_hint TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);

CREATE TABLE IF NOT EXISTS review_state (
  card_id     TEXT PRIMARY KEY REFERENCES cards(id),
  box         INTEGER NOT NULL DEFAULT 1,
  due_at      INTEGER NOT NULL,
  last_result INTEGER
);

CREATE TABLE IF NOT EXISTS review_logs (
  id          TEXT PRIMARY KEY,
  card_id     TEXT NOT NULL REFERENCES cards(id),
  result      INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_deleted_at ON cards(deleted_at);
CREATE INDEX IF NOT EXISTS idx_review_state_due_at ON review_state(due_at);
