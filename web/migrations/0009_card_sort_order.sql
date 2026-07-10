-- User-defined card order within a deck (deck study list / coverflow / non-shuffle study).
ALTER TABLE cards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Backfill: created_at order (stable, matches historical insertion-ish order).
UPDATE cards SET sort_order = created_at;
