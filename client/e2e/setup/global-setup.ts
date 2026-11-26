import { runSetupScript } from './run-script'

// Playwright starts the web servers before this runs, and the server command seeds the database
// first, so all that is left is one session per role for the tests' storageState.
export default function globalSetup(): void {
  runSetupScript('mint-sessions.ts')
}
