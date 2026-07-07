CREATE TABLE IF NOT EXISTS user_revisions (
  user_id TEXT PRIMARY KEY,
  rev INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS decks (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks (user_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cards (
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
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_cards_user_deck ON cards (user_id, deck_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS review_state (
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  box INTEGER NOT NULL,
  due_at INTEGER NOT NULL,
  last_result INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, card_id)
);

CREATE TABLE IF NOT EXISTS review_logs (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  result INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS blobs (
  user_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_referenced_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, hash)
);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  storage_limit INTEGER NOT NULL,
  ai_credits_month INTEGER NOT NULL,
  ai_credits_remaining INTEGER NOT NULL DEFAULT 0,
  valid_until INTEGER,
  updated_at INTEGER NOT NULL
);
