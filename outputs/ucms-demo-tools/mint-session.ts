// Issues app sessions for demo accounts through the real session service (no Google OAuth).
// Run from server/:  MONGO_URI=... node --env-file=../.env --import tsx ../outputs/ucms-demo-tools/mint-session.ts a@x b@y
// Prints JSON { email: cookieValue } for the `ucms_session` cookie.
import mongoose from "mongoose";
import { createSessionService } from "../../server/src/infra/auth/session-service.js";
import { mongoSessionRepository } from "../../server/src/infra/db/mongo-auth-session-repository.js";

const { MONGO_URI, SESSION_SECRET } = process.env;
if (!MONGO_URI || !SESSION_SECRET) throw new Error("MONGO_URI and SESSION_SECRET are required");
await mongoose.connect(MONGO_URI);
const sessions = createSessionService(mongoSessionRepository(), SESSION_SECRET);
const result: Record<string, string> = {};
for (const email of process.argv.slice(2)) {
  const user = await mongoose.connection.collection("users").findOne({ email });
  if (!user) throw new Error(`no user with email ${email}`);
  result[email] = (await sessions.issue(String(user._id), new Date())).cookieValue;
}
console.log(JSON.stringify(result));
await mongoose.disconnect();
