import { Types } from 'mongoose'
import {
  BUDGET_FILTERS,
  type BudgetDetail,
  type BudgetDisbursementRepository,
  type BudgetFilter,
  type BudgetFlow,
  type BudgetFlowKind,
  type BudgetItemCounts,
  type BudgetSummary,
} from '../../domain/budget-disbursement.js'
import { pageSkip } from '../../domain/paging.js'
import {
  DIRECT_VENDOR_THRESHOLD_VND,
  resolvePaymentChannel,
  type SponsoredItem,
} from '../../domain/sponsored-item.js'
import { ucmsModels } from './ucms-models.js'
import { finiteMoney, optionalText } from './repo-helpers.js'

type Doc = Record<string, unknown>

// Chuyển giá trị tiền sang number hoặc undefined nếu trống
function optionalMoney(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : finiteMoney(value)
}

// Đếm số lượng hạng mục cần xử lý theo trạng thái cho ngân sách tài trợ mới
function summarizeItems(raw: unknown): BudgetItemCounts | undefined {
  if (!Array.isArray(raw)) {
    return undefined
  }
  const items = raw as SponsoredItem[]
  const counts: BudgetItemCounts = {
    total: 0,
    awaitingAdvance: 0,
    awaitingReview: 0,
    awaitingVendorPay: 0,
    awaitingClubConfirm: 0,
    awaitingRefundConfirm: 0,
    awaitingClubRefund: 0,
  }
  for (const item of items) {
    if (item.fundingDecision === 'NOT_SPONSORED') {
      continue
    }
    counts.total += 1
    const channel = resolvePaymentChannel(item)
    if (item.status === 'AwaitingAdvance') {
      counts.awaitingAdvance += 1
    } else if (item.status === 'Submitted') {
      counts.awaitingReview += 1
    } else if (item.status === 'Accepted' && channel === 'DIRECT_VENDOR') {
      counts.awaitingVendorPay += 1
    } else if (
      item.status === 'AdvanceSent' ||
      (item.status === 'Accepted' && channel === 'VIA_OFFICER_REIMBURSE')
    ) {
      counts.awaitingClubConfirm += 1
    } else if (item.status === 'RefundSubmitted') {
      counts.awaitingRefundConfirm += 1
    } else if (item.status === 'RefundPending') {
      counts.awaitingClubRefund += 1
    }
  }
  return counts
}

// Ánh xạ ngân sách sự kiện thành BudgetSummary
function summaryFrom(
  doc: Doc,
  event: Doc | undefined,
  clubName: string | undefined,
): BudgetSummary {
  const itemCounts = summarizeItems(doc.sponsoredItems)
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    eventTitle: String(event?.title ?? ''),
    eventState: String(event?.state ?? ''),
    eventStartAt: event?.startAt as Date,
    eventEndAt: event?.endAt as Date,
    clubId: String(doc.clubId),
    clubName: clubName ?? String(event?.clubName ?? ''),
    state: String(doc.state),
    ...(optionalText(doc.periodCode) ? { periodCode: String(doc.periodCode) } : {}),
    requestedTotal: finiteMoney(doc.requestedTotal),
    approvedTotal: finiteMoney(doc.approvedTotal),
    disbursedTotal: finiteMoney(doc.disbursedTotal),
    refundedTotal: finiteMoney(doc.refundedTotal),
    ...(doc.settlementDueAt instanceof Date ? { settlementDueAt: doc.settlementDueAt } : {}),
    ...(optionalMoney(doc.settlementBalance) !== undefined
      ? { settlementBalance: finiteMoney(doc.settlementBalance) }
      : {}),
    ...(optionalMoney(doc.recoveryAmount) !== undefined
      ? { recoveryAmount: finiteMoney(doc.recoveryAmount) }
      : {}),
    ...(doc.recoveryDueAt instanceof Date ? { recoveryDueAt: doc.recoveryDueAt } : {}),
    ...(itemCounts ? { itemCounts } : {}),
    createdAt: doc.createdAt as Date,
  }
}

const finishedStates = ['Closed', 'Cancelled']

/**
 * Mongo filter of one queue tab. The sponsored-item tabs mirror `summarizeItems`: a budget is in
 * the tab when at least one sponsored item is waiting on the officer in that step.
 */
function budgetFilterQuery(filter: BudgetFilter): Doc {
  switch (filter) {
    case 'awaitingAdvance':
      return {
        sponsoredItems: {
          $elemMatch: { fundingDecision: { $ne: 'NOT_SPONSORED' }, status: 'AwaitingAdvance' },
        },
      }
    case 'awaitingReview':
      return {
        sponsoredItems: {
          $elemMatch: { fundingDecision: { $ne: 'NOT_SPONSORED' }, status: 'Submitted' },
        },
      }
    case 'awaitingVendorPay':
      // resolvePaymentChannel: DIRECT_VENDOR unless advanced before the event or not sponsored.
      return {
        sponsoredItems: {
          $elemMatch: {
            fundingDecision: { $nin: ['NOT_SPONSORED', 'BEFORE_EVENT'] },
            status: 'Accepted',
            $or: [
              { approvedAmount: { $gte: DIRECT_VENDOR_THRESHOLD_VND } },
              { paymentChannel: 'DIRECT_VENDOR' },
            ],
          },
        },
      }
    case 'awaitingRefundConfirm':
      return {
        sponsoredItems: {
          $elemMatch: { fundingDecision: { $ne: 'NOT_SPONSORED' }, status: 'RefundSubmitted' },
        },
      }
    case 'inProgress':
      return { state: { $nin: finishedStates } }
    case 'closed':
      return { state: { $in: finishedStates } }
    default:
      return {}
  }
}

