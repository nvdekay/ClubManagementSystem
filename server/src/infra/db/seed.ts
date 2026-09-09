// Rebuilds a demo database in one command: npm run seed (constitution: Demo readiness)
import mongoose from "mongoose";
import { newUser } from "../../domain/user.js";
import { loadConfig } from "../config/index.js";
import { mongoUserRepository } from "./mongo-user-repository.js";

const config = loadConfig();
await mongoose.connect(config.MONGO_URI);

const repo = mongoUserRepository();
const demo = [
  { email: "ana@example.com", name: "Ana" },
  { email: "bob@example.com", name: "Bob" },
  { email: "carol@example.com", name: "Carol" },
];

let seeded = 0;
for (const input of demo) {
  if (!(await repo.findByEmail(input.email))) {
    await repo.save(newUser(input));
    seeded++;
  }
}

// Never log MONGO_URI — it can carry credentials (SEC-04).
console.log(`seeded ${seeded} of ${demo.length} demo users`);
await mongoose.disconnect();
