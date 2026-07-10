import { defineConfig } from "vitest/config";

/** Node unit tests (no Workers pool). */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/server/services/ai/llm.test.ts"],
  },
});