// Repository giải ngân ngân sách sự kiện do ICPDP ghi nhận
export function mongoBudgetDisbursementRepository(): BudgetDisbursementRepository {
  const m = ucmsModels
  const budgets = m.eventBudgets!
  const flows = m.budgetDisbursements!

  async function summaries(docs: Doc[]): Promise<BudgetSummary[]> {
    const [eventDocs, clubDocs] = await Promise.all([
      m
        .events!.find({ _id: { $in: docs.map((doc) => doc.eventId) } })
        .select({ title: 1, state: 1, startAt: 1, endAt: 1, clubName: 1 })
        .lean(),
      m
        .clubs!.find({ _id: { $in: docs.map((doc) => doc.clubId) } })
        .select({ name: 1 })
        .lean(),
    ])
    const eventById = new Map(eventDocs.map((event) => [String(event._id), event as Doc]))
    const clubById = new Map(clubDocs.map((club) => [String(club._id), String(club.name)]))
    return docs.map((doc) =>
      summaryFrom(doc, eventById.get(String(doc.eventId)), clubById.get(String(doc.clubId))),
    )
  }

  async function detail(id: Types.ObjectId): Promise<BudgetDetail | null> {
    const doc = await budgets.findById(id).lean()
    if (!doc) {
      return null
    }
    const [summary] = await summaries([doc])
    const flowDocs = await flows.find({ eventBudgetId: id }).sort({ disbursedAt: 1, _id: 1 }).lean()
    const users = await m
      .users!.find({ _id: { $in: flowDocs.map((flow) => flow.recordedBy) } })
      .select({ displayName: 1, email: 1 })
      .lean()
    const nameById = new Map(
      users.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]),
    )
    const mapped: BudgetFlow[] = flowDocs.map((flow) => ({
      id: String(flow._id),
      kind: flow.kind as BudgetFlowKind,
      amount: finiteMoney(flow.amount),
      disbursedAt: flow.disbursedAt as Date,
      ...(optionalText(flow.paymentReference)
        ? { paymentReference: String(flow.paymentReference) }
        : {}),
      ...(optionalText(flow.note) ? { note: String(flow.note) } : {}),
      recordedBy: String(flow.recordedBy),
      recordedByName: nameById.get(String(flow.recordedBy)),
    }))
    const lines = Array.isArray(doc.lines)
      ? doc.lines.map((line: Doc) => ({
          category: String(line.category ?? ''),
          requestedAmount: finiteMoney(line.requestedAmount),
          approvedAmount: finiteMoney(line.approvedAmount),
          ...(optionalText(line.reason) ? { reason: String(line.reason) } : {}),
        }))
      : []
    return { ...summary!, lines, flows: mapped }
  }

  return {
    // Một trang ngân sách sự kiện theo bộ lọc và CLB, mới nhất trước, kèm số lượng từng bộ lọc
    async list(query) {
      const scope = query.clubId ? { clubId: new Types.ObjectId(query.clubId) } : {}
      const [docs, [facets], clubIds] = await Promise.all([
        budgets
          .find({ ...scope, ...budgetFilterQuery(query.filter) })
          .sort({ createdAt: -1, _id: -1 })
          .skip(pageSkip(query))
          .limit(query.pageSize)
          .lean(),
        // One aggregation counts every tab within the club scope.
        budgets.aggregate<Record<BudgetFilter, { n: number }[]>>([
          { $match: scope },
          {
            $facet: Object.fromEntries(
              BUDGET_FILTERS.map((filter) => [
                filter,
                [{ $match: budgetFilterQuery(filter) }, { $count: 'n' }],
              ]),
            ),
          },
        ]),
        budgets.distinct('clubId'),
      ])
      const counts = Object.fromEntries(
        BUDGET_FILTERS.map((filter) => [filter, facets?.[filter]?.[0]?.n ?? 0]),
      ) as Record<BudgetFilter, number>
      const clubDocs = await m
        .clubs!.find({ _id: { $in: clubIds } })
        .collation({ locale: 'vi' })
        .sort({ name: 1, _id: 1 })
        .select({ name: 1 })
        .lean()
      return {
        items: await summaries(docs),
        total: counts[query.filter],
        page: query.page,
        pageSize: query.pageSize,
        counts,
        clubs: clubDocs.map((club) => ({ id: String(club._id), name: String(club.name) })),
      }
    },

    // Tìm chi tiết ngân sách theo id
    async find(id) {
      return detail(new Types.ObjectId(id))
    },
  }
}
