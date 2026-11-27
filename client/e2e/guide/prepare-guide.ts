// Adds what the user-guide screenshots need on top of the e2e seed (setup/prepare-db.ts), so each
// guide screen shows a record in the state its chapter describes. Runs under tsx from
// guide/global-setup.ts, only against the guide database. Writes go through the app's own usecases
// and repositories, except where the server seeds themselves write directly (the approved event and
// budget of the sponsored-payment demo, as seed-sponsored-payments.ts does) and the relabelling of
// e2e test records into sample Vietnamese text.
import './defaults'

import { createHash, randomUUID } from 'node:crypto'

import mongoose, { Types } from 'mongoose'

import type { ApplicationFileStorage } from '../../../server/src/domain/club-application.js'
import type { FounderRole } from '../../../server/src/domain/club-application.js'
import {
  initialPaymentChannel,
  initialSponsoredItemStatus,
  type FundingDecision,
  type SponsoredItemAction,
} from '../../../server/src/domain/sponsored-item.js'
import { mongoAccessRepository } from '../../../server/src/infra/db/mongo-access-repository.js'
import { mongoAuthRepository } from '../../../server/src/infra/db/mongo-auth-repository.js'
import { mongoClubApplicationRepository } from '../../../server/src/infra/db/mongo-club-application-repository.js'
import { mongoClubFieldRepository } from '../../../server/src/infra/db/mongo-club-field-repository.js'
import { mongoComplaintRepository } from '../../../server/src/infra/db/mongo-complaint-repository.js'
import { mongoFacilityBookingRepository } from '../../../server/src/infra/db/mongo-facility-booking-repository.js'
import { mongoPolicyRepository } from '../../../server/src/infra/db/mongo-policy-repository.js'
import { mongoPostEventReportRepository } from '../../../server/src/infra/db/mongo-post-event-report-repository.js'
import { mongoPropertyRepository } from '../../../server/src/infra/db/mongo-property-repository.js'
import { mongoSponsoredItemRepository } from '../../../server/src/infra/db/mongo-sponsored-item-repository.js'
import { charterPdf, logoPng } from '../../../server/src/infra/db/seed-files.js'
import { seedWave4 } from '../../../server/src/infra/db/seed-wave4.js'
import { ucmsModels as m } from '../../../server/src/infra/db/ucms-models.js'
import {
  createApplicationDraft,
  submitApplication,
  uploadApplicationDocument,
} from '../../../server/src/usecase/club-application.js'
import { decideComplaint } from '../../../server/src/usecase/complaint.js'
import { saveBooking, submitBooking } from '../../../server/src/usecase/facility-booking.js'
import { assertE2eDatabase, hebeClubId, mongoUri, officerEmail } from '../setup/env.js'

/** Sample name shown for the officer account (also the HEBE leader) in the guide. */
export const guideOfficerName = 'Lê Thu Hằng'

const now = new Date()
const hebe = new Types.ObjectId(hebeClubId)

function actor(id: unknown) {
  return { id: String(id), accountState: 'Active' as const }
}

async function userId(email: string): Promise<Types.ObjectId> {
  const user = await mongoose.connection.collection('users').findOne({ email })
  if (!user) {
    throw new Error(`guide: no seeded user ${email}`)
  }
  return user._id as Types.ObjectId
}

// Keeps uploaded founding files in memory: the guide stack has no Cloudinary. The logo is served
// as a data URL so the review page can still show it.
function memoryStorage(): ApplicationFileStorage {
  return {
    async upload(input) {
      const assetId = `guide/${randomUUID()}`
      return {
        id: randomUUID(),
        documentType: input.documentType,
        fileName: input.fileName,
        mimeType: input.mimeType,
        bytes: input.bytes.length,
        assetId,
        ...(input.visibility === 'public'
          ? { publicUrl: `data:${input.mimeType};base64,${input.bytes.toString('base64')}` }
          : {}),
        uploadedAt: input.now,
      }
    },
    async accessUrl() {
      return 'about:blank'
    },
    async remove() {},
  }
}

