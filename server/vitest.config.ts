import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Load the root .env so a local `npm test` really runs integration tests (CI sets env directly).
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // no .env — integration tests skip on missing MONGO_URI
}

export default defineConfig({});
