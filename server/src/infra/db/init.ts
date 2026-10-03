import mongoose from "mongoose";
import { loadConfig } from "../config/index.js";
import { ensureUcmsDatabase, inspectUcmsDatabase, ucmsCollectionNames } from "./ucms-models.js";

const config = loadConfig();

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  await ensureUcmsDatabase();
  const inspection = await inspectUcmsDatabase();
  if (inspection.missingCollections.length || inspection.missingIndexes.length) {
    throw new Error(`missing ${inspection.missingCollections.length} collections and ${inspection.missingIndexes.length} indexes`);
  }
  console.log(`UCMS database ${inspection.database} ready: ${ucmsCollectionNames().length} collections`);
} catch (error) {
  console.error("UCMS database initialization failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
