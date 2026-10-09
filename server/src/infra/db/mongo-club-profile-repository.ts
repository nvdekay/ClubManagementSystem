import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  ClubDepartment,
  ClubProfile,
  ClubProfileRepository,
} from "../../domain/club-profile.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

function profileFrom(doc: Record<string, unknown>): ClubProfile {
  const channels = Array.isArray(doc.channels) ? doc.channels.filter((channel): channel is {
    label: string; url: string;
  } => Boolean(channel) && typeof channel === "object"
    && typeof (channel as { label?: unknown }).label === "string"
    && typeof (channel as { url?: unknown }).url === "string") : [];
  return {
    id: String(doc._id), code: String(doc.code), name: String(doc.name),
    field: String(doc.field), state: String(doc.state),
    description: typeof doc.description === "string" ? doc.description : undefined,
    contactEmail: typeof doc.contactEmail === "string" ? doc.contactEmail : undefined,
    contactPhone: typeof doc.contactPhone === "string" ? doc.contactPhone : undefined,
    charterUrl: typeof doc.charterUrl === "string" ? doc.charterUrl : undefined,
    channels, operatingScope: typeof doc.operatingScope === "string" ? doc.operatingScope : undefined,
    institutionalFields: doc.institutionalFields,
    updatedAt: doc.updatedAt as Date | undefined,
  };
}

function departmentFrom(doc: Record<string, unknown>): ClubDepartment {
  return {
    id: String(doc._id), clubId: String(doc.clubId), name: String(doc.name),
    description: typeof doc.description === "string" ? doc.description : undefined,
    sortOrder: Number(doc.sortOrder), isActive: doc.isActive === true,
    createdAt: doc.createdAt as Date, updatedAt: doc.updatedAt as Date | undefined,
  };
}

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function duplicate(error: unknown): never {
  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    throw new DomainError("department name already exists", "conflict");
  }
  throw error;
}

