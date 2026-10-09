import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type { PublicCampaign } from "../../domain/public-discovery.js";
import { DomainError } from "../../domain/errors.js";
import type {
  RecruitmentAnswer, RecruitmentApplication, RecruitmentApplicationRepository,
  RecruitmentApplicationState, RecruitmentAttachment, RecruitmentEligibility,
} from "../../domain/recruitment-application.js";
import { validateRecruitmentAnswers } from "../../domain/recruitment-application.js";
import { ucmsModels } from "./ucms-models.js";

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function attachmentList(value: unknown): RecruitmentAttachment[] {
  return records(value).flatMap((item) => typeof item.id === "string"
    && typeof item.fieldKey === "string" && typeof item.fileName === "string"
    && typeof item.mimeType === "string" && typeof item.bytes === "number"
    && typeof item.assetId === "string" ? [{
      id: item.id, fieldKey: item.fieldKey, fileName: item.fileName,
      mimeType: item.mimeType, bytes: item.bytes, assetId: item.assetId,
      uploadedAt: item.uploadedAt instanceof Date ? item.uploadedAt : new Date(item.uploadedAt as string),
    }] : []);
}

function mapApplication(doc: Record<string, unknown>): RecruitmentApplication {
  const answers = doc.answers && typeof doc.answers === "object"
    ? doc.answers as Record<string, RecruitmentAnswer> : {};
  return {
    id: String(doc._id), campaignId: String(doc.campaignId), clubId: String(doc.clubId),
    userId: String(doc.userId), position: typeof doc.position === "string" ? doc.position : "",
    answers, attachments: attachmentList(doc.attachments),
    state: String(doc.state) as RecruitmentApplicationState,
    ...(typeof doc.decisionOutcome === "string" ? { decisionOutcome: doc.decisionOutcome } : {}),
    ...(typeof doc.decisionReason === "string" ? { decisionReason: doc.decisionReason } : {}),
    ...(doc.submittedAt instanceof Date ? { submittedAt: doc.submittedAt } : {}),
    ...(doc.withdrawnAt instanceof Date ? { withdrawnAt: doc.withdrawnAt } : {}),
  };
}

function mapCampaign(doc: Record<string, unknown>): PublicCampaign {
  const steps = records(doc.selectionSteps);
  const fields = records(doc.formSchema);
  const rubric = records(doc.rubric);
  return {
    id: String(doc._id), clubId: String(doc.clubId), title: String(doc.title),
    state: String(doc.state), windowStart: doc.windowStart as Date,
    windowEnd: doc.windowEnd as Date, capacity: Number(doc.capacity), positions: strings(doc.positions),
    ...(typeof doc.criteria === "string" ? { criteria: doc.criteria } : {}),
    selectionSteps: steps.flatMap((step) => typeof step.name === "string" ? [{
      name: step.name, ...(typeof step.description === "string" ? { description: step.description } : {}),
      ...(step.startsAt instanceof Date ? { startsAt: step.startsAt } : {}),
      ...(step.endsAt instanceof Date ? { endsAt: step.endsAt } : {}),
    }] : []),
    formSchema: fields.flatMap((field) => typeof field.key === "string" && typeof field.label === "string"
      && typeof field.type === "string" ? [{ key: field.key, label: field.label, type: field.type,
        required: field.required === true, ...(Array.isArray(field.options) ? { options: strings(field.options) } : {}) }] : []),
    rubric: rubric.flatMap((criterion) => typeof criterion.key === "string"
      && typeof criterion.label === "string" && typeof criterion.maxScore === "number"
      ? [{ key: criterion.key, label: criterion.label, maxScore: criterion.maxScore }] : []),
  };
}

function duplicate(error: unknown): never {
  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    throw new DomainError("an application already exists for this campaign", "conflict");
  }
  throw error;
}

