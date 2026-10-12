// Builds a separate database for screenshots without changing the source database's policy.
import mongoose, { Types } from "mongoose";
import { loadConfig } from "../config/index.js";
import { ensureUcmsDatabase, ucmsModels as m } from "./ucms-models.js";
import { seedWave4 } from "./seed-wave4.js";
import { mongoEventFinanceRepository } from "./mongo-event-finance-repository.js";
import { mongoPostEventReportRepository } from "./mongo-post-event-report-repository.js";

const DATABASE = "ucms_guide_demo";
const config = loadConfig();
const now = new Date();
const clubId = new Types.ObjectId("a10000000000000000000013");

try {
  await mongoose.connect(config.MONGO_URI);
  const source = mongoose.connection.db!;
  if (source.databaseName === DATABASE) throw new Error("Source must differ from the guide database");
  const target = source.client.db(DATABASE);
  // Copy once. Subsequent runs preserve all actions already performed in the guide database.
  for (const model of Object.values(m)) {
    const name = model.collection.name;
    if (await target.collection(name).countDocuments() > 0) continue;
    const docs = await source.collection(name).find({}).toArray();
    if (docs.length) await target.collection(name).insertMany(docs);
  }
  await mongoose.disconnect();
  await mongoose.connect(config.MONGO_URI, { dbName: DATABASE });
  await ensureUcmsDatabase();
  const position = await m.clubPositions!.findOne({ clubId, isLeaderRole: true, isActive: true }).lean();
  const assignment = position && await m.clubPositionAssignments!.findOne({ positionId: position._id, effectiveTo: null }).lean();
  const membership = assignment && await m.clubMemberships!.findById(assignment.membershipId).lean();
  if (!membership) throw new Error("Run seed:demo before the guide seed");
  const owner = membership.userId as Types.ObjectId;
  const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1 }).lean();
  if (!policy) throw new Error("Demo policy is missing");
  const reportDeadline = { reportType: "POST_EVENT", dueDaysAfterPeriodEnd: 7,
    remindBeforeDays: 2, overdueAfterDays: 1, escalateAfterDays: 3 };
  if (!((policy.reportDeadlines ?? []) as { reportType: string }[]).some((d) => d.reportType === "POST_EVENT")) {
    const { _id: policyId, __v: revision, ...settings } = policy;
    void policyId;
    void revision;
    await m.policyVersions!.create({ ...settings, effectiveFrom: now, createdAt: now, createdBy: owner,
      reportDeadlines: [...(policy.reportDeadlines as unknown[]), { reportType: "POST_EVENT", dueDaysAfterPeriodEnd: 7,
        remindBeforeDays: 2, overdueAfterDays: 1, escalateAfterDays: 3 }] });
  }
  // Historical seeded events also need a policy at their end time. Only the isolated copy is amended.
  await m.policyVersions!.updateMany({ "reportDeadlines.reportType": { $ne: "POST_EVENT" } },
    { $push: { reportDeadlines: reportDeadline } });
  if (!(await m.policyVersions!.exists({ effectiveFrom: { $lte: new Date("2000-01-01") } }))) {
    const { _id: policyId, __v: revision, ...settings } = policy;
    void policyId;
    void revision;
    await m.policyVersions!.create({ ...settings, effectiveFrom: new Date("2000-01-01"), createdAt: now, createdBy: owner,
      reportDeadlines: [...((settings.reportDeadlines ?? []) as { reportType: string }[])
        .filter((deadline) => deadline.reportType !== "POST_EVENT"), reportDeadline] });
  }
  // These values are demo fixtures only, not approved BR25/BR58 production policy.
  const finance = mongoEventFinanceRepository({ recoveryDueDays: 14, evidenceTypes: ["INVOICE", "RECEIPT", "PROOF_OF_PAYMENT"] });
  await seedWave4(owner, clubId, now, finance);
  const events = await m.events!.find({ clubId, title: /^Wave 4 demo:/ }).lean();
  const members = await m.clubMemberships!.find({ clubId, state: "Active" }).limit(5).lean();
  for (const event of events) {
    if (event.state === "Cancelled") continue;
    for (const [index, member] of members.entries()) {
      const registration = await m.eventRegistrations!.findOneAndUpdate({ eventId: event._id, studentId: member.userId },
        { $setOnInsert: { clubId, state: "Confirmed", answers: {}, createdAt: now } }, { upsert: true, new: true }).lean();
      await m.attendances!.updateOne({ eventId: event._id, studentId: member.userId }, { $setOnInsert: {
        registrationId: registration!._id, clubId, checkedInAt: event.startAt, method: "manual", finalized: true,
        finalizedAt: now, finalizedBy: owner, abnormalFlags: index === 4 ? ["no-show"] : [] } }, { upsert: true });
      if (index < 3) await m.eventFeedbacks!.updateOne({ eventId: event._id, studentId: member.userId }, { $setOnInsert: {
        clubId, scores: [{ criterionCode: "overall", score: 4 + index % 2 }], comment: "Useful workshop (guide demo).",
        isAnonymous: true, submittedAt: now } }, { upsert: true });
    }
    await m.events!.updateOne({ _id: event._id }, { $set: { confirmedRegistrationCount: members.length } });
  }
  const reports = mongoPostEventReportRepository();
  for (const event of events) {
    if (!String(event.title).endsWith("balanced") && !String(event.title).endsWith("refund")) continue;
    let detail = (await reports.find(String(event._id), String(clubId), now))!;
    if (detail.versions[0]?.state !== "Draft" || detail.versions[0].versionNo !== 1) continue;
    detail = await reports.act(String(event._id), String(clubId), String(owner),
      { kind: "submit", revision: detail.obligation.revision }, now);
    if (String(event.title).endsWith("balanced")) {
      detail = await reports.act(String(event._id), undefined, String(owner), { kind: "claim", revision: detail.obligation.revision }, now);
      await reports.act(String(event._id), undefined, String(owner), { kind: "decision", revision: detail.obligation.revision,
        outcome: "return", reason: "Add activity photographs and explain the two attendance totals (guide demo)." }, now);
    }
  }
  for (const event of events) {
    const budget = await m.eventBudgets!.findOne({ eventId: event._id }).lean();
    if (!budget || event.state === "Cancelled" || String(event.title).endsWith("balanced")) continue;
    let detail = (await finance.find(String(budget._id)))!;
    if (detail.state !== "Disbursed") continue;
    detail = await finance.act(detail.id, String(clubId), String(owner), { kind: "submit", revision: detail.revision }, now);
    detail = await finance.act(detail.id, undefined, String(owner), { kind: "claim", revision: detail.revision }, now);
    if (String(event.title).endsWith("top-up")) await finance.act(detail.id, undefined, String(owner), {
      kind: "finalize", revision: detail.revision, reviews: detail.expenses.map((expense) => ({ expenseId: expense.id,
        outcome: "Accepted", reason: "Receipt verified (guide demo)." })) }, now);
  }
  const counts = await Promise.all(["events", "postEventReports", "eventBudgets", "expenses", "financialEvidences", "attendances",
    "eventFeedbacks", "approvalTasks"].map(async (name) => ({ collection: name, count: await mongoose.connection.db!.collection(name).countDocuments() })));
  console.log(JSON.stringify({ database: DATABASE, counts }));
} catch (error) {
  console.error("guide seed failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
