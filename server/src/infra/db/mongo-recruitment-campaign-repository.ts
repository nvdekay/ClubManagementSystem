import { randomUUID } from 'node:crypto'
import mongoose, { Types } from 'mongoose'
import type {
  OverlappingCampaign,
  RecruitmentCampaign,
  RecruitmentCampaignInput,
  RecruitmentCampaignRepository,
  RecruitmentFormField,
  RecruitmentRubricCriterion,
  RecruitmentSelectionStep,
} from '../../domain/recruitment-campaign.js'
import { DomainError } from '../../domain/errors.js'
import { found, queueNotifications, records, strings, writeAudit } from './repo-helpers.js'
import { ucmsModels } from './ucms-models.js'

// Chuẩn hóa các bước tuyển chọn của đợt tuyển
function selectionSteps(value: unknown): RecruitmentSelectionStep[] {
  return records(value).flatMap((step) =>
    typeof step.name === 'string'
      ? [
          {
            name: step.name,
            ...(typeof step.description === 'string' ? { description: step.description } : {}),
            ...(step.startsAt instanceof Date ? { startsAt: step.startsAt } : {}),
            ...(step.endsAt instanceof Date ? { endsAt: step.endsAt } : {}),
          },
        ]
      : [],
  )
}

// Chuẩn hóa các trường form ứng tuyển
function formFields(value: unknown): RecruitmentFormField[] {
  return records(value).flatMap((field) =>
    typeof field.key === 'string' &&
    typeof field.label === 'string' &&
    ['text', 'textarea', 'url', 'select', 'multiselect', 'file'].includes(String(field.type))
      ? [
          {
            key: field.key,
            label: field.label,
            type: field.type as RecruitmentFormField['type'],
            required: field.required === true,
            ...(Array.isArray(field.options) ? { options: strings(field.options) } : {}),
          },
        ]
      : [],
  )
}

// Chuẩn hóa tiêu chí chấm điểm (rubric) của đợt tuyển
function rubricCriteria(value: unknown): RecruitmentRubricCriterion[] {
  return records(value).flatMap((criterion) =>
    typeof criterion.key === 'string' &&
    typeof criterion.label === 'string' &&
    typeof criterion.maxScore === 'number'
      ? [{ key: criterion.key, label: criterion.label, maxScore: criterion.maxScore }]
      : [],
  )
}

// Ánh xạ document đợt tuyển sang RecruitmentCampaign
function mapCampaign(doc: Record<string, unknown>): RecruitmentCampaign {
  return {
    id: String(doc._id),
    clubId: String(doc.clubId),
    title: String(doc.title),
    positions: strings(doc.positions),
    criteria: typeof doc.criteria === 'string' ? doc.criteria : undefined,
    windowStart: doc.windowStart as Date,
    windowEnd: doc.windowEnd as Date,
    capacity: Number(doc.capacity),
    selectionSteps: selectionSteps(doc.selectionSteps),
    formSchema: formFields(doc.formSchema),
    rubric: rubricCriteria(doc.rubric),
    state: String(doc.state) as RecruitmentCampaign['state'],
    ...(doc.publishedBy ? { publishedBy: String(doc.publishedBy) } : {}),
    ...(doc.publishedAt instanceof Date ? { publishedAt: doc.publishedAt } : {}),
    createdAt: doc.createdAt as Date,
  }
}

// Ánh xạ document đợt tuyển sang OverlappingCampaign
function mapOverlap(doc: Record<string, unknown>): OverlappingCampaign {
  return {
    id: String(doc._id),
    title: String(doc.title),
    positions: strings(doc.positions),
    windowStart: doc.windowStart as Date,
    windowEnd: doc.windowEnd as Date,
    state: String(doc.state) as OverlappingCampaign['state'],
  }
}

// Kiểm tra hai danh sách vị trí có trùng nhau, không phân biệt hoa thường
function positionOverlap(left: readonly string[], right: readonly string[]): boolean {
  const normalized = new Set(left.map((position) => position.toLocaleLowerCase('vi-VN')))
  return right.some((position) => normalized.has(position.toLocaleLowerCase('vi-VN')))
}