// The e2e seed labels its extra records in English; the guide shows Vietnamese sample text.
async function relabel(officer: Types.ObjectId): Promise<void> {
  await m.users!.updateOne({ _id: officer }, { $set: { displayName: guideOfficerName } })
  const titles = [
    'Chậm cập nhật danh sách thành viên',
    'Thiếu biên bản họp ban chủ nhiệm',
    'Đăng thông tin sự kiện chưa được duyệt',
    'Sử dụng phòng sai khung giờ được phân',
    'Chưa nộp minh chứng hoạt động tháng',
  ]
  const cases = await m
    .violations!.find({ title: /^E2E compliance case/ })
    .sort({ _id: 1 })
    .lean()
  for (const [index, item] of cases.entries()) {
    await m.violations!.updateOne(
      { _id: item._id },
      { $set: { title: titles[index % titles.length] } },
    )
  }
  await m.suspensionRequests!.updateMany(
    { reason: /^E2E suspension request/ },
    {
      $set: {
        reason: 'Ban chủ nhiệm thi cuối kỳ trong tháng này nên tạm dừng hoạt động.',
        obligationsPlan: 'Nộp đủ các báo cáo còn hạn trước khi tạm ngừng.',
        recoveryPlan: 'Hoạt động lại cùng đợt tuyển thành viên kế tiếp.',
      },
    },
  )
}

// Two founding applications waiting in the ICPDP queue (seed:demo skips them without Cloudinary).
async function foundingApplications(): Promise<void> {
  const applications = mongoClubApplicationRepository()
  const fields = mongoClubFieldRepository()
  const policy = mongoPolicyRepository()
  const storage = memoryStorage()
  // Seeded demo students (seed:demo), three founders per application.
  const names = [
    'Phan Bảo Ngọc',
    'Vũ Thành Phát',
    'Trịnh Hải Quân',
    'Lý Minh Tâm',
    'Đinh Thảo Vy',
    'Mai Anh Tuấn',
  ]
  const people: Types.ObjectId[] = []
  for (const displayName of names) {
    const user = await m.users!.findOne({ displayName }).lean()
    if (user) {
      people.push(user._id as Types.ObjectId)
    }
  }
  const active = await fields.listActive()
  const plans = [
    {
      clubName: 'CLB Nhiếp ảnh Đường phố FPTU',
      field: 'Nghệ thuật',
      summary: 'Cộng đồng yêu nhiếp ảnh đường phố của FPTU.',
      objectives: 'Lan toả nhiếp ảnh đường phố, tổ chức photowalk hằng tháng và triển lãm cuối kỳ.',
      color: [234, 88, 12] as [number, number, number],
    },
    {
      clubName: 'CLB Cờ vây FPTU',
      field: 'Kỹ năng',
      summary: 'Nơi rèn tư duy chiến lược qua từng ván cờ vây.',
      objectives: 'Rèn tư duy chiến lược qua cờ vây, tổ chức giải đấu nội bộ mỗi học kỳ.',
      color: [30, 41, 59] as [number, number, number],
    },
  ]
  for (const [index, plan] of plans.entries()) {
    const team = people.slice(index * 3, index * 3 + 3)
    const field = active.find((item) => item.name === plan.field) ?? active[0]
    if (team.length < 3 || !field) {
      console.warn(`[guide] skipped founding application "${plan.clubName}"`)
      continue
    }
    const roleOf: FounderRole[] = ['LEADER', 'VICE_LEADER', 'MEMBER']
    const founder = actor(team[0])
    const draft = await createApplicationDraft(
      applications,
      fields,
      founder,
      {
        clubName: plan.clubName,
        fieldId: field.id,
        summary: plan.summary,
        objectives: plan.objectives,
        fanpageUrl: '',
        contactEmail: '',
        founders: team.map((id, at) => ({ userId: String(id), role: roleOf[at]! })),
      },
      now,
    )
    await uploadApplicationDocument(
      applications,
      storage,
      founder,
      draft.id,
      'PROPOSAL',
      'de-an-thanh-lap.pdf',
      'application/pdf',
      charterPdf(plan.clubName),
      now,
    )
    await uploadApplicationDocument(
      applications,
      storage,
      founder,
      draft.id,
      'LOGO',
      'logo.png',
      'image/png',
      logoPng(plan.color),
      now,
    )
    await submitApplication(applications, policy, fields, founder, draft.id, now)
  }
}

