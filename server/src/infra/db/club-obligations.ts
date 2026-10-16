import { Types, type ClientSession } from "mongoose";
import type { TransitionObligation } from "../../domain/leadership-transition.js";
import { ucmsModels as m } from "./ucms-models.js";

export async function clubOutstandingObligations(clubId: Types.ObjectId, session?: ClientSession): Promise<Omit<TransitionObligation, "assigneeMembershipId">[]> {
  const [events, budgets, reports, cases] = await Promise.all([
    m.events!.find({ clubId, state: { $nin: ["Draft", "Cancelled", "Closed", "Expired", "Rejected"] } }).session(session ?? null).lean(),
    m.eventBudgets!.find({ clubId, state: { $nin: ["Closed", "Cancelled"] } }).session(session ?? null).lean(),
    m.periodicReports!.find({ clubId, state: { $ne: "Accepted" } }).session(session ?? null).lean(),
    m.violations!.find({ clubId, state: { $nin: ["Resolved", "Closed"] } }).session(session ?? null).lean(),
  ]);
  return [
    ...events.map((d) => ({ id: `EVENT:${String(d._id)}`, type: "EVENT", entityId: String(d._id), description: String(d.title) })),
    ...budgets.map((d) => ({ id: `BUDGET:${String(d._id)}`, type: "BUDGET", entityId: String(d._id), description: `Budget ${String(d.periodCode ?? "")} (${String(d.state)})` })),
    ...reports.map((d) => ({ id: `REPORT:${String(d._id)}`, type: "REPORT", entityId: String(d._id), description: `Periodic report ${String(d.periodCode)}` })),
    ...cases.map((d) => ({ id: `VIOLATION:${String(d._id)}`, type: "VIOLATION", entityId: String(d._id), description: String(d.title) })),
  ];
}
