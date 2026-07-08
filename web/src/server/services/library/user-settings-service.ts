import { and, eq, isNotNull, isNull } from "drizzle-orm";
import {
  parseDeckSchedulerConfig,
  resolveDeckSchedulerConfig,
  type DeckSchedulerConfig,
} from "@xanki/shared";
import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { decks, userSettings } from "../../db/schema";
import { nowMs } from "../../utils";
import { finishMutation } from "./mutation";

function readSchedulerConfig(raw: string | null | undefined): DeckSchedulerConfig | null {
  if (!raw) return null;
  try {
    return parseDeckSchedulerConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

function serializeSchedulerConfig(config: DeckSchedulerConfig): string {
  return JSON.stringify(config);
}

async function migrateDeckSchedulerConfig(
  db: Db,
  userId: string,
): Promise<DeckSchedulerConfig | null> {
  const deckWithConfig = await db
    .select({ schedulerConfig: decks.schedulerConfig })
    .from(decks)
    .where(
      and(
        eq(decks.userId, userId),
        isNull(decks.deletedAt),
        isNotNull(decks.schedulerConfig),
      ),
    )
    .limit(1)
    .get();

  const config = readSchedulerConfig(deckWithConfig?.schedulerConfig);
  if (!config) return null;

  const now = nowMs();
  await db
    .insert(userSettings)
    .values({
      userId,
      schedulerConfig: serializeSchedulerConfig(config),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        schedulerConfig: serializeSchedulerConfig(config),
        updatedAt: now,
      },
    });

  return config;
}

export async function getUserSchedulerConfig(
  db: Db,
  userId: string,
): Promise<DeckSchedulerConfig> {
  const row = await db
    .select({ schedulerConfig: userSettings.schedulerConfig })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  const stored = readSchedulerConfig(row?.schedulerConfig);
  if (stored) return stored;

  const migrated = await migrateDeckSchedulerConfig(db, userId);
  return resolveDeckSchedulerConfig(migrated);
}

export async function updateUserSchedulerConfig(
  db: Db,
  userId: string,
  config: DeckSchedulerConfig,
  env?: Env,
): Promise<DeckSchedulerConfig> {
  const now = nowMs();
  await db
    .insert(userSettings)
    .values({
      userId,
      schedulerConfig: serializeSchedulerConfig(config),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        schedulerConfig: serializeSchedulerConfig(config),
        updatedAt: now,
      },
    });

  await finishMutation(db, env, userId);
  return config;
}