// Post-event reports in the states chapters 13 and 14 show (the "Wave 4 demo" events of seed-wave4).
async function postEventReports(officer: Types.ObjectId): Promise<void> {
  await seedWave4(officer, hebe, now)
  const reports = mongoPostEventReportRepository()
  const club = hebeClubId
  const by = String(officer)
  async function eventId(suffix: string): Promise<string> {
    const found = await m.events!.findOne({ clubId: hebe, title: `Wave 4 demo: ${suffix}` }).lean()
    if (!found) {
      throw new Error(
        `guide: Wave 4 demo event ${suffix} was not seeded (POST_EVENT policy missing?)`,
      )
    }
    return String(found._id)
  }
  async function submit(id: string) {
    const current = (await reports.find(id, club, now))!
    await reports.act(id, club, by, { kind: 'submit', revision: current.obligation.revision }, now)
  }
  // "balanced": sent back for corrections; "refund": waiting for ICPDP; "top-up" stays a draft.
  const balanced = await eventId('balanced')
  await submit(balanced)
  let review = (await reports.find(balanced, undefined, now))!
  await reports.act(
    balanced,
    undefined,
    by,
    { kind: 'claim', revision: review.obligation.revision },
    now,
  )
  review = (await reports.find(balanced, undefined, now))!
  await reports.act(
    balanced,
    undefined,
    by,
    {
      kind: 'decision',
      revision: review.obligation.revision,
      outcome: 'return',
      reason: 'Bổ sung ảnh minh chứng buổi workshop và số người tham dự thực tế.',
    },
    now,
  )
  await submit(await eventId('refund'))
}

/** Title of the HEBE event whose budget has sponsored items in every state (chapter 16). */
export const sponsoredEventTitle = 'Đêm nhạc gây quỹ HEBE'

