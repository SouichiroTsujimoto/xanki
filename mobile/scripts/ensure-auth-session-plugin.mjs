#!/usr/bin/env node
/**
 * cap sync only registers npm Capacitor plugins. Register the in-app AuthSession plugin too.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(root, "../ios/App/App/capacitor.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const list = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];

if (!list.includes("AuthSessionPlugin")) {
  list.push("AuthSessionPlugin");
  config.packageClassList = list;
  writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
}
