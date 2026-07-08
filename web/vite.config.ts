import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      configPath: path.resolve(__dirname, "wrangler.toml"),
      // root: src/client だとデフォルト state が web/src/client/.wrangler になり、
      // wrangler d1 migrations (--local) が使う web/.wrangler と別 DB になる
      persistState: { path: path.resolve(__dirname, ".wrangler/state") },
    }),
  ],
  root: "src/client",
  resolve: {
    alias: {
      "@xanki/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@xanki/ui": path.resolve(__dirname, "../packages/ui/src/index.ts"),
    },
  },
  server: {
    port: 8787,
    strictPort: true,
  },
});
