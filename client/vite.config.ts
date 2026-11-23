import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Proxy target follows PORT from the root .env — same source of truth as the server.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    rollupOptions: {
      input: { app: path.resolve(__dirname, "index.html"), proposalPreview: path.resolve(__dirname, "proposal-preview.html") },
    },
  },
  server: {
    proxy: { "/api": `http://localhost:${loadEnv(mode, "..", "").PORT || 3000}` },
  },
}));
