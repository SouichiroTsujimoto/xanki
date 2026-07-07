import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflarePool, cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const migrations = await readD1Migrations(path.join(root, "migrations"));

const workersOptions = {
  wrangler: { configPath: "./wrangler.toml" },
  main: "./src/server/index.ts",
  miniflare: {
    bindings: {
      TEST_MIGRATIONS: migrations,
    },
  },
};

export default defineConfig({
  plugins: [cloudflareTest(workersOptions)],
  test: {
    include: ["src/server/**/*.integration.test.ts"],
    setupFiles: ["./src/server/test-setup.ts"],
    pool: cloudflarePool(workersOptions),
  },
});
