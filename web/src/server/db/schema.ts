import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

export const userRevisions = sqliteTable("user_revisions", {
  userId: text("user_id").primaryKey(),
  rev: integer("rev").notNull().default(0),
});

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id").primaryKey(),
  schedulerConfig: text("scheduler_config"),
  updatedAt: integer("updated_at").notNull(),
});

export const decks = sqliteTable(
  "decks",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    schedulerConfig: text("scheduler_config"),
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
    sortOrder: integer("sort_order").notNull().default(0),
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
    phase: text("phase").notNull().default("review"),
    step: integer("step").notNull().default(0),
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
    userReviewedIdx: index("idx_review_logs_user_reviewed").on(t.userId, t.reviewedAt),
  }),
);

export const studySessions = sqliteTable(
  "study_sessions",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    track: text("track").notNull(),
    deckId: text("deck_id"),
    mode: text("mode"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    cardsTotal: integer("cards_total").notNull(),
    cardsCompleted: integer("cards_completed").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.id] }),
    userStartedIdx: index("idx_study_sessions_user_started").on(t.userId, t.startedAt),
  }),
);

export const studyEvents = sqliteTable(
  "study_events",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    sessionId: text("session_id"),
    eventType: text("event_type").notNull(),
    deckId: text("deck_id"),
    cardId: text("card_id"),
    grade: integer("grade"),
    occurredAt: integer("occurred_at").notNull(),
    localDate: text("local_date").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.id] }),
    userLocalDateIdx: index("idx_study_events_user_local_date").on(t.userId, t.localDate),
    userOccurredIdx: index("idx_study_events_user_occurred").on(t.userId, t.occurredAt),
    userSessionIdx: index("idx_study_events_user_session").on(t.userId, t.sessionId),
  }),
);

export const studyDailyStats = sqliteTable(
  "study_daily_stats",
  {
    userId: text("user_id").notNull(),
    localDate: text("local_date").notNull(),
    leitnerCount: integer("leitner_count").notNull().default(0),
    deckStudyCount: integer("deck_study_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.localDate] }),
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
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  updatedAt: integer("updated_at").notNull(),
});
