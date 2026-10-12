import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  EVALUATION_DIMENSIONS,
  type DimensionCode, type EvaluationScheme, type EvaluationSchemeRepository, type SchemeSettings,
  type SchemeState, type SchemeThresholds,
} from "../../domain/evaluation-scheme.js";
import { ucmsModels } from "./ucms-models.js";

const catalogue = new Map<string, (typeof EVALUATION_DIMENSIONS)[number]>(
  EVALUATION_DIMENSIONS.map((dimension) => [dimension.code, dimension]));
const order = new Map(EVALUATION_DIMENSIONS.map((dimension, index) => [dimension.code as string, index]));

function total(settings: SchemeSettings): number {
  return settings.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
}

function duplicate(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

export function mongoEvaluationSchemeRepository(): EvaluationSchemeRepository {
  const schemes = ucmsModels.evaluationSchemes!;
  const dimensions = ucmsModels.evaluationDimensions!;
  const audits = ucmsModels.auditLogs!;

  function schemeFrom(doc: Record<string, unknown>, rows: Record<string, unknown>[]): EvaluationScheme {
    return {
      id: String(doc._id), periodCode: String(doc.periodCode), version: Number(doc.version),
      state: doc.state as SchemeState, totalWeight: Number(String(doc.totalWeight)),
      thresholds: doc.thresholds as SchemeThresholds,
      dimensions: rows.map((row) => ({ code: String(row.code) as DimensionCode,
        weight: Number(String(row.weight)), allowsManual: row.allowsManual === true }))
        .sort((left, right) => order.get(left.code)! - order.get(right.code)!),
      ...(doc.activatedAt instanceof Date ? { activatedAt: doc.activatedAt } : {}),
      createdAt: doc.createdAt as Date,
    };
  }

  async function load(ids: Types.ObjectId[], session?: ClientSession): Promise<EvaluationScheme[]> {
    const [docs, rows] = await Promise.all([
      schemes.find({ _id: { $in: ids } }).session(session ?? null).lean(),
      dimensions.find({ schemeId: { $in: ids } }).session(session ?? null).lean(),
    ]);
    return docs.map((doc) => schemeFrom(doc, rows.filter((row) => String(row.schemeId) === String(doc._id))));
  }

  async function writeDimensions(schemeId: Types.ObjectId, settings: SchemeSettings,
    session: ClientSession): Promise<void> {
    await dimensions.deleteMany({ schemeId }, { session });
    await dimensions.insertMany(settings.dimensions.map((dimension) => ({
      schemeId, code: dimension.code, name: catalogue.get(dimension.code)!.name,
      weight: new Types.Decimal128(String(dimension.weight)), allowsManual: dimension.allowsManual,
      scoringRule: { measures: catalogue.get(dimension.code)!.measures },
    })), { session });
  }

  async function audit(session: ClientSession, id: Types.ObjectId, action: string, actorId: string,
    after: unknown, at: Date): Promise<void> {
    await audits.create([{ entityType: "EvaluationScheme", entityId: id, action,
      actorId: new Types.ObjectId(actorId), actorRole: "ICPDP_OFFICER", after,
      correlationId: randomUUID(), at }], { session });
  }

  async function draft(id: string, session: ClientSession) {
    const doc = await schemes.findOne({ _id: new Types.ObjectId(id), state: "Draft" }).session(session).lean();
    if (!doc) throw new DomainError("only a draft scheme can change; create a revision instead", "conflict");
    return doc;
  }

  return {
    async list() {
      const docs = await schemes.find().sort({ periodCode: -1, version: -1 }).select("_id").lean();
      const loaded = await load(docs.map((doc) => doc._id as Types.ObjectId));
      const byId = new Map(loaded.map((scheme) => [scheme.id, scheme]));
      return docs.map((doc) => byId.get(String(doc._id))!);
    },
    async find(id) {
      return (await load([new Types.ObjectId(id)]))[0] ?? null;
    },
    async createDraft(periodCode, settings, actorId, now) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const latest = await schemes.findOne({ periodCode }).sort({ version: -1 }).select("version").lean();
        const version = Number(latest?.version ?? 0) + 1;
        try {
          const id = await mongoose.connection.transaction(async (session) => {
            const [created] = await schemes.create([{ periodCode, version, state: "Draft",
              totalWeight: new Types.Decimal128(String(total(settings))), thresholds: settings.thresholds,
              createdAt: now }], { session });
            const schemeId = created!._id as Types.ObjectId;
            await writeDimensions(schemeId, settings, session);
            await audit(session, schemeId, "EVALUATION_SCHEME_CREATED", actorId, { periodCode, version, ...settings }, now);
            return schemeId;
          });
          return (await load([id]))[0]!;
        } catch (error) {
          if (!duplicate(error)) throw error; // another officer took this version number: retry
        }
      }
      throw new DomainError("could not allocate a scheme version; retry", "conflict");
    },
    async updateDraft(id, settings, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const doc = await draft(id, session);
        await schemes.updateOne({ _id: doc._id, state: "Draft" }, { $set: {
          totalWeight: new Types.Decimal128(String(total(settings))), thresholds: settings.thresholds,
        } }, { session });
        await writeDimensions(doc._id as Types.ObjectId, settings, session);
        await audit(session, doc._id as Types.ObjectId, "EVALUATION_SCHEME_UPDATED", actorId, settings, now);
      });
      return (await load([new Types.ObjectId(id)]))[0]!;
    },
    async activate(id, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const doc = await draft(id, session);
        await schemes.updateMany({ periodCode: doc.periodCode, state: "Active" },
          { $set: { state: "Superseded" } }, { session });
        await schemes.updateOne({ _id: doc._id, state: "Draft" }, { $set: {
          state: "Active", activatedBy: new Types.ObjectId(actorId), activatedAt: now,
        } }, { session });
        await audit(session, doc._id as Types.ObjectId, "EVALUATION_SCHEME_ACTIVATED", actorId,
          { periodCode: doc.periodCode, version: doc.version }, now);
      });
      return (await load([new Types.ObjectId(id)]))[0]!;
    },
    async deleteDraft(id, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const doc = await draft(id, session);
        await dimensions.deleteMany({ schemeId: doc._id }, { session });
        await schemes.deleteOne({ _id: doc._id }, { session });
        await audit(session, doc._id as Types.ObjectId, "EVALUATION_SCHEME_DELETED", actorId,
          { periodCode: doc.periodCode, version: doc.version }, now);
      });
    },
  };
}
