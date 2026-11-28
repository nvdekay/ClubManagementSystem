import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { ClubInvitationRepository } from '../../domain/club-invitation.js'
import { listClubInvitations, respondToClubInvitation } from '../../usecase/club-invitation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { objectId, parse as parseInput, actor } from './request.js'

export const invitationResponseBody = z
  .object({
    outcome: z.enum(['Accepted', 'Declined']),
    responseNote: z.string().max(5_000).optional(),
    responseDetails: z
      .record(z.string().min(1).max(100), z.union([z.string().max(2_000), z.number().finite()]))
      .optional(),
  })
  .strict()
const path = z.object({
  clubId: objectId,
  id: objectId.optional(),
})
// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseInput(schema, value, 'invitation request')
}
// Mount các route lời mời tham gia sự kiện của CLB
export function clubInvitationRoutes(
  deps: SessionDeps & {
    repo: ClubInvitationRepository
    access: ClubAccessRepository
  },
): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Liệt kê lời mời mà CLB nhận được
  router.get('/clubs/:clubId/invitations', read, async (req, res) => {
    const { clubId } = parse(path, req.params)
    ok(res, await listClubInvitations(deps.repo, deps.access, actor(res), clubId, new Date()))
  })
  // CLB phản hồi (nhận hoặc từ chối) một lời mời
  router.post('/clubs/:clubId/invitations/:id/response', write, async (req, res) => {
    const { clubId, id } = parse(path, req.params)
    ok(
      res,
      await respondToClubInvitation(
        deps.repo,
        deps.access,
        actor(res),
        clubId,
        id!,
        parse(invitationResponseBody, req.body),
        new Date(),
      ),
    )
  })
  return router
}