export function mongoRecruitmentApplicationRepository(): RecruitmentApplicationRepository {
  const applications = ucmsModels.recruitmentApplications!;
  const campaigns = ucmsModels.recruitmentCampaigns!;
  const clubs = ucmsModels.clubs!;
  const users = ucmsModels.users!;
  const memberships = ucmsModels.clubMemberships!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  async function openCampaign(campaignId: Types.ObjectId, now: Date, session?: ClientSession) {
    let query = campaigns.findOne({ _id: campaignId,
      state: { $in: ["Published", "Accepting Applications"] },
      windowStart: { $lte: now }, windowEnd: { $gt: now } });
    if (session) query = query.session(session);
    const doc = await query.lean();
    if (!doc) return null;
    const club = await clubs.findById(doc.clubId).select("state").session(session ?? null).lean();
    // UC15 (2026-10-10): a suspended club keeps its campaign open but accepts no applications for now.
    if (club?.state === "Suspended") {
      throw new DomainError("club is suspended; applications are paused", "conflict", { reason: "clubSuspended" });
    }
    return club?.state === "Active" ? mapCampaign(doc) : null;
  }

  async function eligibility(userId: Types.ObjectId, clubId: Types.ObjectId,
    session?: ClientSession): Promise<RecruitmentEligibility> {
    const [user, active, banned] = await Promise.all([
      users.findOne({ _id: userId, accountState: "Active" }).select("_id").session(session ?? null),
      memberships.exists({ userId, clubId, state: "Active" }).session(session ?? null),
      memberships.exists({ userId, clubId, state: "Banned" }).session(session ?? null),
    ]);
    return { userActive: Boolean(user), activeMembership: Boolean(active), bannedMembership: Boolean(banned) };
  }

  async function reviewerIds(clubId: Types.ObjectId, now: Date, session: ClientSession) {
    const activeTerms = await terms.find({ clubId, state: "Active", startAt: { $lte: now },
      endAt: { $gt: now } }).select("_id").session(session).lean();
    if (!activeTerms.length) return [];
    const clubPositions = await positions.find({ clubId, isActive: true,
      $or: [{ isLeaderRole: true }, { permissionCodes: "club.application.review" }] })
      .select("_id isLeaderRole").session(session).lean();
    if (!clubPositions.length) return [];
    const positionById = new Map(clubPositions.map((position) =>
      [String(position._id), position.isLeaderRole === true]));
    const assignmentsForClub = await assignments.find({ clubId,
      termId: { $in: activeTerms.map((term) => term._id) },
      positionId: { $in: clubPositions.map((position) => position._id) },
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: now } }],
    }).select("positionId membershipId confirmedBy").session(session).lean();
    const reviewerMemberships = assignmentsForClub.filter((assignment) =>
      positionById.get(String(assignment.positionId)) !== true || Boolean(assignment.confirmedBy))
      .map((assignment) => assignment.membershipId);
    const members = await memberships.find({ _id: { $in: reviewerMemberships }, clubId, state: "Active" })
      .select("userId").session(session).lean();
    return [...new Map(members.map((member) => [String(member.userId), member.userId])).values()];
  }

  async function notifyReviewers(input: { clubId: Types.ObjectId; applicationId: Types.ObjectId;
    campaignId: Types.ObjectId; position: string; eventCode: string; now: Date;
    session: ClientSession }) {
    const recipients = await reviewerIds(input.clubId, input.now, input.session);
    if (!recipients.length) return;
    await notifications.insertMany(recipients.map((recipientUserId) => ({
      recipientUserId, eventCode: input.eventCode,
      entityType: "RecruitmentApplication", entityId: input.applicationId,
      channels: ["IN_APP"], payload: { applicationId: String(input.applicationId),
        campaignId: String(input.campaignId), position: input.position },
      state: "Queued", dueAt: input.now, attempts: 0, createdAt: input.now,
    })), { session: input.session });
  }

  return {
    async listForReview(clubId, campaignId, state) {
      const filter: Record<string, unknown> = { clubId: new Types.ObjectId(clubId),
        campaignId: new Types.ObjectId(campaignId), state: { $ne: "Draft" } };
      if (state) filter.state = state;
      const docs = await applications.find(filter).sort({ submittedAt: 1, _id: 1 }).lean();
      const usersForApps = await users.find({ _id: { $in: docs.map((doc) => doc.userId) } })
        .select("_id displayName").lean();
      const names = new Map(usersForApps.map((user) => [String(user._id),
        typeof user.displayName === "string" ? user.displayName : "Candidate"]));
      return docs.map((doc) => ({ ...mapApplication(doc), applicantName: names.get(String(doc.userId)) }));
    },

    async transition(input) {
      const clubId = new Types.ObjectId(input.clubId);
      const campaignId = new Types.ObjectId(input.campaignId);
      const actorId = new Types.ObjectId(input.actorId);
      const ids = input.applicationIds.map((id) => new Types.ObjectId(id));
      return mongoose.connection.transaction(async (session) => {
        const campaign = await campaigns.findOne({ _id: campaignId, clubId })
          .session(session).lean();
        if (!campaign) throw new DomainError("recruitment campaign not found", "not_found");
        if (["Draft", "Cancelled"].includes(String(campaign.state))
          || (String(campaign.state) === "Completed" && input.action !== "promote")) {
          throw new DomainError("campaign is not available for review", "conflict");
        }
        const current = await applications.find({ _id: { $in: ids }, campaignId, clubId })
          .session(session).lean();
        if (current.length !== ids.length) throw new DomainError("application not found", "not_found");
        const expected: Record<string, readonly string[]> = {
          screen: ["Submitted"], shortlist: ["Screening"],
          decide: input.outcome === "Rejected" ? ["Screening", "Shortlisted"] : ["Shortlisted"],
          promote: ["Waitlisted"],
          "close-withdrawn": ["Withdrawn"],
        };
        if (current.some((app) => !expected[input.action]?.includes(String(app.state)))) {
          throw new DomainError("application state changed; refresh and retry", "conflict");
        }
        const outcome = input.action === "screen" ? "Screening"
          : input.action === "shortlist" ? "Shortlisted"
            : input.action === "close-withdrawn" ? "Withdrawn"
              : input.action === "promote" ? "Accepted" : input.outcome;
        if (outcome === "Accepted") {
          const accepted = await applications.countDocuments({ campaignId, clubId,
            state: { $in: ["Accepted", "Onboarded"] }, _id: { $nin: ids } }).session(session);
          if (accepted + current.length > Number(campaign.capacity)) {
            throw new DomainError("campaign capacity reached; use Waitlisted instead", "conflict", {
              capacity: Number(campaign.capacity), accepted,
            });
          }
        }
        if (input.action === "close-withdrawn") return current.map(mapApplication);
        for (const app of current) {
          const fromState = String(app.state);
          const nextState = outcome!;
          const update: Record<string, unknown> = { state: nextState };
          if (["Accepted", "Rejected", "Waitlisted"].includes(nextState)) {
            update.decisionOutcome = nextState;
            if (input.reason) update.decisionReason = input.reason;
            update.decidedAt = input.now;
          }
          const changed = await applications.updateOne({ _id: app._id, state: fromState },
            { $set: update }, { session });
          if (changed.modifiedCount !== 1) throw new DomainError("application changed during review", "conflict");
          const correlationId = randomUUID();
          await audits.create([{
            entityType: "RecruitmentApplication", entityId: app._id,
            action: `RECRUITMENT_APPLICATION_${input.action.toUpperCase().replaceAll("-", "_")}`,
            actorId, actorRole: "Club Member", before: { state: fromState },
            after: { state: nextState, ...(input.reason ? { reason: input.reason } : {}) },
            correlationId, at: input.now,
          }], { session });
          if (["Accepted", "Rejected", "Waitlisted"].includes(nextState)) {
            await notifications.create([{
              recipientUserId: app.userId, eventCode: `RECRUITMENT_APPLICATION_${nextState.toUpperCase()}`,
              entityType: "RecruitmentApplication", entityId: app._id,
              channels: ["IN_APP"], payload: { campaignId: String(campaignId),
                applicationId: String(app._id), outcome: nextState,
                ...(input.reason ? { reason: input.reason } : {}) },
              state: "Queued", dueAt: input.now, attempts: 0, createdAt: input.now,
            }], { session });
          }
        }
        const all = await applications.find({ campaignId }).select("state").session(session).lean();
        const terminal = new Set(["Accepted", "Rejected", "Waitlisted", "Withdrawn", "Onboarded", "Declined"]);
        if (all.length > 0 && all.every((app) => terminal.has(String(app.state)))) {
          await campaigns.updateOne({ _id: campaignId, state: { $ne: "Completed" } },
            { $set: { state: "Completed" } }, { session });
        }
        const updated = await applications.find({ _id: { $in: ids } }).session(session).lean();
        return updated.map(mapApplication);
      });
    },

    async onboard(input) {
      const clubId = new Types.ObjectId(input.clubId);
      const campaignId = new Types.ObjectId(input.campaignId);
      const applicationId = new Types.ObjectId(input.applicationId);
      const actorId = new Types.ObjectId(input.actorId);
      await mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: applicationId, clubId, campaignId,
          state: "Accepted" }).session(session).lean();
        if (!current) throw new DomainError("only accepted candidates can be onboarded", "conflict");
        const [club, candidate, banned, active, memberRole] = await Promise.all([
          clubs.findOne({ _id: clubId, state: "Active" }).session(session).select("_id").lean(),
          users.findOne({ _id: current.userId, accountState: "Active" }).session(session).select("_id").lean(),
          memberships.exists({ clubId, userId: current.userId, state: "Banned" }).session(session),
          memberships.exists({ clubId, userId: current.userId, state: "Active" }).session(session),
          positions.findOne({ clubId, isDefaultMemberRole: true, isActive: true })
            .session(session).select("code").lean(),
        ]);
        if (!club) throw new DomainError("club is not active", "conflict");
        if (!candidate) throw new DomainError("candidate account is not active", "forbidden");
        if (banned) throw new DomainError("banned students cannot be onboarded", "forbidden");
        if (active) throw new DomainError("student already has an active membership", "conflict");
        if (!memberRole) throw new DomainError("default Members role is not configured", "conflict");
        if (input.departmentId) {
          const department = await ucmsModels.clubDepartments!.exists({ _id: new Types.ObjectId(input.departmentId),
            clubId, isActive: true }).session(session);
          if (!department) throw new DomainError("department not found or inactive", "validation");
        }
        let membershipId: Types.ObjectId;
        try {
          const [membership] = await memberships.create([{
            clubId, userId: current.userId, state: "Active", joinedAt: input.joinedAt,
            ...(input.departmentId ? { departmentId: new Types.ObjectId(input.departmentId) } : {}),
            defaultRole: String(memberRole.code), sourceApplicationId: applicationId,
            statusHistory: [{ state: "Active", at: input.now, actorId, reason: "Recruitment onboarding" }],
          }], { session });
          membershipId = new Types.ObjectId(String(membership!._id));
        } catch (error) {
          if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
            throw new DomainError("student already has a membership record in this club", "conflict");
          }
          throw error;
        }
        const changed = await applications.updateOne({ _id: applicationId, state: "Accepted" },
          { $set: { state: "Onboarded", onboardedAt: input.now, membershipId } }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("application changed during onboarding", "conflict");
        const correlationId = randomUUID();
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: applicationId,
          action: "RECRUITMENT_APPLICATION_ONBOARDED", actorId, actorRole: "Club Member",
          before: { state: "Accepted" }, after: { state: "Onboarded", membershipId,
            defaultRole: String(memberRole.code) }, correlationId, at: input.now,
        }], { session });
        await notifications.create([{
          recipientUserId: current.userId, eventCode: "RECRUITMENT_APPLICATION_ONBOARDED",
          entityType: "RecruitmentApplication", entityId: applicationId, channels: ["IN_APP"],
          payload: { campaignId: String(campaignId), applicationId: String(applicationId), membershipId: String(membershipId) },
          state: "Queued", dueAt: input.now, attempts: 0, createdAt: input.now,
        }], { session });
      });
      const updated = await applications.findById(applicationId).lean();
      if (!updated) throw new DomainError("application not found", "not_found");
      return mapApplication(updated);
    },

    async declineAccepted(input) {
      const applicationId = new Types.ObjectId(input.applicationId);
      const clubId = new Types.ObjectId(input.clubId);
      const campaignId = new Types.ObjectId(input.campaignId);
      const actorId = new Types.ObjectId(input.actorId);
      await mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: applicationId, clubId, campaignId,
          state: "Accepted" }).session(session).lean();
        if (!current) throw new DomainError("only accepted candidates can be marked declined", "conflict");
        const changed = await applications.updateOne({ _id: applicationId, state: "Accepted" }, {
          $set: { state: "Declined", declinedAt: input.now,
            ...(input.reason ? { decisionReason: input.reason } : {}) },
        }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("application changed during decline", "conflict");
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: applicationId,
          action: "RECRUITMENT_APPLICATION_DECLINED", actorId, actorRole: "Club Member",
          before: { state: "Accepted" }, after: { state: "Declined", ...(input.reason ? { reason: input.reason } : {}) },
          correlationId: randomUUID(), at: input.now,
        }], { session });
        await notifications.create([{
          recipientUserId: current.userId, eventCode: "RECRUITMENT_APPLICATION_DECLINED",
          entityType: "RecruitmentApplication", entityId: applicationId, channels: ["IN_APP"],
          payload: { campaignId: String(campaignId), applicationId: String(applicationId),
            ...(input.reason ? { reason: input.reason } : {}) },
          state: "Queued", dueAt: input.now, attempts: 0, createdAt: input.now,
        }], { session });
      });
      const updated = await applications.findById(applicationId).lean();
      if (!updated) throw new DomainError("application not found", "not_found");
      return mapApplication(updated);
    },

    async campaign(campaignId, now) {
      if (!Types.ObjectId.isValid(campaignId)) return null;
      return openCampaign(new Types.ObjectId(campaignId), now);
    },

    async eligibility(userId, clubId) {
      return eligibility(new Types.ObjectId(userId), new Types.ObjectId(clubId));
    },

    async createDraft(input) {
      const campaignId = new Types.ObjectId(input.campaign.id);
      const clubId = new Types.ObjectId(input.campaign.clubId!);
      const userId = new Types.ObjectId(input.userId);
      const eligibilityResult = await eligibility(userId, clubId);
      if (!eligibilityResult.userActive || eligibilityResult.activeMembership || eligibilityResult.bannedMembership) {
        throw new DomainError("student is not eligible to apply", "conflict");
      }
      try {
        let applicationId: Types.ObjectId | undefined;
        await mongoose.connection.transaction(async (session) => {
          const campaign = await openCampaign(campaignId, input.now, session);
          if (!campaign) throw new DomainError("recruitment campaign not found or closed", "conflict");
          const currentEligibility = await eligibility(userId, clubId, session);
          if (!currentEligibility.userActive || currentEligibility.activeMembership
            || currentEligibility.bannedMembership) {
            throw new DomainError("student is not eligible to apply", "conflict");
          }
          const [created] = await applications.create([{
            campaignId, clubId, userId, position: input.position, answers: {}, attachments: [],
            state: "Draft",
          }], { session });
          applicationId = new Types.ObjectId(String(created!._id));
          await audits.create([{
            entityType: "RecruitmentApplication", entityId: applicationId,
            action: "RECRUITMENT_APPLICATION_DRAFT_CREATED", actorId: userId,
            actorRole: "Student", after: { campaignId, position: input.position },
            correlationId: randomUUID(), at: input.now,
          }], { session });
        });
        const created = await applications.findById(applicationId).lean();
        if (!created) throw new DomainError("recruitment application not found", "not_found");
        return mapApplication(created);
      } catch (error) { duplicate(error); }
    },

    async findOwned(applicationId, userId) {
      const doc = await applications.findOne({ _id: new Types.ObjectId(applicationId),
        userId: new Types.ObjectId(userId) }).lean();
      return doc ? mapApplication(doc) : null;
    },

    async findMineForCampaign(campaignId, userId) {
      const doc = await applications.findOne({ campaignId: new Types.ObjectId(campaignId),
        userId: new Types.ObjectId(userId) }).lean();
      return doc ? mapApplication(doc) : null;
    },

    async listMine(userId) {
      const docs = await applications.find({ userId: new Types.ObjectId(userId) })
        .sort({ submittedAt: -1, _id: -1 }).lean();
      const [campaignDocs, clubDocs] = await Promise.all([
        campaigns.find({ _id: { $in: docs.map((doc) => doc.campaignId) } }).select("_id title").lean(),
        clubs.find({ _id: { $in: docs.map((doc) => doc.clubId) } }).select("_id name").lean(),
      ]);
      const campaignNames = new Map(campaignDocs.map((doc) => [String(doc._id), String(doc.title)]));
      const clubNames = new Map(clubDocs.map((doc) => [String(doc._id), String(doc.name)]));
      return docs.map((doc) => ({ ...mapApplication(doc),
        campaignTitle: campaignNames.get(String(doc.campaignId)),
        clubName: clubNames.get(String(doc.clubId)),
      }));
    },

    async updateDraft(input) {
      const id = new Types.ObjectId(input.applicationId);
      const userId = new Types.ObjectId(input.userId);
      await mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: id, userId, state: "Draft" })
          .session(session).lean();
        if (!current) throw new DomainError("recruitment application is no longer editable", "conflict");
        const campaign = await openCampaign(new Types.ObjectId(String(current.campaignId)), input.now, session);
        if (!campaign) throw new DomainError("recruitment campaign is closed", "conflict");
        const eligibilityResult = await eligibility(userId, new Types.ObjectId(String(current.clubId)), session);
        if (!eligibilityResult.userActive || eligibilityResult.activeMembership || eligibilityResult.bannedMembership) {
          throw new DomainError("student is no longer eligible to apply", "conflict");
        }
        const changed = await applications.updateOne({ _id: id, userId, state: "Draft" }, {
          $set: { position: input.position, answers: input.answers },
        }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("application changed while saving", "conflict");
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: id,
          action: "RECRUITMENT_APPLICATION_DRAFT_UPDATED", actorId: userId,
          actorRole: "Student", after: { position: input.position, answerKeys: Object.keys(input.answers) },
          correlationId: randomUUID(), at: input.now,
        }], { session });
      });
      const updated = await applications.findById(id).lean();
      if (!updated) throw new DomainError("recruitment application not found", "not_found");
      return mapApplication(updated);
    },

    async addAttachment(input) {
      const id = new Types.ObjectId(input.applicationId);
      const userId = new Types.ObjectId(input.userId);
      await mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: id, userId, state: "Draft" })
          .session(session).lean();
        if (!current) throw new DomainError("recruitment application is no longer editable", "conflict");
        const field = mapCampaign(await campaigns.findById(current.campaignId).session(session).lean() ?? {})
          .formSchema?.find((item) => item.key === input.attachment.fieldKey && item.type === "file");
        if (!field) throw new DomainError("attachment field is not part of this campaign", "validation");
        const attachmentsForField = attachmentList(current.attachments)
          .filter((attachment) => attachment.fieldKey === input.attachment.fieldKey);
        if (attachmentsForField.length) {
          throw new DomainError("an attachment already exists for this field", "conflict");
        }
        await applications.updateOne({ _id: id, userId, state: "Draft" }, {
          $push: { attachments: input.attachment },
        }, { session });
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: id,
          action: "RECRUITMENT_APPLICATION_ATTACHMENT_ADDED", actorId: userId,
          actorRole: "Student", after: { fieldKey: input.attachment.fieldKey,
            fileName: input.attachment.fileName }, correlationId: randomUUID(), at: input.attachment.uploadedAt,
        }], { session });
      });
      const updated = await applications.findById(id).lean();
      if (!updated) throw new DomainError("recruitment application not found", "not_found");
      return mapApplication(updated);
    },

    async reviewAttachment(input) {
      const doc = await applications.findOne({ _id: new Types.ObjectId(input.applicationId),
        clubId: new Types.ObjectId(input.clubId), campaignId: new Types.ObjectId(input.campaignId),
        state: { $ne: "Draft" } }).select("attachments").lean();
      return doc ? attachmentList(doc.attachments)
        .find((attachment) => attachment.id === input.attachmentId) ?? null : null;
    },
    async attachmentAccess(applicationId, userId, attachmentId) {
      const doc = await applications.findOne({ _id: new Types.ObjectId(applicationId),
        userId: new Types.ObjectId(userId) }).select("attachments").lean();
      return doc ? attachmentList(doc.attachments).find((attachment) => attachment.id === attachmentId) ?? null : null;
    },

    async submit(applicationId, userId, now) {
      const id = new Types.ObjectId(applicationId);
      const actorId = new Types.ObjectId(userId);
      return mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: id, userId: actorId, state: "Draft" })
          .session(session).lean();
        if (!current) throw new DomainError("recruitment application is no longer editable", "conflict");
        const campaign = await openCampaign(new Types.ObjectId(String(current.campaignId)), now, session);
        if (!campaign) throw new DomainError("recruitment campaign is closed", "conflict");
        const eligibilityResult = await eligibility(actorId, new Types.ObjectId(String(current.clubId)), session);
        if (!eligibilityResult.userActive || eligibilityResult.activeMembership || eligibilityResult.bannedMembership) {
          throw new DomainError("student is no longer eligible to apply", "conflict");
        }
        const application = mapApplication(current);
        validateRecruitmentAnswers({ campaign, position: application.position,
          answers: application.answers, attachments: application.attachments });
        const changed = await applications.updateOne({ _id: id, userId: actorId, state: "Draft" }, {
          $set: { state: "Submitted", submittedAt: now },
        }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("application changed while submitting", "conflict");
        const correlationId = randomUUID();
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: id,
          action: "RECRUITMENT_APPLICATION_SUBMITTED", actorId,
          actorRole: "Student", before: { state: "Draft" },
          after: { state: "Submitted", campaignId: current.campaignId, position: current.position },
          correlationId, at: now,
        }], { session });
        await notifyReviewers({ clubId: new Types.ObjectId(String(current.clubId)), applicationId: id,
          campaignId: new Types.ObjectId(String(current.campaignId)), position: String(current.position),
          eventCode: "RECRUITMENT_APPLICATION_SUBMITTED", now, session });
        const updated = await applications.findById(id).session(session).lean();
        if (!updated) throw new DomainError("recruitment application not found", "not_found");
        return mapApplication(updated);
      });
    },

    async withdraw(applicationId, userId, now) {
      const id = new Types.ObjectId(applicationId);
      const actorId = new Types.ObjectId(userId);
      return mongoose.connection.transaction(async (session) => {
        const current = await applications.findOne({ _id: id, userId: actorId,
          state: { $in: ["Submitted", "Screening", "Shortlisted"] } }).session(session).lean();
        if (!current) throw new DomainError("recruitment application cannot be withdrawn in this state", "conflict");
        const changed = await applications.updateOne({ _id: id, userId: actorId,
          state: current.state }, { $set: { state: "Withdrawn", withdrawnAt: now } }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("application changed while withdrawing", "conflict");
        await audits.create([{
          entityType: "RecruitmentApplication", entityId: id,
          action: "RECRUITMENT_APPLICATION_WITHDRAWN", actorId,
          actorRole: "Student", before: { state: current.state }, after: { state: "Withdrawn" },
          correlationId: randomUUID(), at: now,
        }], { session });
        await notifyReviewers({ clubId: new Types.ObjectId(String(current.clubId)), applicationId: id,
          campaignId: new Types.ObjectId(String(current.campaignId)), position: String(current.position),
          eventCode: "RECRUITMENT_APPLICATION_WITHDRAWN", now, session });
        const updated = await applications.findById(id).session(session).lean();
        if (!updated) throw new DomainError("recruitment application not found", "not_found");
        return mapApplication(updated);
      });
    },
  };
}
