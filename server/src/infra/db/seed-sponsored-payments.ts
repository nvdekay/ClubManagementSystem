// Dữ liệu demo cho flow thanh toán hạng mục tài trợ (UC36 -> UC37 -> UC35): một sự kiện HEBE mà
// ngân sách có hạng mục ở mọi trạng thái đáng trình bày. Chỉ thêm dữ liệu, chạy lại an toàn.
import mongoose, { Types } from 'mongoose'
import { randomUUID, createHash } from 'node:crypto'
import {
  initialPaymentChannel,
  initialSponsoredItemStatus,
  type FundingDecision,
  type SponsoredItemAction,
} from '../../domain/sponsored-item.js'
import { loadConfig, optionalCloudinaryConfig } from '../config/index.js'
import { cloudinaryApplicationFiles } from '../files/cloudinary-application-files.js'
import { mongoSponsoredItemRepository } from './mongo-sponsored-item-repository.js'
import { logoPng } from './seed-files.js'
import { ucmsModels as m } from './ucms-models.js'

const TITLE = 'Demo: Đêm nhạc gây quỹ HEBE (thanh toán tài trợ)'
const clubId = new Types.ObjectId('a10000000000000000000013')
const DAY = 86_400_000
const now = new Date()
const approvedAt = new Date(now.getTime() - 10 * DAY)
const endAt = new Date(now.getTime() - DAY)

type Target = 'Draft' | 'Submitted' | 'Accepted' | 'Paid' | 'Reconciled'
/** `spent` vượt mức trần cho thấy khoản phải trả bị giới hạn ở số tiền đã duyệt. */
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
    target: 'Reconciled',
  },
  {
    category: 'In ấn banner, standee',
    decision: 'BEFORE_EVENT',
    cap: 2_000_000,
    spent: 2_400_000,
    target: 'Submitted',
  },
  {
    category: 'Âm thanh, ánh sáng (hợp đồng >= 5tr)',
    decision: 'AFTER_EVENT',
    cap: 6_000_000,
    spent: 5_800_000,
    target: 'Accepted',
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
// Chuyển số thành Decimal128
function decimal(value: number) {
  return Types.Decimal128.fromString(String(value))
}

try {
  const config = loadConfig()
  const cloudinary = optionalCloudinaryConfig(config)
  if (!cloudinary) {
    throw new Error('set CLOUDINARY_* in .env: invoice images are stored as private assets')
  }
  await mongoose.connect(config.MONGO_URI)
  if (await m.events!.exists({ clubId, title: TITLE })) {
    console.log('sponsored payment demo already seeded; nothing changed')
  } else {
    const position = await m
      .clubPositions!.findOne({ clubId, isLeaderRole: true, isActive: true })
      .lean()
    const assignment =
      position &&
      (await m
        .clubPositionAssignments!.findOne({ positionId: position._id, effectiveTo: null })
        .lean())
    const membership =
      assignment && (await m.clubMemberships!.findById(assignment.membershipId).lean())
    if (!membership) {
      throw new Error('HEBE Club has no leader; run seed:demo first')
    }
    const leader = membership.userId as Types.ObjectId
    const role = await m.roles!.findOne({ code: 'ICPDP_OFFICER', scope: 'system' }).lean()
    const officer =
      role &&
      ((await m.userRoleAssignments!.findOne({ roleId: role._id, revokedAt: null }).lean())
        ?.userId as Types.ObjectId | undefined)
    if (!officer) {
      throw new Error('no ICPDP officer account; run seed:demo first')
    }

    const club = await m.clubs!.findById(clubId).lean()
    const event = await m.events!.create({
      organizerType: 'CLUB',
      clubId,
      clubName: club?.name,
      title: TITLE,
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
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      payload: {
        title: TITLE,
        objective: 'Gây quỹ hoạt động và giao lưu âm nhạc',
        plan: 'Biểu diễn, giao lưu, gây quỹ',
      },
      budgetLines: lines.map((line) => ({
        category: line.category,
        amount: line.cap || 1_000_000,
      })),
      submittedBy: leader,
      submittedAt: approvedAt,
    })
    const requested = lines.map((line) => line.cap || 1_000_000)
    const budget = await m.eventBudgets!.create({
      eventId: event._id,
      clubId,
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

    // Đưa mọi hạng mục qua repository thật để có expense, audit log và thông báo.
    const repo = mongoSponsoredItemRepository()
    const files = cloudinaryApplicationFiles(cloudinary)
    const id = String(budget._id)
    let detail = (await repo.find(id))!
    async function act(itemId: string, byClub: boolean, action: SponsoredItemAction) {
      detail = await repo.act(
        id,
        itemId,
        detail.revision,
        String(byClub ? leader : officer),
        byClub ? String(clubId) : undefined,
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
        description: `Hóa đơn ${line.category.toLowerCase()} (demo)`,
        ...(isDirectVendor
          ? {
              paymentChannel: 'DIRECT_VENDOR',
              vendorBankInfo: {
                vendorName: 'Công ty TNHH Âm thanh Ánh sáng Việt',
                accountHolder: 'CONG TY TNHH AM THANH ANH SANG VIET',
                accountNumber: '19036888999001',
                bankName: 'Techcombank',
                bankBranch: 'Chi nhánh Hà Nội',
                transferNote: 'Thanh toan HD am thanh anh sang Dem nhac HEBE',
              },
            }
          : {}),
      })
      const bytes = logoPng([40 + index * 60, 120, 200 - index * 50], 96)
      const file = await files.upload({
        ownerId: String(leader),
        applicationId: id,
        documentType: 'INVOICE',
        fileName: `hoa-don-${index + 1}.png`,
        mimeType: 'image/png',
        bytes,
        visibility: 'private',
        now,
      })
      await act(itemId, true, {
        kind: 'image',
        image: {
          id: randomUUID(),
          assetId: file.assetId,
          fileName: file.fileName,
          mimeType: 'image/png',
          bytes: bytes.length,
          digest: createHash('sha256').update(bytes).digest('hex'),
          uploadedAt: now.toISOString(),
          uploadedBy: String(leader),
        },
      })
      await act(itemId, true, { kind: 'submit' })
      if (line.target === 'Submitted') {
        continue
      }
      await act(itemId, false, {
        kind: 'review',
        validAmount: line.spent,
        reason: 'Chứng từ hợp lệ, khớp hạng mục đã duyệt (demo).',
      })
      if (line.target === 'Paid') {
        if (isDirectVendor) {
          await act(itemId, false, { kind: 'confirmVendorPaid' })
        } else {
          await act(itemId, true, { kind: 'pay' })
        }
      }
    }
    console.log(
      JSON.stringify(
        {
          event: String(event._id),
          budget: id,
          items: detail.items.map((item) => `${item.category}: ${item.status}`),
        },
        null,
        2,
      ),
    )
  }
} catch (error) {
  console.error(
    'sponsored payment seed failed:',
    error instanceof Error ? error.message : String(error),
  )
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
