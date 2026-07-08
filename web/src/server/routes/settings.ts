import { Hono } from "hono";
import { z } from "zod";
import { parseDeckSchedulerConfig } from "@xanki/shared";
import type { Env } from "../env";
import { authMiddleware, type AppVars } from "../middleware/auth";
import {
  getUserSchedulerConfig,
  updateUserSchedulerConfig,
} from "../services/library/user-settings-service";

export const settingsRoutes = new Hono<{ Bindings: Env; Variables: AppVars }>();
settingsRoutes.use("*", authMiddleware);

settingsRoutes.get("/scheduler", async (c) => {
  const config = await getUserSchedulerConfig(c.get("db"), c.get("user").id);
  return c.json({ schedulerConfig: config });
});

settingsRoutes.patch("/scheduler", async (c) => {
  const body = z
    .object({
      schedulerConfig: z.unknown(),
    })
    .parse(await c.req.json());
  const schedulerConfig = parseDeckSchedulerConfig(body.schedulerConfig);
  if (!schedulerConfig) {
    return c.json({ error: "invalid_scheduler_config" }, 400);
  }
  const saved = await updateUserSchedulerConfig(
    c.get("db"),
    c.get("user").id,
    schedulerConfig,
    c.env,
  );
  return c.json({ schedulerConfig: saved });
});
