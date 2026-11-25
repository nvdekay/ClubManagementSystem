import {
  simulateRouting,
  validateRoutingRules,
  type ApprovalRoutingRepository,
  type RoutingRule,
} from '../domain/approval-routing.js'
import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import type { AccessActor } from './access.js'

const objectId = /^[0-9a-f]{24}$/i

// Kiểm actor là ICPDP officer và có role yêu cầu
async function holder(
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  role: string,
): Promise<string> {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  const roles = await auth.systemRoleCodes(actor.id)
  if (!roles.includes(role)) {
    throw new DomainError(`${role} role required`, 'forbidden')
  }
  return actor.id
}

// Kiểm id rule set có đúng định dạng ObjectId
function id(value: string): string {
  if (!objectId.test(value)) {
    throw new DomainError('invalid rule set id', 'validation')
  }
  return value
}

// UC05: liệt kê các bộ quy tắc định tuyến phê duyệt
/** UC05: mọi ICPDP officer đọc, tạo, sửa và kích hoạt các rule set. */
export async function listRoutingRuleSets(
  repo: ApprovalRoutingRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
) {
  await holder(auth, actor, 'ICPDP_OFFICER')
  return repo.list()
}

// UC05: ICPDP officer tạo bản nháp bộ quy tắc định tuyến
export async function createRoutingDraft(
  repo: ApprovalRoutingRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  rules: RoutingRule[],
  now: Date,
) {
  const actorId = await holder(auth, actor, 'ICPDP_OFFICER')
  return repo.createDraft(validateRoutingRules(rules), actorId, now)
}

// UC05: ICPDP officer lưu chỉnh sửa bản nháp bộ quy tắc
export async function saveRoutingDraft(
  repo: ApprovalRoutingRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  ruleSetId: string,
  rules: RoutingRule[],
  now: Date,
) {
  const actorId = await holder(auth, actor, 'ICPDP_OFFICER')
  return repo.saveDraft(id(ruleSetId), validateRoutingRules(rules), actorId, now)
}

// UC05: kích hoạt bản nháp bộ quy tắc sau khi kiểm chồng chéo
/** FR-UC05-03/04: rule chồng lấn bị từ chối; kích hoạt tạo version và audit; chỉ request mới dùng rule mới. */
export async function activateRoutingRuleSet(
  repo: ApprovalRoutingRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  ruleSetId: string,
  now: Date,
) {
  const actorId = await holder(auth, actor, 'ICPDP_OFFICER')
  const draft = await repo.find(id(ruleSetId))
  if (!draft) {
    throw new DomainError('routing rule set not found', 'not_found')
  }
  if (draft.state !== 'Draft') {
    throw new DomainError('only a draft rule set can be activated', 'conflict')
  }
  validateRoutingRules(draft.rules)
  return repo.activate(draft.id, actorId, now)
}

// UC05: mô phỏng bộ quy tắc trên các yêu cầu đã quyết định gần nhất
/** UC05 A1: rule nào của một rule set sẽ khớp N request đã quyết định gần nhất, và SLA của chúng; chỉ đọc. */
export async function simulateRoutingRuleSet(
  repo: ApprovalRoutingRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  ruleSetId: string,
  limit: number,
) {
  await holder(auth, actor, 'ICPDP_OFFICER')
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new DomainError('choose between 1 and 200 requests', 'validation')
  }
  const set = await repo.find(id(ruleSetId))
  if (!set) {
    throw new DomainError('routing rule set not found', 'not_found')
  }
  return simulateRouting(set.rules, await repo.recentDecided(limit))
}
