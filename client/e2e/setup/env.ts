// Single source of the e2e stack settings: ports, the throwaway database and the server env.
// Nothing here reads the developer's .env, so a local run and CI start the same stack.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const clientDir = path.resolve(here, '../..')
export const serverDir = path.resolve(clientDir, '../server')
export const authDir = path.resolve(clientDir, 'e2e/.auth')

export const serverPort = Number(process.env.E2E_SERVER_PORT ?? 3300)
export const clientPort = Number(process.env.E2E_CLIENT_PORT ?? 5300)
export const clientUrl = `http://localhost:${clientPort}`

const mongoBase = process.env.E2E_MONGO_BASE ?? 'mongodb://127.0.0.1:27017'
export const databaseName = process.env.E2E_DB_NAME ?? 'ucms-e2e'
export const mongoUri = `${mongoBase}/${databaseName}`

/** The ICPDP officer: seed:demo makes this account the Leader of the HEBE club as well. */
export const officerEmail = 'e2e.officer@fpt.edu.vn'

/** HEBE Club, the club seed:demo fills with events, members and feedback (id from the PDP snapshot). */
export const hebeClubId = 'a10000000000000000000013'

/**
 * One signed-in browser identity per role, all seeded accounts. `leader` is the same person as
 * `officer` (seed:demo makes its owner both) but gets its own session, so the two never share state.
 */
export const roles = {
  officer: officerEmail,
  leader: officerEmail,
  // Active HEBE member without a board seat.
  member: 'havnhe170005@fpt.edu.vn',
  // Seeded student with no club membership.
  student: 'lannvhe180003@fpt.edu.vn',
} as const
export type Role = keyof typeof roles

/** Playwright storageState file that holds the session cookie of a role. */
export function storageStatePath(role: Role): string {
  return path.join(authDir, `${role}.json`)
}

/**
 * Server environment for the e2e stack. Google OAuth values are placeholders: the browser never
 * signs in through Google, sessions are minted by mint-sessions.ts with the same secret.
 * Cloudinary and SMTP stay empty so nothing leaves the machine (emails go to the log transport).
 */
export function serverEnv(): Record<string, string> {
  return {
    NODE_ENV: 'development',
    PORT: String(serverPort),
    MONGO_URI: mongoUri,
    GOOGLE_CLIENT_ID: 'e2e-google-client-id',
    GOOGLE_CLIENT_SECRET: 'e2e-google-client-secret',
    SESSION_SECRET: 'e2e-session-secret-0123456789abcdef0123456789abcdef',
    ALLOWED_DOMAIN: 'fpt.edu.vn',
    BOOTSTRAP_ICPDP_EMAIL: officerEmail,
    APP_BASE_URL: `http://localhost:${serverPort}`,
    CLIENT_BASE_URL: clientUrl,
    // Each test sends its own X-Forwarded-For (see fixtures.ts), so the per-IP rate limits of the
    // API count one test at a time instead of the whole suite.
    TRUST_PROXY: '1',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
    MAIL_TRANSPORT: 'log',
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_SECURE: '',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    MAIL_FROM: '',
  }
}

/** Refuses to touch any database that is not a dedicated e2e one (never the dev `ucms`). */
export function assertE2eDatabase(): void {
  if (!/^ucms-e2e/.test(databaseName)) {
    throw new Error(`e2e database name must start with "ucms-e2e", got "${databaseName}"`)
  }
}