export function mongoClubProfileRepository(): ClubProfileRepository {
  const clubs = ucmsModels.clubs!;
  const departments = ucmsModels.clubDepartments!;
  const positions = ucmsModels.clubPositions!;
  const memberships = ucmsModels.clubMemberships!;
  const audits = ucmsModels.auditLogs!;

  async function findDepartment(clubId: Types.ObjectId, departmentId: Types.ObjectId,
    session: ClientSession) {
    const department = await departments.findOne({ _id: departmentId, clubId })
      .session(session).lean();
    if (!department) throw new DomainError("club department not found", "not_found");
    return department;
  }

  async function assertUnused(clubId: Types.ObjectId, department: Record<string, unknown>,
    session: ClientSession) {
    const [roleCount, memberCount] = await Promise.all([
      positions.countDocuments({ clubId, isActive: true, unit: department.name }).session(session),
      memberships.countDocuments({ clubId, departmentId: department._id,
        state: { $in: ["Active", "Inactive"] } }).session(session),
    ]);
    if (roleCount || memberCount) {
      throw new DomainError("department is still in use", "conflict", { roleCount, memberCount });
    }
  }

  async function list(clubId: string): Promise<ClubDepartment[]> {
    const docs = await departments.find({ clubId: new Types.ObjectId(clubId) })
      .sort({ isActive: -1, sortOrder: 1, name: 1 }).lean();
    return docs.map(departmentFrom);
  }

  return {
    async findProfile(clubId) {
      const club = await clubs.findById(new Types.ObjectId(clubId)).lean();
      return club ? profileFrom(club) : null;
    },

    listDepartments: list,

    async updateProfile(clubId, actorId, input, now) {
      const id = new Types.ObjectId(clubId);
      await mongoose.connection.transaction(async (session) => {
        const before = await clubs.findById(id).session(session).lean();
        if (!before) throw new DomainError("club not found", "not_found");
        const set: Record<string, unknown> = { channels: input.channels, updatedAt: now };
        const unset: Record<string, ""> = {};
        for (const key of ["description", "contactEmail", "contactPhone", "charterUrl",
          "operatingScope"] as const) {
          if (input[key] === undefined) unset[key] = "";
          else set[key] = input[key];
        }
        await clubs.updateOne({ _id: id }, { $set: set, $unset: unset }, { session });
        await audits.create([{
          entityType: "Club", entityId: id, action: "CLUB_PROFILE_UPDATED",
          actorId: new Types.ObjectId(actorId), actorRole: "Club Member",
          before: profileFrom(before), after: input,
          correlationId: randomUUID(), at: now,
        }], { session });
      });
      const updated = await clubs.findById(id).lean();
      if (!updated) throw new DomainError("club not found", "not_found");
      return profileFrom(updated);
    },

    async applyDepartmentTemplate(clubId, actorId, template, now) {
      const id = new Types.ObjectId(clubId);
      await mongoose.connection.transaction(async (session) => {
        if (await departments.exists({ clubId: id }).session(session)) return;
        await departments.insertMany(template.map((department) => ({
          clubId: id, name: department.name, normalizedName: normalizedName(department.name),
          description: department.description, sortOrder: department.sortOrder,
          isActive: true, createdAt: now,
        })), { session });
        await audits.create([{
          entityType: "Club", entityId: id, action: "CLUB_DEPARTMENT_TEMPLATE_APPLIED",
          actorId: new Types.ObjectId(actorId), actorRole: "Club Member",
          after: { departments: template.map((department) => department.name) },
          correlationId: randomUUID(), at: now,
        }], { session });
      });
      return list(clubId);
    },

    async createDepartment(clubId, actorId, input, now) {
      const id = new Types.ObjectId(clubId);
      let createdId: Types.ObjectId | undefined;
      try {
        await mongoose.connection.transaction(async (session) => {
          if (!await clubs.exists({ _id: id }).session(session)) {
            throw new DomainError("club not found", "not_found");
          }
          const created = await departments.create([{
            clubId: id, name: input.name, normalizedName: normalizedName(input.name),
            description: input.description, sortOrder: input.sortOrder,
            isActive: true, createdAt: now,
          }], { session });
          createdId = new Types.ObjectId(String(created[0]!._id));
          await audits.create([{
            entityType: "ClubDepartment", entityId: createdId,
            action: "CLUB_DEPARTMENT_CREATED", actorId: new Types.ObjectId(actorId),
            actorRole: "Club Member", after: input, correlationId: randomUUID(), at: now,
          }], { session });
        });
      } catch (error) { duplicate(error); }
      const created = await departments.findById(createdId).lean();
      if (!created) throw new DomainError("club department not found", "not_found");
      return departmentFrom(created);
    },

    async updateDepartment(clubId, departmentId, actorId, input, now) {
      const clubObjectId = new Types.ObjectId(clubId);
      const departmentObjectId = new Types.ObjectId(departmentId);
      try {
        await mongoose.connection.transaction(async (session) => {
          const before = await findDepartment(clubObjectId, departmentObjectId, session);
          if (normalizedName(String(before.name)) !== normalizedName(input.name)) {
            await assertUnused(clubObjectId, before, session);
          }
          await departments.updateOne({ _id: departmentObjectId, clubId: clubObjectId }, {
            $set: { name: input.name, normalizedName: normalizedName(input.name),
              sortOrder: input.sortOrder, updatedAt: now,
              ...(input.description ? { description: input.description } : {}) },
            ...(input.description ? {} : { $unset: { description: "" } }),
          }, { session });
          await audits.create([{
            entityType: "ClubDepartment", entityId: departmentObjectId,
            action: "CLUB_DEPARTMENT_UPDATED", actorId: new Types.ObjectId(actorId),
            actorRole: "Club Member", before: departmentFrom(before), after: input,
            correlationId: randomUUID(), at: now,
          }], { session });
        });
      } catch (error) { duplicate(error); }
      const updated = await departments.findById(departmentObjectId).lean();
      if (!updated) throw new DomainError("club department not found", "not_found");
      return departmentFrom(updated);
    },

    async deactivateDepartment(clubId, departmentId, actorId, now) {
      const clubObjectId = new Types.ObjectId(clubId);
      const departmentObjectId = new Types.ObjectId(departmentId);
      await mongoose.connection.transaction(async (session) => {
        const before = await findDepartment(clubObjectId, departmentObjectId, session);
        if (before.isActive !== true) return;
        await assertUnused(clubObjectId, before, session);
        await departments.updateOne({ _id: departmentObjectId, clubId: clubObjectId,
          isActive: true }, { $set: { isActive: false, updatedAt: now } }, { session });
        await audits.create([{
          entityType: "ClubDepartment", entityId: departmentObjectId,
          action: "CLUB_DEPARTMENT_DEACTIVATED", actorId: new Types.ObjectId(actorId),
          actorRole: "Club Member", before: { isActive: true }, after: { isActive: false },
          correlationId: randomUUID(), at: now,
        }], { session });
      });
      const updated = await departments.findById(departmentObjectId).lean();
      if (!updated) throw new DomainError("club department not found", "not_found");
      return departmentFrom(updated);
    },
  };
}
