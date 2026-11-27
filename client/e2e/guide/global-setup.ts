import { runSetupScript } from '../setup/run-script'

// The server command has seeded the guide database (setup/prepare-db.ts); add the guide records,
// then mint one session per role as the e2e suite does. A reused stack keeps the records it has.
export default function globalSetup(): void {
  if (!process.env.E2E_REUSE_SERVERS) {
    runSetupScript('../guide/prepare-guide.ts')
  }
  runSetupScript('mint-sessions.ts')
}
