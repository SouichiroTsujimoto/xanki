#!/usr/bin/env node
/**
 * cap sync only registers npm Capacitor plugins in packageClassList.
 * Also register in-app Swift plugins (CAPBridgedPlugin) from ios/App/App/*.swift.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(root, "../ios/App/App/capacitor.config.json");
const appSwiftDir = resolve(root, "../ios/App/App");
const objcPluginRegex = /@objc\(([A-Za-z0-9_-]+)\)/;

const config = JSON.parse(readFileSync(configPath, "utf8"));
const list = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];

for (const file of readdirSync(appSwiftDir)) {
  if (!file.endsWith(".swift")) continue;
  const source = readFileSync(resolve(appSwiftDir, file), "utf8");
  if (!source.includes("CAPBridgedPlugin")) continue;
  const match = objcPluginRegex.exec(source);
  if (match?.[1] && !list.includes(match[1])) {
    list.push(match[1]);
  }
}

config.packageClassList = list;
writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
