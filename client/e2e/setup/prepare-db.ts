// Rebuilds the e2e database from scratch: drop, create collections and indexes, run the auth
// bootstrap the server would run, then the existing seed scripts in their documented order, then a
// few e2e-only records the seeds do not make (written through the app's own usecases).
// Runs under tsx before the e2e server starts (see playwright.config.ts → webServer).
//   node --import tsx e2e/setup/prepare-db.ts          drop + seed
//   node --import tsx e2e/setup/prepare-db.ts --drop   drop only (global teardown)
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import mongoose from 'mongoose'
import { ensureAuthBootstrap } from '../../../server/src/infra/db/bootstrap-auth.js'
import { mongoAccessRepository } from '../../../server/src/infra/db/mongo-access-repository.js'
import { mongoAuthRepository } from '../../../server/src/infra/db/mongo-auth-repository.js'
import { ensureAuthSessionIndexes } from '../../../server/src/infra/db/mongo-auth-session-repository.js'
import { ensureDefaultClubFields } from '../../../server/src/infra/db/mongo-club-field-repository.js'
import { mongoSuspensionRequestRepository } from '../../../server/src/infra/db/mongo-suspension-request-repository.js'
import { mongoViolationRepository } from '../../../server/src/infra/db/mongo-violation-repository.js'
import { ensureUcmsDatabase } from '../../../server/src/infra/db/ucms-models.js'
import {
  submitSuspension,
  suspensionContext,
} from '../../../server/src/usecase/suspension-request.js'
import { openViolation } from '../../../server/src/usecase/violation.js'
import {
  assertE2eDatabase,
  hebeClubId,
  mongoUri,
  officerEmail,
  serverDir,
  serverEnv,
} from './env.js'

/** More open cases than one page of the ICPDP queue (20), so paging has a second page. */
export const extraViolationCases = 22

const env = serverEnv()

// Runs one seed script of the server with the e2e env (and no .env file), failing on error.
function seed(script: string, ...args: string[]): void {
  const started = Date.now()
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', path.join('src/infra/db', script), ...args],
    { cwd: serverDir, env: { ...process.env, ...env }, stdio: 'inherit' },
  )
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${String(result.status)}`)
  }
  console.log(`[e2e] ${script} done in ${Date.now() - started} ms`)
}

// Creates collections, indexes and the bootstrap ICPDP officer, as the server does on start.
async function initialize(): Promise<void> {
  await ensureUcmsDatabase()
  await ensureDefaultClubFields()
  await ensureAuthSessionIndexes()
  await ensureAuthBootstrap({
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET!,
    SESSION_SECRET: env.SESSION_SECRET!,
    ALLOWED_DOMAIN: env.ALLOWED_DOMAIN!,
    BOOTSTRAP_ICPDP_EMAIL: officerEmail,
    APP_BASE_URL: env.APP_BASE_URL!,
    CLIENT_BASE_URL: env.CLIENT_BASE_URL!,
  })
}

// Records the seeds do not make: a second page of compliance cases and one pending suspension request.
async function addE2eRecords(): Promise<void> {
  const officer = await mongoose.connection.collection('users').findOne({ email: officerEmail })
  if (!officer) {
    throw new Error('the bootstrap officer is missing')
  }
  const actor = { id: String(officer._id), accountState: 'Active' as const }
  const clubs = await mongoose.connection
    .collection('clubs')
    .find({ state: 'Active' }, { projection: { _id: 1 } })
    .sort({ _id: 1 })
    .limit(extraViolationCases)
    .toArray()
  const violations = mongoViolationRepository()
  const auth = mongoAuthRepository(env.ALLOWED_DOMAIN!)
  for (let index = 0; index < extraViolationCases; index += 1) {
    await openViolation(
      violations,
      auth,
      actor,
      {
        clubId: String(clubs[index % clubs.length]!._id),
        originType: 'OTHER',
        severity: 'MINOR',
        title: `E2E compliance case ${String(index + 1).padStart(2, '0')}`,
      },
      new Date(),
    )
  }
  const now = new Date()
  const suspensions = mongoSuspensionRequestRepository()
  const access = mongoAccessRepository()
  // The club acknowledges every upcoming event and booking the pause affects, as the form asks.
  const { impacts } = await suspensionContext(suspensions, access, actor, hebeClubId, now)
  await submitSuspension(
    suspensions,
    access,
    actor,
    hebeClubId,
    {
      reason: 'E2E suspension request: the board sits final exams this month.',
      until: new Date(now.getTime() + 30 * 86_400_000),
      obligationsPlan: 'Pending reports are filed before the pause starts.',
      recoveryPlan: 'Activities resume with the next recruitment round.',
      acknowledgedImpactIds: impacts.map((impact) => impact.id),
    },
    now,
  )
  console.log(`[e2e] added ${extraViolationCases} compliance cases and 1 suspension request`)
}

assertE2eDatabase()
const dropOnly = process.argv.includes('--drop')

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5_000 })
try {
  await mongoose.connection.dropDatabase()
  if (!dropOnly) {
    await initialize()
  }
} finally {
  await mongoose.disconnect()
}

if (dropOnly) {
  console.log(`[e2e] dropped ${mongoUri}`)
} else {
  seed('seed.ts')
  seed('seed-demo.ts', `--owner=${officerEmail}`, '--owner-name=E2E Officer')
  seed('seed-dashboard.ts')
  seed('seed-periodic-reports.ts', `--officer=${officerEmail}`)
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5_000 })
  try {
    await addE2eRecords()
  } finally {
    await mongoose.disconnect()
  }
  console.log(`[e2e] seeded ${mongoUri}`)
}
