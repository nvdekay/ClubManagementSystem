import { runSetupScript } from './run-script'

// Drops the e2e database; the next run rebuilds it from the seeds anyway.
// A reused stack keeps its database: the server that runs on it is not ours to break.
export default function globalTeardown(): void {
  if (!process.env.E2E_REUSE_SERVERS) {
    runSetupScript('prepare-db.ts', '--drop')
  }
}
