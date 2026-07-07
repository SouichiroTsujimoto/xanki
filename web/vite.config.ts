import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@xanki/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@xanki/ui": path.resolve(__dirname, "../packages/ui/src/index.ts"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
