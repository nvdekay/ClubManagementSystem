// Issues one real app session per e2e role through the server's own session service (the same
// path the Google OAuth callback ends in), then writes a Playwright storageState file per role.
// No auth bypass exists in the app: the cookie is signed with the e2e SESSION_SECRET the server uses.
// Runs under tsx from global-setup.ts, after the e2e database has been seeded.
import { mkdirSync, writeFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { createSessionService } from '../../../server/src/infra/auth/session-service.js'
import { mongoSessionRepository } from '../../../server/src/infra/db/mongo-auth-session-repository.js'
import {
  assertE2eDatabase,
  authDir,
  mongoUri,
  roles,
  serverEnv,
  storageStatePath,
  type Role,
} from './env.js'

assertE2eDatabase()
await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5_000 })
try {
  const sessions = createSessionService(mongoSessionRepository(), serverEnv().SESSION_SECRET!)
  mkdirSync(authDir, { recursive: true })
  for (const [role, email] of Object.entries(roles) as Array<[Role, string]>) {
    const user = await mongoose.connection.collection('users').findOne({ email })
    if (!user) {
      throw new Error(`e2e role ${role}: no seeded user with email ${email}`)
    }
    const issued = await sessions.issue(String(user._id), new Date())
    const state = {
      // Same attributes as the OAuth callback sets (auth-routes.ts → sessionCookie), over plain http.
      cookies: [
        {
          name: 'ucms_session',
          value: issued.cookieValue,
          domain: 'localhost',
          path: '/api/v1',
          expires: Math.floor(issued.expiresAt.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    }
    writeFileSync(storageStatePath(role), JSON.stringify(state, null, 2))
  }
  console.log(`[e2e] minted sessions for ${Object.keys(roles).join(', ')}`)
} finally {
  await mongoose.disconnect()
}
