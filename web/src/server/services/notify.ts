import type { Env } from "../env";
import type { Db } from "../db/index";
import { bumpRevision } from "./revision";

export async function notifyRevision(env: Env, userId: string, rev: number): Promise<void> {
  try {
    const id = env.USER_SYNC.idFromName(userId);
    const stub = env.USER_SYNC.get(id);
    await stub.fetch(
      new Request("https://do/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rev }),
      }),
    );
  } catch {
    // SSE notify is best-effort
  }
}

export async function bumpAndNotify(db: Db, env: Env, userId: string): Promise<number> {
  const rev = await bumpRevision(db, userId);
  await notifyRevision(env, userId, rev);
  return rev;
}
