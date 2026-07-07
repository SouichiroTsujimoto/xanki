-- Composite FK: cards(user_id, deck_id) -> decks(user_id, id)
PRAGMA foreign_keys = OFF;

CREATE TABLE cards_new (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT,
  answer TEXT,
  image_hash TEXT,
  ocr_text TEXT,
  ocr_data TEXT,
  masks TEXT NOT NULL,
  note TEXT,
  source_hint TEXT,
  starred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, deck_id) REFERENCES decks(user_id, id)
);

INSERT INTO cards_new SELECT * FROM cards;

DROP TABLE cards;
ALTER TABLE cards_new RENAME TO cards;

CREATE INDEX IF NOT EXISTS idx_cards_user_deck ON cards (user_id, deck_id) WHERE deleted_at IS NULL;

PRAGMA foreign_keys = ON;
