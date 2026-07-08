CREATE TABLE IF NOT EXISTS study_sessions (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  track TEXT NOT NULL,
  deck_id TEXT,
  mode TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  cards_total INTEGER NOT NULL,
  cards_completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
  ON study_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS study_events (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  deck_id TEXT,
  card_id TEXT,
  grade INTEGER,
  occurred_at INTEGER NOT NULL,
  local_date TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_study_events_user_local_date
  ON study_events (user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_study_events_user_occurred
  ON study_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_events_user_session
  ON study_events (user_id, session_id);

CREATE TABLE IF NOT EXISTS study_daily_stats (
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  leitner_count INTEGER NOT NULL DEFAULT 0,
  deck_study_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed
  ON review_logs (user_id, reviewed_at);

INSERT INTO study_events (
  user_id,
  id,
  session_id,
  event_type,
  deck_id,
  card_id,
  grade,
  occurred_at,
  local_date
)
SELECT
  rl.user_id,
  rl.id,
  NULL,
  'leitner_review',
  c.deck_id,
  rl.card_id,
  rl.result,
  rl.reviewed_at,
  strftime('%Y-%m-%d', rl.reviewed_at / 1000, 'unixepoch')
FROM review_logs rl
LEFT JOIN cards c
  ON c.user_id = rl.user_id AND c.id = rl.card_id
WHERE NOT EXISTS (
  SELECT 1 FROM study_events se
  WHERE se.user_id = rl.user_id AND se.id = rl.id
);

INSERT INTO study_daily_stats (user_id, local_date, leitner_count, deck_study_count, total_count, updated_at)
SELECT
  user_id,
  local_date,
  SUM(CASE WHEN event_type = 'leitner_review' THEN 1 ELSE 0 END) AS leitner_count,
  SUM(CASE WHEN event_type IN ('deck_card_known', 'deck_card_still') THEN 1 ELSE 0 END) AS deck_study_count,
  COUNT(*) AS total_count,
  MAX(occurred_at) AS updated_at
FROM study_events
GROUP BY user_id, local_date
ON CONFLICT(user_id, local_date) DO UPDATE SET
  leitner_count = excluded.leitner_count,
  deck_study_count = excluded.deck_study_count,
  total_count = excluded.total_count,
  updated_at = excluded.updated_at;
