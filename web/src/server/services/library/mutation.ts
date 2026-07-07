import type { Env } from "../../env";
import type { Db } from "../../db/index";
import { bumpRevision } from "../revision";
import { notifyRevision } from "../notify";

export async function finishMutation(db: Db, env: Env | undefined, userId: string): Promise<void> {
  const rev = await bumpRevision(db, userId);
  if (env) {
    await notifyRevision(env, userId, rev);
  }
}
