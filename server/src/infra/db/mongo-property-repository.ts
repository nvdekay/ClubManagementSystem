import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  PROPERTY_CODE_PREFIX, nextPropertyCode,
  type Blackout, type BookableHours, type Property, type PropertyRepository, type PropertyType,
} from "../../domain/property.js";
import { ucmsModels } from "./ucms-models.js";

function propertyFrom(doc: Record<string, unknown>): Property {
  return {
    id: String(doc._id), code: String(doc.code), name: String(doc.name),
    type: doc.type as PropertyType, location: typeof doc.location === "string" ? doc.location : "",
    ...(typeof doc.capacity === "number" ? { capacity: doc.capacity } : {}),
    equipment: Array.isArray(doc.equipment) ? doc.equipment.map(String) : [],
    bookableHours: Array.isArray(doc.bookableHours) ? (doc.bookableHours as BookableHours[])
      .map(({ day, open, close }) => ({ day, open, close })) : [],
    blackouts: Array.isArray(doc.blackouts) ? (doc.blackouts as Blackout[]).map((blackout) => ({
      startAt: new Date(blackout.startAt), endAt: new Date(blackout.endAt), reason: String(blackout.reason ?? ""),
    })) : [],
    isActive: doc.isActive !== false,
  };
}

function duplicateCode(error: unknown): boolean {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000;
}

export function mongoPropertyRepository(): PropertyRepository {
  const properties = ucmsModels.properties!;
  const bookings = ucmsModels.propertyBookings!;
  const audits = ucmsModels.auditLogs!;

  async function audit(session: ClientSession, id: unknown, action: string, actorId: string,
    before: unknown, after: unknown, at: Date): Promise<void> {
    await audits.create([{ entityType: "Property", entityId: new Types.ObjectId(String(id)), action,
      actorId: new Types.ObjectId(actorId), actorRole: "ICPDP_OFFICER", before, after,
      correlationId: randomUUID(), at }], { session });
  }

  async function current(id: string, session: ClientSession) {
    const doc = await properties.findById(new Types.ObjectId(id)).session(session).lean();
    if (!doc) throw new DomainError("property not found", "not_found");
    return doc;
  }

  return {
    async list() {
      const docs = await properties.find().sort({ isActive: -1, code: 1 }).lean();
      return docs.map(propertyFrom);
    },
    async find(id) {
      const doc = await properties.findById(new Types.ObjectId(id)).lean();
      return doc ? propertyFrom(doc) : null;
    },
    async create(input, actorId, now) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const prefix = PROPERTY_CODE_PREFIX[input.type];
        const codes = await properties.find({ code: { $regex: `^${prefix}-\\d+$` } }).distinct("code");
        const code = nextPropertyCode(input.type, codes.map(String));
        try {
          return await mongoose.connection.transaction(async (session) => {
            const [created] = await properties.create([{ ...input, code, isActive: true }], { session });
            await audit(session, created!._id, "PROPERTY_CREATED", actorId, null, { code, ...input }, now);
            return propertyFrom(created!.toObject());
          });
        } catch (error) {
          // Another officer took this code at the same moment: recompute and retry.
          if (!duplicateCode(error)) throw error;
        }
      }
      throw new DomainError("could not allocate a property code; retry", "conflict");
    },
    async update(id, details, actorId, now) {
      return mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        const updated = await properties.findOneAndUpdate({ _id: before._id }, {
          $set: details, ...(details.capacity === undefined ? { $unset: { capacity: "" } } : {}),
        }, { new: true, session }).lean();
        await audit(session, before._id, "PROPERTY_UPDATED", actorId, propertyFrom(before), details, now);
        return propertyFrom(updated!);
      });
    },
    async setActive(id, isActive, actorId, now) {
      return mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        const updated = await properties.findOneAndUpdate({ _id: before._id }, { $set: { isActive } },
          { new: true, session }).lean();
        if (before.isActive !== isActive) {
          await audit(session, before._id, isActive ? "PROPERTY_ACTIVATED" : "PROPERTY_DEACTIVATED", actorId,
            { isActive: before.isActive }, { isActive }, now);
        }
        return propertyFrom(updated!);
      });
    },
    async hasBookings(id) {
      return Boolean(await bookings.exists({ propertyId: new Types.ObjectId(id) }));
    },
    async remove(id, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        // Re-checked inside the transaction so a booking created meanwhile still blocks deletion.
        if (await bookings.exists({ propertyId: before._id }).session(session)) {
          throw new DomainError("property has bookings; deactivate it instead", "conflict");
        }
        await properties.deleteOne({ _id: before._id }, { session });
        await audit(session, before._id, "PROPERTY_DELETED", actorId, propertyFrom(before), null, now);
      });
    },
  };
}
