// Runs one of the e2e setup scripts under tsx: they import server modules (.js → .ts paths)
// that Playwright's own TypeScript loader is not meant to resolve.
import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { clientDir } from './env'

export function runSetupScript(script: string, ...args: string[]): void {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', path.join(clientDir, 'e2e/setup', script), ...args],
    { cwd: clientDir, stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(`e2e setup script ${script} failed with exit code ${String(result.status)}`)
  }
}
