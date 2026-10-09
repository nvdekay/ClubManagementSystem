import mongoose from "mongoose";

const testDatabase = /^ucms-.+-test-(\d+)$/;

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else — still alive.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Integration tests drop their per-process database in afterAll, but a run that is killed midway
 * (Ctrl+C, timeout) leaves it behind. Before each run, drop test databases whose process is gone;
 * databases of a test run still in progress elsewhere are left alone.
 */
export default async function dropStaleTestDatabases(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) return;
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3_000 }).asPromise()
    .catch(() => null);
  if (!connection) return; // no reachable Mongo: integration tests will report it themselves
  try {
    const { databases } = await connection.db!.admin().listDatabases();
    for (const { name } of databases) {
      const pid = Number(testDatabase.exec(name)?.[1]);
      if (pid && !isRunning(pid)) await connection.getClient().db(name).dropDatabase();
    }
  } finally {
    await connection.close();
  }
}