// Dựng dữ liệu lưu của đợt tuyển từ input
function campaignData(input: RecruitmentCampaignInput) {
  return {
    title: input.title,
    positions: [...input.positions],
    criteria: input.criteria,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    capacity: input.capacity,
    selectionSteps: input.selectionSteps,
    formSchema: input.formSchema,
    rubric: input.rubric,
  }
}

// Repository đợt tuyển thành viên của CLB
export function mongoRecruitmentCampaignRepository(): RecruitmentCampaignRepository {
  const campaigns = ucmsModels.recruitmentCampaigns!
  const applications = ucmsModels.recruitmentApplications!
  const clubs = ucmsModels.clubs!

  return {
    // Liệt kê đợt tuyển của CLB, mới nhất trước
    async list(clubId) {
      const docs = await campaigns
        .find({ clubId: new Types.ObjectId(clubId) })
        .sort({ createdAt: -1, _id: -1 })
        .lean()
      return docs.map((doc) => mapCampaign(doc))
    },

    // Lấy một đợt tuyển của CLB
    async find(clubId, campaignId) {
      const doc = await campaigns
        .findOne({ _id: new Types.ObjectId(campaignId), clubId: new Types.ObjectId(clubId) })
        .lean()
      return doc ? mapCampaign(doc) : null
    },

    // Tìm đợt tuyển khác có vị trí và thời gian trùng nhau
    async overlaps(clubId, campaignId, positions, windowStart, windowEnd) {
      const docs = await campaigns
        .find({
          clubId: new Types.ObjectId(clubId),
          ...(campaignId ? { _id: { $ne: new Types.ObjectId(campaignId) } } : {}),
          state: { $in: ['Draft', 'Published', 'Accepting Applications', 'Screening'] },
          windowStart: { $lt: windowEnd },
          windowEnd: { $gt: windowStart },
        })
        .lean()
      return docs
        .map((doc) => mapOverlap(doc))
        .filter((campaign) => positionOverlap(positions, campaign.positions))
    },

    // Tạo đợt tuyển Draft của CLB
    async createDraft(clubId, actorId, input, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const actorObjectId = new Types.ObjectId(actorId)
      let createdId: Types.ObjectId | undefined
      await mongoose.connection.transaction(async (session) => {
        const club = found(
          await clubs.findById(clubObjectId).session(session).lean(),
          'club not found',
        )
        if (club.state !== 'Active') {
          throw new DomainError('club is not active', 'conflict')
        }
        const created = await campaigns.create(
          [
            {
              clubId: clubObjectId,
              ...campaignData(input),
              state: 'Draft',
              createdAt: now,
            },
          ],
          { session },
        )
        const campaign = created[0]!
        createdId = new Types.ObjectId(String(campaign._id))
        await writeAudit(session, {
          entityType: 'RecruitmentCampaign',
          entityId: campaign._id,
          action: 'RECRUITMENT_CAMPAIGN_DRAFT_CREATED',
          actorId: actorObjectId,
          actorRole: 'Club Member',
          after: campaignData(input),
          at: now,
        })
      })
      const created = found(
        await campaigns.findById(createdId).lean(),
        'recruitment campaign not found',
      )
      return mapCampaign(created)
    },

    // Cập nhật đợt tuyển Draft
    async updateDraft(clubId, campaignId, actorId, input, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const campaignObjectId = new Types.ObjectId(campaignId)
      await mongoose.connection.transaction(async (session) => {
        const current = found(
          await campaigns
            .findOne({ _id: campaignObjectId, clubId: clubObjectId })
            .session(session)
            .lean(),
          'recruitment campaign not found',
        )
        if (current.state !== 'Draft') {
          throw new DomainError('only draft campaigns can be edited', 'conflict')
        }
        const club = found(
          await clubs.findById(clubObjectId).session(session).lean(),
          'club not found',
        )
        if (club.state !== 'Active') {
          throw new DomainError('club is not active', 'conflict')
        }
        const changed = await campaigns.updateOne(
          { _id: campaignObjectId, clubId: clubObjectId, state: 'Draft' },
          { $set: campaignData(input) },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          throw new DomainError('campaign changed while saving', 'conflict')
        }
        await writeAudit(session, {
          entityType: 'RecruitmentCampaign',
          entityId: campaignObjectId,
          action: 'RECRUITMENT_CAMPAIGN_DRAFT_UPDATED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Member',
          before: mapCampaign(current),
          after: campaignData(input),
          at: now,
        })
      })
      const updated = found(
        await campaigns.findById(campaignObjectId).lean(),
        'recruitment campaign not found',
      )
      return mapCampaign(updated)
    },

    // Publish đợt tuyển để mở nhận đơn
    async publish(clubId, campaignId, actorId, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const campaignObjectId = new Types.ObjectId(campaignId)
      await mongoose.connection.transaction(async (session) => {
        const current = found(
          await campaigns
            .findOne({ _id: campaignObjectId, clubId: clubObjectId })
            .session(session)
            .lean(),
          'recruitment campaign not found',
        )
        if (current.state !== 'Draft') {
          throw new DomainError('only draft campaigns can be published', 'conflict')
        }
        const club = found(
          await clubs.findById(clubObjectId).session(session).lean(),
          'club not found',
        )
        if (club.state !== 'Active') {
          throw new DomainError('club is not active', 'conflict')
        }
        const changed = await campaigns.updateOne(
          { _id: campaignObjectId, clubId: clubObjectId, state: 'Draft' },
          {
            $set: {
              state: 'Published',
              publishedBy: new Types.ObjectId(actorId),
              publishedAt: now,
            },
          },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          throw new DomainError('campaign changed while publishing', 'conflict')
        }
        await writeAudit(session, {
          entityType: 'RecruitmentCampaign',
          entityId: campaignObjectId,
          action: 'RECRUITMENT_CAMPAIGN_PUBLISHED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Member',
          before: { state: 'Draft' },
          after: { state: 'Published', publishedAt: now },
          at: now,
        })
      })
      const published = found(
        await campaigns.findById(campaignObjectId).lean(),
        'recruitment campaign not found',
      )
      return mapCampaign(published)
    },

    // Huỷ đợt tuyển
    async cancel(clubId, campaignId, actorId, now) {
      const clubObjectId = new Types.ObjectId(clubId)
      const campaignObjectId = new Types.ObjectId(campaignId)
      await mongoose.connection.transaction(async (session) => {
        const current = found(
          await campaigns
            .findOne({ _id: campaignObjectId, clubId: clubObjectId })
            .session(session)
            .lean(),
          'recruitment campaign not found',
        )
        if (['Completed', 'Cancelled'].includes(String(current.state))) {
          throw new DomainError('campaign can no longer be cancelled', 'conflict')
        }
        const appDocs = await applications
          .find({ campaignId: campaignObjectId, state: { $nin: ['Draft', 'Withdrawn'] } })
          .select('userId')
          .session(session)
          .lean()
        const recipientIds = [
          ...new Map(
            appDocs.map((application) => [String(application.userId), application.userId]),
          ).values(),
        ]
        const changed = await campaigns.updateOne(
          {
            _id: campaignObjectId,
            clubId: clubObjectId,
            state: { $nin: ['Completed', 'Cancelled'] },
          },
          { $set: { state: 'Cancelled' } },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          throw new DomainError('campaign changed while cancelling', 'conflict')
        }
        const correlationId = randomUUID()
        await writeAudit(session, {
          entityType: 'RecruitmentCampaign',
          entityId: campaignObjectId,
          action: 'RECRUITMENT_CAMPAIGN_CANCELLED',
          actorId: new Types.ObjectId(actorId),
          actorRole: 'Club Member',
          before: { state: current.state },
          after: { state: 'Cancelled', notifiedApplicants: recipientIds.length },
          correlationId,
          at: now,
        })
        await queueNotifications(session, recipientIds, {
          eventCode: 'RECRUITMENT_CAMPAIGN_CANCELLED',
          entityType: 'RecruitmentCampaign',
          entityId: campaignObjectId,
          payload: { campaignId: String(campaignObjectId), title: String(current.title) },
          now,
        })
      })
      const cancelled = found(
        await campaigns.findById(campaignObjectId).lean(),
        'recruitment campaign not found',
      )
      return mapCampaign(cancelled)
    },
  }
}
