import mongoose, { Schema, type Model, type SchemaDefinition } from "mongoose";
import { ucmsEnums, ucmsTables } from "./ucms-schema.generated.js";

type FieldDefinition = {
  readonly type: string;
  readonly required?: boolean;
  readonly unique?: boolean;
  readonly default?: string | number | boolean;
};

type IndexDefinition = {
  readonly fields: readonly string[];
  readonly name?: string;
  readonly unique?: boolean;
};

type TableDefinition = {
  readonly fields: Readonly<Record<string, FieldDefinition>>;
  readonly indexes: readonly IndexDefinition[];
};

const tables: Readonly<Record<string, TableDefinition>> = ucmsTables;
const enums: Readonly<Record<string, readonly string[]>> = ucmsEnums;

function mongoType(type: string): unknown {
  switch (type) {
    case "objectId": return Schema.Types.ObjectId;
    case "string":
    case "text": return String;
    case "string[]": return [String];
    case "int": return Number;
    case "decimal": return Schema.Types.Decimal128;
    case "bool": return Boolean;
    case "datetime": return Date;
    case "json": return Schema.Types.Mixed;
    default:
      if (enums[type]) return String;
      throw new Error(`unknown DBML type: ${type}`);
  }
}

function buildSchema(tableName: string, definition: TableDefinition): Schema {
  const paths: SchemaDefinition = {};
  for (const [fieldName, field] of Object.entries(definition.fields)) {
    const options: Record<string, unknown> = { type: mongoType(field.type) };
    if (field.required) options.required = true;
    if (field.default !== undefined) options.default = field.default;
    if (field.type === "string[]" && field.default === undefined) options.default = undefined;
    if (field.type === "int") {
      options.validate = {
        validator: Number.isInteger,
        message: `${tableName}.${fieldName} must be an integer`,
      };
    }
    if (enums[field.type]) options.enum = [...enums[field.type]];
    paths[fieldName] = options;
  }

  const schema = new Schema(paths, {
    collection: tableName,
    strict: true,
    autoCreate: false,
    autoIndex: false,
  });
  const explicitUniqueFields = new Set(
    definition.indexes.filter((index) => index.unique && index.fields.length === 1)
      .map((index) => index.fields[0]),
  );
  for (const [fieldName, field] of Object.entries(definition.fields)) {
    if (field.unique && !explicitUniqueFields.has(fieldName)) {
      schema.index(
        { [fieldName]: 1 },
        { unique: true, sparse: !field.required, name: `uq_${tableName}_${fieldName}` },
      );
    }
  }
  for (const index of definition.indexes) {
    const keys = Object.fromEntries(index.fields.map((field) => [field, 1])) as Record<string, 1>;
    schema.index(keys, { name: index.name, unique: index.unique ?? false });
  }
  return schema;
}

export const ucmsModels: Readonly<Record<string, Model<Record<string, unknown>>>> =
  Object.fromEntries(Object.entries(tables).map(([tableName, definition]) => {
    const modelName = `Ucms_${tableName}`;
    const model = mongoose.models[modelName] ?? mongoose.model(
      modelName,
      buildSchema(tableName, definition),
      tableName,
    );
    return [tableName, model];
  }));

export function ucmsCollectionNames(): string[] {
  return Object.keys(tables);
}

function sameIndex(
  existing: { key: Record<string, unknown>; unique?: boolean; sparse?: boolean },
  keys: Record<string, unknown>,
  options: { unique?: unknown; sparse?: unknown },
): boolean {
  return JSON.stringify(existing.key) === JSON.stringify(keys)
    && Boolean(existing.unique) === Boolean(options.unique)
    && Boolean(existing.sparse) === Boolean(options.sparse);
}

export async function inspectUcmsDatabase(): Promise<{ database: string; missingCollections: string[]; missingIndexes: string[] }> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB is not connected");
  await db.command({ ping: 1 });
  const collections = new Set((await db.listCollections().toArray()).map((collection) => collection.name));
  const missingCollections: string[] = [];
  const missingIndexes: string[] = [];
  for (const [tableName, model] of Object.entries(ucmsModels)) {
    if (!collections.has(tableName)) {
      missingCollections.push(tableName);
      continue;
    }
    const actual = await model.collection.indexes();
    for (const [keys, options] of model.schema.indexes()) {
      if (!actual.some((index) => sameIndex(index, keys, options))) {
        missingIndexes.push(`${tableName}.${options.name ?? Object.keys(keys).join("_")}`);
      }
    }
  }
  return { database: db.databaseName, missingCollections, missingIndexes };
}

export async function ensureUcmsDatabase(): Promise<void> {
  for (const model of Object.values(ucmsModels)) {
    try {
      await model.createCollection();
    } catch (error) {
      if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 48)) throw error;
    }
    const existing = await model.collection.indexes();
    for (const [keys, options] of model.schema.indexes()) {
      if (!existing.some((index) => sameIndex(index, keys, options))) {
        await model.collection.createIndex(keys as Record<string, 1>, {
          name: options.name,
          unique: Boolean(options.unique),
          sparse: Boolean(options.sparse),
        });
      }
    }
  }
}
