import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Load the root .env so a local `npm test` really runs integration tests (CI sets env directly).
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  // no .env — integration tests skip on missing MONGO_URI
}

export default defineConfig({
  test: {
    // Removes databases left behind by integration runs that were killed before afterAll ran.
    globalSetup: ['./tests/global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/infra/db/ucms-schema.generated.ts',
        'src/infra/db/seed*.ts',
        'src/infra/db/*demo*.ts',
      ],
      reporter: ['text-summary', 'html'],
    },
  },
})
