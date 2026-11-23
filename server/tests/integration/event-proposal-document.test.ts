// feat-event-proposal-document over HTTP: real Express app, Mongo repositories, sessions and CSRF.
// Only Cloudinary is replaced by an in-memory file store, since uploads leave the system.
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EventProposalFileStorage } from "../../src/domain/club-event.js";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import type { AuthConfig } from "../../src/infra/config/index.js";
import { createSessionService } from "../../src/infra/auth/session-service.js";
import { ensureAuthBootstrap } from "../../src/infra/db/bootstrap-auth.js";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { mongoAccountAdminRepository } from "../../src/infra/db/mongo-account-admin-repository.js";
import { ensureAuthSessionIndexes, mongoSessionRepository } from "../../src/infra/db/mongo-auth-session-repository.js";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { mongoClubEventRepository } from "../../src/infra/db/mongo-club-event-repository.js";
import { mongoEventProposalReviewRepository } from "../../src/infra/db/mongo-event-proposal-review-repository.js";
import { mongoPolicyRepository } from "../../src/infra/db/mongo-policy-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
import { buildApp } from "../../src/interface/http/server.js";

const uri = process.env.MONGO_URI;
const secret = "proposal-document-session-secret-long-enough";
const DAY = 86_400_000;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml word/document.xml")]);
const pdf = Buffer.from("%PDF-1.7\n%%EOF\n", "latin1");

interface Actor { id: string; cookie: string; csrf: string }
type Json = ReturnType<typeof JSON.parse>;

