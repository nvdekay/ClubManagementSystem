import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventDefenseRepository } from "../../src/infra/db/mongo-event-defense-repository.js";
import { mongoEventProposalReviewRepository } from "../../src/infra/db/mongo-event-proposal-review-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-event-defense-test-${process.pid}`;
const HOUR = 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo event defense repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const secondOfficer = new Types.ObjectId();
  const member = new Types.ObjectId();
  const clubId = new Types.ObjectId();
  const roomId = new Types.ObjectId();

  async function seedEvent(title: string) {
    const eventId = new Types.ObjectId();
    const startAt = new Date(now.getTime() + 14 * 24 * HOUR);
    await ucmsModels.events!.create({
      _id: eventId,
      organizerType: "CLUB",
      clubId,
      clubName: "Tech Club",
      title,
      startAt,
      endAt: new Date(startAt.getTime() + 2 * HOUR),
      semesterCode: "Fall 2026",
      venueText: "Campus Hall",
      audienceScope: "PUBLIC",
      capacity: 120,
      riskCategory: "HIGH",
      conflictResult: "No Conflict",
      state: "Pending Approval",
      currentRevisionNo: 1,
      createdAt: now,
    });
    await ucmsModels.eventProposalVersions!.create({
      eventId,
      revisionNo: 1,
      submittedBy: member,
      submittedAt: now,
      payload: { title, plan: "Full proposal plan" },
      budgetLines: [{ category: "Stage", amount: 5_000_000, purpose: "Lighting" }],
      requestedBudgetTotal: 5_000_000,
    });
    await ucmsModels.approvalTasks!.create({
      entityType: "EVENT_PROPOSAL",
      entityId: eventId,
      clubId,
      title,
      state: "Open",
      openedAt: now,
    });
    return String(eventId);
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([
      { _id: officer, email: "lead@fpt.edu.vn", displayName: "Lead Officer", googleSubject: "lead", accountState: "Active", createdAt: now },
      { _id: secondOfficer, email: "panel@fpt.edu.vn", displayName: "Panel Officer", googleSubject: "panel", accountState: "Active", createdAt: now },
      { _id: member, email: "leader@fpt.edu.vn", displayName: "Club Leader", googleSubject: "ldr", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubs!.create({
      _id: clubId,
      code: "CLB-TECH",
      name: "Tech Club",
      field: "Technology",
      state: "Active",
      createdAt: now,
    });
    await ucmsModels.properties!.create({
      _id: roomId,
      code: "BE-201",
      name: "Defense Room 201",
      type: "ROOM",
      location: "Beta",
      capacity: 30,
      isActive: true,
      createdAt: now,
    });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("schedules defense with room lock, supports live multi-officer notes, re-defense, and post-defense approval", async () => {
    const reviewRepo = mongoEventProposalReviewRepository();
    const defenseRepo = mongoEventDefenseRepository(reviewRepo);

    const eventId1 = await seedEvent("AI Summit 2026");
    const eventId2 = await seedEvent("Hackathon 2026");

    await reviewRepo.claim(eventId1, String(officer), now);
    await reviewRepo.claim(eventId2, String(officer), now);

    const slotStart = new Date(now.getTime() + 72 * HOUR);
    const scheduled = await defenseRepo.schedule(eventId1, String(officer), {
      title: "Round 1 Defense",
      startAt: slotStart,
      durationMinutes: 60,
      propertyId: String(roomId),
      note: "Present stage layout",
    }, now);
    expect(scheduled.state).toBe("SCHEDULED");

    // Overlapping defense on the same room is blocked.
    await expect(defenseRepo.schedule(eventId2, String(officer), {
      title: "Overlap Defense",
      startAt: new Date(slotStart.getTime() + 15 * 60_000),
      durationMinutes: 60,
      propertyId: String(roomId),
    }, now)).rejects.toMatchObject({ kind: "conflict" });

    // Proposal approval is blocked while an active defense exists.
    await expect(reviewRepo.decide(eventId1, String(officer), {
      outcome: "Approve",
      sections: [],
      conditions: [],
      budgetLines: [{ approvedAmount: 5_000_000 }],
    }, now)).rejects.toMatchObject({ kind: "conflict" });

    // Club confirms >= 24h before start.
    const confirmed = await defenseRepo.confirmByClub(String(clubId), eventId1, String(member), now);
    expect(confirmed.state).toBe("CONFIRMED");

    // Both officers join live session and save independent markdown notes.
    const defenseNow = new Date(slotStart.getTime() - 10 * 60_000);
    await defenseRepo.start(eventId1, String(officer), defenseNow);
    await defenseRepo.saveNote(eventId1, String(officer), "# Lead note\n- Good plan", defenseNow);
    const afterPanelNote = await defenseRepo.saveNote(eventId1, String(secondOfficer), "# Panel note\n- Check budget", defenseNow);
    expect(afterPanelNote.notes).toHaveLength(2);

    const ended = await defenseRepo.end(eventId1, String(officer), slotStart);
    expect(ended.state).toBe("DEFENDED");

    // Officer grants Re-defense -> moves event to Re-defense Pending.
    const reDefenseDetail = await defenseRepo.decideAfterDefense(eventId1, String(officer), {
      outcome: "Re-defense",
      reason: "Clarify lighting vendor quote",
      sections: [],
      conditions: [],
      budgetLines: [],
    }, slotStart);
    expect(reDefenseDetail.event.state).toBe("Re-defense Pending");
    expect(reDefenseDetail.activeDefenseSession).toBeUndefined();
    expect(reDefenseDetail.defenseHistory).toHaveLength(1);

    // Round 2 defense can be scheduled without limit and then approved with budget.
    const round2Start = new Date(slotStart.getTime() + 72 * HOUR);
    await defenseRepo.schedule(eventId1, String(officer), {
      title: "Round 2 Defense",
      startAt: round2Start,
      durationMinutes: 45,
      propertyId: String(roomId),
    }, slotStart);
    await defenseRepo.start(eventId1, String(officer), round2Start);
    await defenseRepo.end(eventId1, String(officer), round2Start);

    const approvedDetail = await defenseRepo.decideAfterDefense(eventId1, String(officer), {
      outcome: "Approve",
      sections: [],
      conditions: ["Submit final vendor contract"],
      budgetLines: [{ approvedAmount: 4_500_000, reason: "Negotiated discount" }],
    }, round2Start);
    expect(approvedDetail.event.state).toBe("Approved");
    expect(approvedDetail.budget?.approvedTotal).toBe(4_500_000);
  });

  it("marks NO_SHOW and immediately rejects the proposal", async () => {
    const reviewRepo = mongoEventProposalReviewRepository();
    const defenseRepo = mongoEventDefenseRepository(reviewRepo);

    const eventId = await seedEvent("No-Show Event");
    await reviewRepo.claim(eventId, String(officer), now);
    const slotStart = new Date(now.getTime() + 96 * HOUR);
    await defenseRepo.schedule(eventId, String(officer), {
      title: "Scheduled Defense",
      startAt: slotStart,
      durationMinutes: 60,
      propertyId: String(roomId),
    }, now);

    const session = await defenseRepo.markNoShow(eventId, String(officer), "Club did not show up", slotStart);
    expect(session.state).toBe("NO_SHOW");
    const detail = await reviewRepo.find(eventId, slotStart);
    expect(detail?.event.state).toBe("Rejected");
  });
});
