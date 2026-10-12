import mongoose from "mongoose";
import { loadConfig } from "../config/index.js";
import { inspectUcmsDatabase, ucmsCollectionNames } from "./ucms-models.js";

const config = loadConfig();

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  const result = await inspectUcmsDatabase();
  console.log(`MongoDB database: ${result.database}`);
  console.log(`UCMS collections: ${ucmsCollectionNames().length - result.missingCollections.length}/${ucmsCollectionNames().length}`);
  console.log(`Missing indexes: ${result.missingIndexes.length}`);
  if (result.missingCollections.length) console.error(`Missing collections: ${result.missingCollections.join(", ")}`);
  if (result.missingIndexes.length) console.error(`Missing indexes: ${result.missingIndexes.join(", ")}`);
  if (result.missingCollections.length || result.missingIndexes.length) process.exitCode = 1;
} catch (error) {
  console.error("MongoDB verification failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
