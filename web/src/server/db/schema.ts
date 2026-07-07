import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

export const userRevisions = sqliteTable("user_revisions", {
  userId: text("user_id").primaryKey(),
  rev: integer("rev").notNull().default(0),
});

export const decks = sqliteTable(
  "decks",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.id] }),
    userIdx: index("idx_decks_user").on(t.userId),
  }),
);

export const cards = sqliteTable(
  "cards",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    deckId: text("deck_id").notNull(),
    kind: text("kind").notNull(),
    content: text("content"),
    answer: text("answer"),
    imageHash: text("image_hash"),
    ocrText: text("ocr_text"),
    ocrData: text("ocr_data"),
    masks: text("masks").notNull(),
    note: text("note"),
    sourceHint: text("source_hint"),
    starred: integer("starred").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.id] }),
    deckIdx: index("idx_cards_user_deck").on(t.userId, t.deckId),
  }),
);

export const reviewState = sqliteTable(
  "review_state",
  {
    userId: text("user_id").notNull(),
    cardId: text("card_id").notNull(),
    box: integer("box").notNull(),
    dueAt: integer("due_at").notNull(),
    lastResult: integer("last_result"),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.cardId] }),
  }),
);

export const reviewLogs = sqliteTable(
  "review_logs",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    cardId: text("card_id").notNull(),
    result: integer("result").notNull(),
    reviewedAt: integer("reviewed_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.id] }),
  }),
);

export const blobs = sqliteTable(
  "blobs",
  {
    userId: text("user_id").notNull(),
    hash: text("hash").notNull(),
    size: integer("size").notNull(),
    mime: text("mime").notNull(),
    createdAt: integer("created_at").notNull(),
    lastReferencedAt: integer("last_referenced_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.hash] }),
  }),
);

export const entitlements = sqliteTable("entitlements", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").notNull().default("free"),
  storageLimit: integer("storage_limit").notNull(),
  aiCreditsMonth: integer("ai_credits_month").notNull(),
  aiCreditsRemaining: integer("ai_credits_remaining").notNull().default(0),
  validUntil: integer("valid_until"),
  updatedAt: integer("updated_at").notNull(),
});