// Mirrors server seed-sponsored-payments.ts (which needs Cloudinary): one ended HEBE event whose
// budget items sit in every UC35–UC37 state, written through the sponsored item repository.
async function sponsoredPayments(officer: Types.ObjectId): Promise<void> {
  const day = 86_400_000
  const approvedAt = new Date(now.getTime() - 10 * day)
  const endAt = new Date(now.getTime() - day)
  type Target = 'Draft' | 'Submitted' | 'Reviewed' | 'Paid'
  const lines: {
    category: string
    decision: FundingDecision
    cap: number
    spent: number
    target: Target
  }[] = [
    {
      category: 'Thuê địa điểm',
      decision: 'BEFORE_EVENT',
      cap: 5_000_000,
      spent: 5_000_000,
      target: 'Reviewed',
    },
    {
      category: 'In ấn banner, standee',
      decision: 'BEFORE_EVENT',
      cap: 2_000_000,
      spent: 2_400_000,
      target: 'Submitted',
    },
    {
      category: 'Thuê trang phục biểu diễn',
      decision: 'BEFORE_EVENT',
      cap: 3_000_000,
      spent: 2_200_000,
      target: 'Reviewed',
    },
    {
      category: 'Âm thanh, ánh sáng (hợp đồng ≥ 5 triệu)',
      decision: 'AFTER_EVENT',
      cap: 6_000_000,
      spent: 5_800_000,
      target: 'Reviewed',
    },
    {
      category: 'Quà tặng khách mời',
      decision: 'AFTER_EVENT',
      cap: 1_500_000,
      spent: 1_400_000,
      target: 'Paid',
    },
    { category: 'Tiệc liên hoan', decision: 'NOT_SPONSORED', cap: 0, spent: 0, target: 'Draft' },
  ]
  const club = await m.clubs!.findById(hebe).lean()
  const event = await m.events!.create({
    organizerType: 'CLUB',
    clubId: hebe,
    clubName: club?.name,
    title: sponsoredEventTitle,
    state: 'Completed',
    audienceScope: 'PUBLIC',
    capacity: 200,
    venueText: 'Hội trường tòa Alpha',
    startAt: new Date(endAt.getTime() - 3 * 3_600_000),
    endAt,
    currentRevisionNo: 1,
    attendanceFinalized: true,
    semesterCode: 'Fall 2026',
    createdAt: approvedAt,
  })
  const requested = lines.map((line) => line.cap || 1_000_000)
  await m.eventProposalVersions!.create({
    eventId: event._id,
    revisionNo: 1,
    payload: {
      title: sponsoredEventTitle,
      objective: 'Gây quỹ hoạt động và giao lưu âm nhạc',
      plan: 'Biểu diễn, giao lưu, gây quỹ',
    },
    budgetLines: lines.map((line, index) => ({
      category: line.category,
      amount: requested[index],
    })),
    submittedBy: officer,
    submittedAt: approvedAt,
  })
  function decimal(value: number) {
    return Types.Decimal128.fromString(String(value))
  }
  const budget = await m.eventBudgets!.create({
    eventId: event._id,
    clubId: hebe,
    lines: lines.map((line, index) => ({
      category: line.category,
      requestedAmount: requested[index],
      approvedAmount: line.cap,
      fundingDecision: line.decision,
      ...(line.cap ? {} : { reason: 'Không thuộc danh mục được tài trợ' }),
    })),
    sponsoredItems: lines.map((line, index) => {
      const paymentChannel = initialPaymentChannel(line.decision, line.cap)
      return {
        id: randomUUID(),
        category: line.category,
        requestedAmount: requested[index],
        approvedAmount: line.cap,
        fundingDecision: line.decision,
        ...(paymentChannel ? { paymentChannel } : {}),
        ...(line.cap ? {} : { reason: 'Không thuộc danh mục được tài trợ' }),
        approvedAt: approvedAt.toISOString(),
        eventEndAt: endAt.toISOString(),
        status: initialSponsoredItemStatus(line.decision),
        amount: 0,
        description: '',
        images: [],
      }
    }),
    requestedTotal: decimal(requested.reduce((sum, value) => sum + value, 0)),
    approvedTotal: decimal(lines.reduce((sum, line) => sum + line.cap, 0)),
    approvedByDecisionId: new Types.ObjectId(),
    disbursedTotal: decimal(0),
    refundedTotal: decimal(0),
    isSettlementLate: false,
    state: 'Approved',
    periodCode: 'Fall 2026',
    createdAt: approvedAt,
  })
  const repo = mongoSponsoredItemRepository()
  const id = String(budget._id)
  let detail = (await repo.find(id))!
  async function act(itemId: string, byClub: boolean, action: SponsoredItemAction) {
    detail = await repo.act(
      id,
      itemId,
      detail.revision,
      String(officer),
      byClub ? hebeClubId : undefined,
      action,
      now,
    )
  }
  for (const [index, line] of lines.entries()) {
    if (line.target === 'Draft') {
      continue
    }
    const itemId = detail.items[index]!.id
    if (line.decision === 'BEFORE_EVENT') {
      await act(itemId, false, { kind: 'recordAdvance' })
      await act(itemId, true, { kind: 'confirmAdvanceReceived' })
    }
    const isDirectVendor = line.decision === 'AFTER_EVENT' && line.cap >= 5_000_000
    await act(itemId, true, {
      kind: 'save',
      amount: line.spent,
      description: `Hóa đơn ${line.category.toLowerCase()}`,
      ...(isDirectVendor
        ? {
            paymentChannel: 'DIRECT_VENDOR',
            vendorBankInfo: {
              vendorName: 'Công ty TNHH Âm thanh Ánh sáng Mẫu',
              accountHolder: 'CONG TY TNHH AM THANH ANH SANG MAU',
              accountNumber: '0000000000',
              bankName: 'Ngân hàng mẫu',
              transferNote: 'Thanh toan hop dong am thanh anh sang',
            },
          }
        : {}),
    })
    const bytes = logoPng([40 + index * 40, 120, 200 - index * 30], 96)
    await act(itemId, true, {
      kind: 'image',
      image: {
        id: randomUUID(),
        assetId: `guide/${randomUUID()}`,
        fileName: `hoa-don-${index + 1}.png`,
        mimeType: 'image/png',
        bytes: bytes.length,
        digest: createHash('sha256').update(bytes).digest('hex'),
        uploadedAt: now.toISOString(),
        uploadedBy: String(officer),
      },
    })
    await act(itemId, true, { kind: 'submit' })
    if (line.target === 'Submitted') {
      continue
    }
    await act(itemId, false, {
      kind: 'review',
      validAmount: line.spent,
      reason: 'Chứng từ hợp lệ, khớp hạng mục đã duyệt.',
    })
    if (line.target === 'Paid') {
      await act(itemId, true, { kind: 'pay' })
    }
  }
}

