import { Router, raw } from 'express'
import { z } from 'zod'
import { DomainError } from '../../domain/errors.js'
import {
  actOnSponsoredItem,
  getRefundAccount,
  getSponsoredBudget,
  invoiceImageUrl,
  uploadInvoiceImage,
  type SponsoredItemDeps,
} from '../../usecase/sponsored-item.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

const vendorBankInfoBody = z
  .object({
    vendorName: z.string().min(1).max(200),
    accountHolder: z.string().min(1).max(200),
    accountNumber: z.string().min(1).max(50),
    bankName: z.string().min(1).max(200),
    bankBranch: z.string().max(200).optional(),
    transferNote: z.string().max(500).optional(),
  })
  .strict()

export const sponsoredActionBody = z
  .object({
    revision: z.number().int().nonnegative(),
    action: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('save'),
          amount: z.number().int().positive(),
          description: z.string().max(2000),
          paymentChannel: z.enum(['VIA_OFFICER_REIMBURSE', 'DIRECT_VENDOR']).optional(),
          vendorBankInfo: vendorBankInfoBody.optional(),
        })
        .strict(),
      z.object({ kind: z.literal('removeImage'), imageId: z.string().uuid() }).strict(),
      z.object({ kind: z.literal('submit') }).strict(),
      z.object({ kind: z.literal('return'), reason: z.string().min(1).max(2000) }).strict(),
      z
        .object({
          kind: z.literal('review'),
          validAmount: z.number().int().nonnegative(),
          reason: z.string().min(1).max(2000),
        })
        .strict(),
      z.object({ kind: z.literal('recordAdvance') }).strict(),
      z.object({ kind: z.literal('confirmAdvanceReceived') }).strict(),
      z.object({ kind: z.literal('pay') }).strict(),
      z.object({ kind: z.literal('confirmVendorPaid') }).strict(),
      z.object({ kind: z.literal('removeRefundImage'), imageId: z.string().uuid() }).strict(),
      z.object({ kind: z.literal('submitRefund'), note: z.string().max(2000).optional() }).strict(),
      z.object({ kind: z.literal('returnRefund'), reason: z.string().min(1).max(2000) }).strict(),
      z
        .object({ kind: z.literal('confirmRefund'), reason: z.string().max(2000).optional() })
        .strict(),
    ]),
  })
  .strict()

// Mount các route hạng mục tài trợ và hoá đơn thuộc ngân sách
export function sponsoredItemRoutes(deps: SponsoredItemDeps & SessionDeps) {
  const router = Router()
  const { read, write } = guards(deps)
  for (const base of ['/clubs/:clubId/budgets/:id/items', '/admin/budgets/:id/items']) {
    // Xem ngân sách cùng các hạng mục tài trợ
    router.get(base, read, async (req, res) => {
      ok(
        res,
        await getSponsoredBudget(
          deps,
          actor(res),
          String(req.params.id),
          req.params.clubId as string | undefined,
          new Date(),
        ),
      )
    })
    // Thực hiện hành động trên hạng mục tài trợ
    router.post(`${base}/:itemId/actions`, write, async (req, res) => {
      const body = parse(sponsoredActionBody, req.body, 'sponsored item action')
      ok(
        res,
        await actOnSponsoredItem(
          deps,
          actor(res),
          String(req.params.id),
          req.params.clubId as string | undefined,
          String(req.params.itemId),
          body.revision,
          body.action,
          new Date(),
        ),
      )
    })
    // Lấy URL xem hoặc tải xuống tệp chứng từ của hạng mục tài trợ
    router.get(`${base}/:itemId/images/:imageId`, read, async (req, res) => {
      const download = req.query.download === '1' || req.query.download === 'true'
      ok(
        res,
        await invoiceImageUrl(
          deps,
          actor(res),
          String(req.params.id),
          req.params.clubId as string | undefined,
          String(req.params.itemId),
          String(req.params.imageId),
          new Date(),
          !download,
        ),
      )
    })
  }
  // Lấy thông tin tài khoản hoàn trả của nhà trường (chỉ cấp khi CLB có hạng mục đang chờ hoàn trả)
  router.get('/clubs/:clubId/budgets/:id/items/:itemId/refund-account', read, async (req, res) => {
    ok(
      res,
      await getRefundAccount(
        deps,
        actor(res),
        String(req.params.id),
        String(req.params.clubId),
        String(req.params.itemId),
        new Date(),
      ),
    )
  })
  // Tải ảnh/PDF chứng từ hóa đơn hoặc biên lai hoàn trả lên hạng mục tài trợ (ảnh JPG/PNG <= 5 MiB, PDF <= 10 MiB)
  router.post(
    '/clubs/:clubId/budgets/:id/items/:itemId/images',
    write,
    raw({ type: () => true, limit: '10mb' }),
    async (req, res) => {
      const revision = Number(req.query.revision)
      const rawTarget = req.query.target === undefined ? 'invoice' : String(req.query.target)
      if (rawTarget !== 'invoice' && rawTarget !== 'refund') {
        throw new DomainError('invalid upload target', 'validation')
      }
      if (!Number.isInteger(revision) || revision < 0 || !Buffer.isBuffer(req.body)) {
        throw new DomainError('invalid image upload', 'validation')
      }
      ok(
        res,
        await uploadInvoiceImage(
          deps,
          actor(res),
          String(req.params.id),
          String(req.params.clubId),
          String(req.params.itemId),
          revision,
          {
            fileName: String(req.query.fileName ?? ''),
            mimeType: req.header('content-type') ?? '',
            bytes: req.body,
          },
          new Date(),
          rawTarget,
        ),
      )
    },
  )
  return router
}
