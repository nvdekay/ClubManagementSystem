import { Types, type ClientSession } from "mongoose";
import { resolveApprovalRoute, type RoutingFacts, type RoutingRule } from "../../domain/approval-routing.js";
import { ucmsModels as m } from "./ucms-models.js";

const HOUR_MS = 3_600_000;
const OPEN_VIOLATION_STATES = ["Open", "Under Investigation", "Awaiting Club Response", "Decision Issued", "Corrective Action"];

/** Compliance history fact (UC05): the club's UC40 cases that are not resolved or closed. */
export async function openViolationCount(clubId: unknown, session?: ClientSession): Promise<number> {
  if (!clubId) return 0;
  return m.violations!.countDocuments({ clubId, state: { $in: OPEN_VIOLATION_STATES } }).session(session ?? null);
}

/** Task fields frozen when a UC08 / UC26 / UC46 review opens: the matching rule of the active set sets the SLA (BR16). */
export async function routedTaskFields(session: ClientSession, facts: RoutingFacts, now: Date) {
  const active = await m.routingRuleSets!.findOne({ state: "Active" }).session(session).lean();
  const route = resolveApprovalRoute(active ? { id: String(active._id), rules: (active.rules ?? []) as RoutingRule[] } : null, facts);
  return { ...(route.routingRuleSetId ? { routingRuleSetId: new Types.ObjectId(route.routingRuleSetId) } : {}),
    ...(route.routingRuleId ? { routingRuleId: route.routingRuleId } : {}),
    ...(route.slaHours ? { slaDueAt: new Date(now.getTime() + route.slaHours * HOUR_MS) } : {}) };
}
