import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import {
  DEFAULT_CLUB_FIELDS, normalizeClubFieldName, type ClubField, type ClubFieldRepository,
} from "../../domain/club-field.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

function fieldFrom(doc: Record<string, unknown>): ClubField {
  return { id: String(doc._id), name: String(doc.name), sortOrder: Number(doc.sortOrder ?? 0),
    isActive: doc.isActive !== false };
}

function duplicate(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

export function mongoClubFieldRepository(): ClubFieldRepository {
  const fields = ucmsModels.clubFields!;
  const clubs = ucmsModels.clubs!;
  const applications = ucmsModels.clubApplications!;
  const audits = ucmsModels.auditLogs!;

  async function audit(session: ClientSession, id: unknown, action: string, actorId: string,
    before: unknown, after: unknown, at: Date): Promise<void> {
    await audits.create([{ entityType: "ClubField", entityId: new Types.ObjectId(String(id)), action,
      actorId: new Types.ObjectId(actorId), actorRole: "ICPDP_OFFICER", before, after,
      correlationId: randomUUID(), at }], { session });
  }

  return {
    async listActive() {
      const docs = await fields.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
      return docs.map(fieldFrom);
    },
    async listWithUsage() {
      const docs = await fields.find().sort({ isActive: -1, sortOrder: 1, name: 1 }).lean();
      const names = docs.map((doc) => String(doc.name));
      const [clubCounts, applicationCounts] = await Promise.all([
        clubs.aggregate<{ _id: string; count: number }>([
          { $match: { field: { $in: names } } }, { $group: { _id: "$field", count: { $sum: 1 } } }]),
        applications.aggregate<{ _id: string; count: number }>([
          { $match: { field: { $in: names } } }, { $group: { _id: "$field", count: { $sum: 1 } } }]),
      ]);
      const clubsByName = new Map(clubCounts.map((item) => [item._id, item.count]));
      const applicationsByName = new Map(applicationCounts.map((item) => [item._id, item.count]));
      return docs.map((doc) => ({ ...fieldFrom(doc),
        clubCount: clubsByName.get(String(doc.name)) ?? 0,
        applicationCount: applicationsByName.get(String(doc.name)) ?? 0 }));
    },
    async find(id) {
      const doc = await fields.findById(new Types.ObjectId(id)).lean();
      return doc ? fieldFrom(doc) : null;
    },
    async create(input, actorId, now) {
      const normalizedName = normalizeClubFieldName(input.name);
      try {
        return await mongoose.connection.transaction(async (session) => {
          const hidden = await fields.findOne({ normalizedName, isActive: false }).session(session).lean();
          if (hidden) {
            const restored = await fields.findOneAndUpdate({ _id: hidden._id, isActive: false },
              { $set: { name: input.name, sortOrder: input.sortOrder, isActive: true, updatedAt: now } },
              { new: true, session }).lean();
            if (!restored) throw new DomainError("club field changed; reload and retry", "conflict");
            await audit(session, hidden._id, "CLUB_FIELD_RESTORED", actorId,
              { isActive: false }, { name: input.name, isActive: true }, now);
            return fieldFrom(restored);
          }
          const [created] = await fields.create([{ name: input.name, normalizedName,
            sortOrder: input.sortOrder, isActive: true, createdAt: now, updatedAt: now }], { session });
          await audit(session, created!._id, "CLUB_FIELD_CREATED", actorId, null,
            { name: input.name, sortOrder: input.sortOrder }, now);
          return fieldFrom(created!.toObject());
        });
      } catch (error) {
        if (duplicate(error)) throw new DomainError("club field name already exists", "conflict");
        throw error;
      }
    },
    async update(id, input, actorId, now) {
      const objectId = new Types.ObjectId(id);
      try {
        return await mongoose.connection.transaction(async (session) => {
          const current = await fields.findOne({ _id: objectId, isActive: true }).session(session).lean();
          if (!current) throw new DomainError("club field not found", "not_found");
          const previousName = String(current.name);
          const updated = await fields.findOneAndUpdate({ _id: objectId, isActive: true }, { $set: {
            name: input.name, normalizedName: normalizeClubFieldName(input.name),
            sortOrder: input.sortOrder, updatedAt: now,
          } }, { new: true, session }).lean();
          if (!updated) throw new DomainError("club field not found", "not_found");
          if (previousName !== input.name) {
            await clubs.updateMany({ field: previousName },
              { $set: { field: input.name, updatedAt: now } }, { session });
            await applications.updateMany({ field: previousName },
              { $set: { field: input.name, "draftPayload.field": input.name } }, { session });
          }
          await audit(session, objectId, "CLUB_FIELD_UPDATED", actorId,
            { name: previousName, sortOrder: current.sortOrder },
            { name: input.name, sortOrder: input.sortOrder }, now);
          return fieldFrom(updated);
        });
      } catch (error) {
        if (duplicate(error)) throw new DomainError("club field name already exists", "conflict");
        throw error;
      }
    },
    async remove(id, actorId, now) {
      const objectId = new Types.ObjectId(id);
      return mongoose.connection.transaction(async (session) => {
        const current = await fields.findOne({ _id: objectId, isActive: true }).session(session).lean();
        if (!current) throw new DomainError("club field not found", "not_found");
        const name = String(current.name);
        const inUse = Boolean(await clubs.exists({ field: name }).session(session))
          || Boolean(await applications.exists({ field: name }).session(session));
        if (inUse) {
          await fields.updateOne({ _id: objectId, isActive: true },
            { $set: { isActive: false, updatedAt: now } }, { session });
        } else {
          await fields.deleteOne({ _id: objectId }, { session });
        }
        const result = inUse ? "deactivated" : "deleted";
        await audit(session, objectId, inUse ? "CLUB_FIELD_DEACTIVATED" : "CLUB_FIELD_DELETED",
          actorId, { name, isActive: true }, { result }, now);
        return result;
      });
    },
  };
}

/**
 * Seed the default catalog on a fresh database. Once ICPDP has edited the catalog (any ClubField
 * audit row) it is never re-seeded, so deleting every field stays deleted across restarts.
 */
export async function ensureDefaultClubFields(now = new Date()): Promise<void> {
  const fields = ucmsModels.clubFields!;
  if (await fields.exists({}) || await ucmsModels.auditLogs!.exists({ entityType: "ClubField" })) return;
  await fields.bulkWrite(DEFAULT_CLUB_FIELDS.map((name, index) => ({ updateOne: {
    filter: { normalizedName: normalizeClubFieldName(name) },
    update: { $setOnInsert: { name, normalizedName: normalizeClubFieldName(name),
      sortOrder: (index + 1) * 10, isActive: true, createdAt: now, updatedAt: now } },
    upsert: true,
  } })));
}
