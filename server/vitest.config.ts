import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Load the root .env so a local `npm test` really runs integration tests (CI sets env directly).
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // no .env — integration tests skip on missing MONGO_URI
}

export default defineConfig({
  // Removes databases left behind by integration runs that were killed before afterAll ran.
  test: { globalSetup: ["./tests/global-setup.ts"] },
});