// One facility request waiting for ICPDP (chapter 12.4).
async function facilityRequest(officer: Types.ObjectId): Promise<void> {
  const hall = await m.properties!.findOne({ type: 'HALL', isActive: true }).lean()
  if (!hall) {
    console.warn('[guide] skipped the facility request: no active hall')
    return
  }
  const deps = {
    repo: mongoFacilityBookingRepository(),
    access: mongoAccessRepository(),
    auth: mongoAuthRepository('*'),
    properties: mongoPropertyRepository(),
    policy: mongoPolicyRepository(),
  }
  // Ten days ahead, campus slot 2 (10:00–12:20 Vietnam time).
  const day = new Date(now.getTime() + 10 * 86_400_000)
  const startAt = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 3, 0),
  )
  const endAt = new Date(startAt.getTime() + 140 * 60_000)
  const booking = await saveBooking(
    deps,
    actor(officer),
    hebeClubId,
    null,
    {
      propertyId: String(hall._id),
      purpose: 'Tổng duyệt chương trình Đêm nhạc HEBE Unplugged',
      startAt,
      endAt,
      headcount: 120,
      equipment: ((hall.equipment ?? []) as string[]).slice(0, 2),
    },
    now,
  )
  await submitBooking(
    deps,
    actor(officer),
    hebeClubId,
    booking.booking.id,
    booking.booking.currentVersionNo,
    now,
  )
}

// One HEBE complaint forwarded to the club, so its complaint inbox has something to answer (chapter 19).
async function forwardedComplaint(officer: Types.ObjectId): Promise<void> {
  const complaint = await m
    .complaints!.findOne({
      clubId: hebe,
      description: /^Đêm nhạc chào tân sinh viên kết thúc muộn/,
    })
    .lean()
  if (!complaint) {
    console.warn('[guide] skipped the forwarded complaint: no seeded HEBE complaint')
    return
  }
  const repo = mongoComplaintRepository()
  const auth = mongoAuthRepository('*')
  const id = String(complaint._id)
  await decideComplaint(repo, auth, actor(officer), id, { kind: 'open' }, now)
  await decideComplaint(
    repo,
    auth,
    actor(officer),
    id,
    {
      kind: 'triage',
      outcome: 'Forwarded',
      severity: 'MINOR',
      validity: 'PARTLY_VALID',
      reason: 'Đề nghị CLB rà soát giờ kết thúc và thông báo sớm cho người tham dự.',
      responseDueAt: new Date(now.getTime() + 7 * 86_400_000),
    },
    now,
  )
}

assertE2eDatabase()
await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5_000 })
try {
  const officer = await userId(officerEmail)
  await relabel(officer)
  await foundingApplications()
  await postEventReports(officer)
  await sponsoredPayments(officer)
  await facilityRequest(officer)
  await forwardedComplaint(officer)
  console.log('[guide] prepared the guide records')
} finally {
  await mongoose.disconnect()
}
