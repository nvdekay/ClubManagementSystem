import { Types, type ClientSession } from "mongoose";
import { resolveApprovalRoute, type RoutingFacts, type RoutingRule } from "../../domain/approval-routing.js";
import { ucmsModels as m } from "./ucms-models.js";

const HOUR_MS = 3_600_000;
const OPEN_VIOLATION_STATES = ["Open", "Under Investigation", "Awaiting Club Response", "Decision Issued", "Corrective Action"];

// Đếm vi phạm chưa đóng của CLB làm dữ kiện định tuyến duyệt
/** Dữ kiện lịch sử tuân thủ (UC05): các vụ việc UC40 của CLB chưa được giải quyết hoặc đóng. */
export async function openViolationCount(clubId: unknown, session?: ClientSession): Promise<number> {
  if (!clubId) return 0;
  return m.violations!.countDocuments({ clubId, state: { $in: OPEN_VIOLATION_STATES } }).session(session ?? null);
}

// Tính trường routing và hạn SLA từ rule set Active khi mở task review
/** Các trường của task được đóng băng khi review UC08 / UC26 / UC46 mở ra: rule khớp của bộ rule đang Active quyết định SLA (BR16). */
export async function routedTaskFields(session: ClientSession, facts: RoutingFacts, now: Date) {
  const active = await m.routingRuleSets!.findOne({ state: "Active" }).session(session).lean();
  const route = resolveApprovalRoute(active ? { id: String(active._id), rules: (active.rules ?? []) as RoutingRule[] } : null, facts);
  return { ...(route.routingRuleSetId ? { routingRuleSetId: new Types.ObjectId(route.routingRuleSetId) } : {}),
    ...(route.routingRuleId ? { routingRuleId: route.routingRuleId } : {}),
    ...(route.slaHours ? { slaDueAt: new Date(now.getTime() + route.slaHours * HOUR_MS) } : {}) };
}