describe.skipIf(!uri)("Event proposal template and document", () => {
  let server: Server;
  let base = "";
  let officer: Actor, leader: Actor, member: Actor;
  const club = new Types.ObjectId();
  const startAt = new Date(Date.now() + 20 * DAY), endAt = new Date(startAt.getTime() + 2 * 3_600_000);
  let assets = 0;
  const files: EventProposalFileStorage = {
    async uploadProposalDocument(input) {
      return { id: `doc-${++assets}`, fileName: input.fileName, mimeType: input.mimeType, bytes: input.bytes.length,
        assetId: `asset-${assets}`, uploadedAt: input.now, uploadedBy: input.actorId };
    },
    async uploadTemplateDocument(input) {
      return { id: `tpl-${++assets}`, fileName: input.fileName, mimeType: input.mimeType, bytes: input.bytes.length,
        assetId: `asset-${assets}`, uploadedAt: input.now, uploadedBy: input.actorId };
    },
    async accessUrl(assetId, options) { return `https://files.test/${assetId}?inline=${options?.inline === true}`; },
  };

  async function call(who: Actor, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const all: Record<string, string> = { ...headers, Cookie: `ucms_session=${who.cookie}`, "X-CSRF-Token": who.csrf };
    let payload: Uint8Array | string | undefined;
    if (Buffer.isBuffer(body)) payload = new Uint8Array(body);
    else if (body !== undefined) { all["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const response = await fetch(`${base}/api/v1${path}`, { method, headers: all, body: payload, redirect: "manual" });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, body: (text.startsWith("{") ? JSON.parse(text) : {}) as Json };
  }
  function upload(who: Actor, path: string, fileName: string, mime: string, bytes: Buffer) {
    return call(who, "POST", path, bytes, { "Content-Type": mime, "X-Filename": encodeURIComponent(fileName) });
  }
  async function signIn(email: string, existingId?: string): Promise<Actor> {
    const id = existingId ?? String((await m.users!.create({ email, displayName: email, googleSubject: `sub-${email}`,
      accountState: "Active", createdAt: new Date() }))._id);
    const issued = await createSessionService(mongoSessionRepository(), secret).issue(id, new Date());
    return { id, cookie: issued.cookieValue, csrf: issued.csrfToken };
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-proposal-document-${process.pid}` });
    await ensureUcmsDatabase();
    await ensureAuthSessionIndexes();
    await ensureAuthBootstrap({ ALLOWED_DOMAIN: "doc.edu", BOOTSTRAP_ICPDP_EMAIL: "officer@doc.edu" } as AuthConfig);
    async function unused(): Promise<never> { throw new Error("not used"); }
    const app = buildApp({
      publicRepo: mongoPublicDiscoveryRepository(), dbReady: () => true,
      adminRepo: mongoAccountAdminRepository(), policyRepo: mongoPolicyRepository(),
      clubEventRepo: mongoClubEventRepository({ proposalNoticeHours: 168, cancellationNoticeHours: 24 }),
      eventProposalReviewRepo: mongoEventProposalReviewRepository(), eventProposalFiles: files,
      auth: { repo: mongoAuthRepository("doc.edu"), accessRepo: mongoAccessRepository(),
        sessions: createSessionService(mongoSessionRepository(), secret),
        google: { begin: unused, complete: unused } as never, oauthFlow: { seal: unused, open: unused } as never,
        clientBaseUrl: "http://localhost:5173", secureCookies: false },
    });
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const officerDoc = await m.users!.findOne({ email: "officer@doc.edu" }).lean();
    officer = await signIn("officer@doc.edu", String(officerDoc!._id));
    leader = await signIn("leader@doc.edu");
    member = await signIn("member@doc.edu");
    const now = new Date();
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS, reportDeadlines: [],
      conflictThresholdMinutes: 15, feedbackWindowHours: 72, feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: false,
      academicCalendar: [{ code: "Term", startAt: new Date(now.getTime() - 60 * DAY), endAt: new Date(now.getTime() + 180 * DAY) }],
      effectiveFrom: new Date(now.getTime() - DAY), createdBy: new Types.ObjectId(officer.id), createdAt: now });
    await m.clubs!.create({ _id: club, code: "DOC", name: "Docs Club", field: "Technology", state: "Active", createdAt: now });
    const [own] = await m.clubMemberships!.create([leader, member].map((who) => ({ clubId: club, userId: new Types.ObjectId(who.id),
      state: "Active", joinedAt: now, statusHistory: [] })));
    const position = await m.clubPositions!.create({ clubId: club, code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true,
      isLeaderRole: false, isActive: true, permissionCodes: [] });
    const term = await m.clubTerms!.create({ clubId: club, name: "Term", state: "Active", startAt: new Date(now.getTime() - 60 * DAY),
      endAt: new Date(now.getTime() + 365 * DAY) });
    await m.clubPositionAssignments!.create({ clubId: club, termId: term._id, positionId: position._id, membershipId: own!._id,
      effectiveFrom: new Date(now.getTime() - 60 * DAY), assignedBy: new Types.ObjectId(leader.id), confirmedBy: new Types.ObjectId(leader.id) });
  }, 60_000);

  afterAll(async () => {
    server?.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  let eventId = "";
  const events = `/clubs/${club}/events`;

  it("1. serves the bundled default template before ICPDP uploads one", async () => {
    const info = await call(leader, "GET", "/events/proposal-template");
    expect(info.body.data).toMatchObject({ fileName: "Template Đề án sự kiện.docx", mimeType: DOCX, isSystemDefault: true });
    const download = await call(leader, "GET", "/events/proposal-template/download");
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toContain(DOCX);
    expect(download.headers.get("content-disposition")).toBe(
      `attachment; filename="Template De an su kien.docx"; filename*=UTF-8''${encodeURIComponent("Template Đề án sự kiện.docx")}`);
  });

  it("2. lets only an ICPDP officer replace the template; later downloads get the new one", async () => {
    expect((await upload(leader, "/admin/event-proposals/template", "Mẫu mới.docx", DOCX, docx)).status).toBe(403);
    const replaced = await upload(officer, "/admin/event-proposals/template", "Mẫu mới.docx", DOCX, docx);
    expect(replaced.status).toBe(201);
    expect(replaced.body.data).toMatchObject({ fileName: "Mẫu mới.docx", bytes: docx.length, isSystemDefault: false });
    expect(replaced.text).not.toContain("asset");
    expect((await call(leader, "GET", "/events/proposal-template")).body.data).toMatchObject({ fileName: "Mẫu mới.docx", isSystemDefault: false });
    const download = await call(leader, "GET", "/events/proposal-template/download");
    expect(download.status).toBe(302);
    expect(download.headers.get("location")).toMatch(/^https:\/\/files\.test\/asset-\d+\?inline=false$/);
  });

  it("3. saves a draft without a document but refuses to submit it", async () => {
    const created = await call(leader, "POST", events, { title: "Workshop", objective: "Goal", plan: "Plan", startAt: startAt.toISOString(),
      endAt: endAt.toISOString(), venueText: "Hall", audienceScope: "PUBLIC", capacity: 50, budgetLines: [], bookingIds: [] });
    expect(created.status).toBe(201);
    eventId = created.body.data.event.id;
    expect(created.body.data.event.proposalDocument).toBeUndefined();
    const refused = await call(leader, "POST", `${events}/${eventId}/submit`, { expectedVersion: created.body.data.event.version });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toBe("event proposal document is required before submission");
  });

  it("4. keeps the uploaded document across a text save and freezes it on submit", async () => {
    expect((await upload(leader, `${events}/${eventId}/proposal-document`, "fake.pdf", "application/pdf", docx)).status).toBe(400);
    const before = (await call(leader, "GET", `${events}/${eventId}`)).body.data.event.version as number;
    const uploaded = await upload(leader, `${events}/${eventId}/proposal-document`, "Đề án v1.pdf", "application/pdf", pdf);
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.data.event.version).toBe(before + 1);
    expect(uploaded.body.data.event.proposalDocument).toMatchObject({ fileName: "Đề án v1.pdf", mimeType: "application/pdf", bytes: pdf.length, uploadedBy: leader.id });
    expect(uploaded.text).not.toContain("assetId");
    const saved = await call(leader, "POST", `${events}/${eventId}/save`, { title: "Workshop", objective: "Goal", plan: "Edited plan",
      startAt: startAt.toISOString(), endAt: endAt.toISOString(), venueText: "Hall", audienceScope: "PUBLIC", capacity: 50,
      budgetLines: [], bookingIds: [], expectedVersion: uploaded.body.data.event.version });
    expect(saved.status).toBe(200);
    expect(saved.body.data.event.proposalDocument.fileName).toBe("Đề án v1.pdf");
    const submitted = await call(leader, "POST", `${events}/${eventId}/submit`, { expectedVersion: saved.body.data.event.version });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.event.state).toBe("Pending Approval");
    expect(submitted.body.data.versions[0].payload.proposalDocument.fileName).toBe("Đề án v1.pdf");
    expect(submitted.text).not.toContain("assetId");
    const frozen = await m.eventProposalVersions!.findOne({ eventId: new Types.ObjectId(eventId), revisionNo: 1 }).lean();
    expect((frozen?.payload as { proposalDocument?: { assetId?: string } }).proposalDocument?.assetId).toMatch(/^asset-/);
  });

  it("5. after a content revision request, both revisions' documents stay reachable", async () => {
    expect((await call(officer, "POST", `/admin/event-proposals/${eventId}/claim`)).status).toBe(200);
    const revision = await call(officer, "POST", `/admin/event-proposals/${eventId}/decision`, { outcome: "Request revision",
      reason: "Rework the proposal document", sections: ["content"], revisionDeadlineAt: new Date(Date.now() + 3 * DAY).toISOString() });
    expect(revision.status).toBe(200);
    const v2 = await upload(leader, `${events}/${eventId}/proposal-document`, "Đề án v2.docx", DOCX, docx);
    expect(v2.status).toBe(200);
    const resubmitted = await call(leader, "POST", `${events}/${eventId}/submit`, { expectedVersion: v2.body.data.event.version });
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.data.versions.map((v: Json) => v.payload.proposalDocument.fileName)).toEqual(["Đề án v1.pdf", "Đề án v2.docx"]);
    const first = await call(leader, "GET", `${events}/${eventId}/proposal-document/access?revisionNo=1`);
    const second = await call(officer, "GET", `/admin/event-proposals/${eventId}/document/access?revisionNo=2&inline=true`);
    const latest = await call(officer, "GET", `/admin/event-proposals/${eventId}/document/access`);
    expect(first.body.data).toMatchObject({ fileName: "Đề án v1.pdf", mimeType: "application/pdf" });
    expect(second.body.data).toMatchObject({ fileName: "Đề án v2.docx", url: expect.stringContaining("inline=true") });
    expect(latest.body.data.url).toBe(second.body.data.url.replace("inline=true", "inline=false"));
    expect(first.body.data.url).not.toBe(latest.body.data.url);
    const review = await call(officer, "GET", `/admin/event-proposals/${eventId}`);
    expect(review.body.data.versions[1].payload.proposalDocument.fileName).toBe("Đề án v2.docx");
    expect(review.text).not.toContain("assetId");
  });

  it("6. a rescheduled approved event inherits the document in its new revision", async () => {
    expect((await call(officer, "POST", `/admin/event-proposals/${eventId}/claim`)).status).toBe(200);
    const approved = await call(officer, "POST", `/admin/event-proposals/${eventId}/decision`, { outcome: "Approve", budgetLines: [] });
    expect(approved.status).toBe(200);
    const detail = (await call(leader, "GET", `${events}/${eventId}`)).body.data;
    expect(detail.event.state).toBe("Approved");
    const moved = await call(leader, "POST", `${events}/${eventId}/reschedule`, { expectedVersion: detail.event.version, reason: "Speaker moved",
      startAt: new Date(startAt.getTime() + DAY).toISOString(), endAt: new Date(endAt.getTime() + DAY).toISOString(), venueText: "Hall" });
    expect(moved.status).toBe(200);
    expect(moved.body.data.versions).toHaveLength(3);
    expect(moved.body.data.versions[2].payload.proposalDocument).toEqual(moved.body.data.versions[1].payload.proposalDocument);
    expect(moved.body.data.event.proposalDocument.fileName).toBe("Đề án v2.docx");
  });

  it("7. a member outside the club board cannot reach the document", async () => {
    expect((await call(member, "GET", `${events}/${eventId}/proposal-document/access`)).status).toBe(403);
    expect((await call(member, "GET", `/admin/event-proposals/${eventId}/document/access`)).status).toBe(403);
    expect((await upload(member, `${events}/${eventId}/proposal-document`, "x.pdf", "application/pdf", pdf)).status).toBe(403);
  });
});
