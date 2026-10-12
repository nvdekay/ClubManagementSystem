// End-to-end scenarios for the simplified club founding flow (feat-simplified-club-founding):
// real Express app, real Mongo repositories, real sessions and CSRF. Only Cloudinary is replaced by
// an in-memory file store, since uploads leave the system.
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApplicationFileStorage } from "../../src/domain/club-application.js";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import type { AuthConfig } from "../../src/infra/config/index.js";
import { createSessionService } from "../../src/infra/auth/session-service.js";
import { ensureAuthBootstrap } from "../../src/infra/db/bootstrap-auth.js";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { ensureAuthSessionIndexes, mongoSessionRepository } from "../../src/infra/db/mongo-auth-session-repository.js";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { mongoAccountAdminRepository } from "../../src/infra/db/mongo-account-admin-repository.js";
import { mongoBoardNominationRepository } from "../../src/infra/db/mongo-board-nomination-repository.js";
import { mongoClubApplicationRepository } from "../../src/infra/db/mongo-club-application-repository.js";
import { mongoClubApplicationReviewRepository } from "../../src/infra/db/mongo-club-application-review-repository.js";
import { ensureDefaultClubFields, mongoClubFieldRepository } from "../../src/infra/db/mongo-club-field-repository.js";
import { mongoClubProfileRepository } from "../../src/infra/db/mongo-club-profile-repository.js";
import { mongoPolicyRepository } from "../../src/infra/db/mongo-policy-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { buildApp } from "../../src/interface/http/server.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-founding-e2e-${process.pid}`;
const secret = "e2e-session-secret-that-is-long-enough-123";

interface Actor { id: string; cookie: string; csrf: string; email: string }
/** Parsed JSON envelope; every field read from it is checked by an expect() right away. */
type Json = ReturnType<typeof JSON.parse>;
interface Reply { status: number; body: Json }

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n", "latin1");
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("[Content_Types].xml payload")]);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(64, 1)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const svg = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");

describe.skipIf(!uri)("E2E: simplified club founding", () => {
  let server: Server;
  let base = "";
  let officer: Actor;
  const students: Record<string, Actor> = {};
  const uploads: string[] = [];
  const fields: Record<string, string> = {};

  const files: ApplicationFileStorage = {
    async upload(input) {
      const id = randomUUID();
      uploads.push(`${input.documentType}:${input.visibility}`);
      return { id, documentType: input.documentType, fileName: input.fileName, mimeType: input.mimeType,
        bytes: input.bytes.length, assetId: `asset-${id}`, uploadedAt: input.now,
        ...(input.visibility === "public" ? { publicUrl: `https://cdn.test/${id}` } : {}) };
    },
    async accessUrl(assetId) { return `https://files.test/${assetId}`; },
  };

  async function call(who: Actor | null, method: string, path: string, body?: unknown,
    extraHeaders: Record<string, string> = {}): Promise<Reply> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (who) { headers.Cookie = `ucms_session=${who.cookie}`; headers["X-CSRF-Token"] = who.csrf; }
    let payload: Uint8Array | string | undefined;
    if (Buffer.isBuffer(body)) payload = new Uint8Array(body);
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const response = await fetch(`${base}/api/v1${path}`, { method, headers, body: payload });
    return { status: response.status, body: await response.json().catch(() => ({})) as Json };
  }

  function upload(who: Actor, id: string, documentType: string, fileName: string, mime: string, bytes: Buffer) {
    return call(who, "POST", `/applications/${id}/documents`, bytes, { "Content-Type": mime,
      "X-Document-Type": documentType, "X-Filename": encodeURIComponent(fileName) });
  }

  async function signIn(email: string, displayName: string, existingId?: string): Promise<Actor> {
    const id = existingId ?? String((await ucmsModels.users!.create({ email, displayName,
      googleSubject: `sub-${email}`, accountState: "Active", createdAt: new Date() }))._id);
    const issued = await createSessionService(mongoSessionRepository(), secret).issue(id, new Date());
    return { id, cookie: issued.cookieValue, csrf: issued.csrfToken, email };
  }

  function policyBody(overrides: Record<string, unknown> = {}) {
    return {
      minFoundingMembers: 3, formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [{ reportType: "PERIODIC", dueDaysAfterPeriodEnd: 7, remindBeforeDays: 2,
        overdueAfterDays: 1, escalateAfterDays: 3 }],
      conflictThresholdMinutes: 30, feedbackWindowHours: 72, feedbackMinRespondents: 3,
      allowOverbooking: false, enforceOverdueReportBlock: false,
      academicCalendar: [{ code: "FA26", startAt: "2026-09-01T00:00:00.000Z", endAt: "2026-12-31T00:00:00.000Z" }],
      ...overrides,
    };
  }

  function draftBody(overrides: Record<string, unknown> = {}) {
    return { clubName: "CLB Robotics FPTU", fieldId: fields["Công nghệ"], summary: "Chế tạo robot",
      objectives: "Học và thi đấu robot", fanpageUrl: "https://facebook.com/robotics",
      contactEmail: "robotics@e2e.edu", founders: [{ userId: students.an!.id, role: "LEADER" }], ...overrides };
  }

  /** A complete, submittable application owned by `owner` with the given board. */
  async function completeApplication(owner: Actor, clubName: string,
    founders: { userId: string; role: string }[]): Promise<string> {
    const created = await call(owner, "POST", "/applications", draftBody({ clubName, founders }));
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect((await upload(owner, id, "PROPOSAL", "de-an.pdf", "application/pdf", pdf)).status).toBe(201);
    expect((await upload(owner, id, "LOGO", "logo.png", "image/png", png)).status).toBe(201);
    return id;
  }

  async function approve(id: string): Promise<Reply> {
    const claimed = await call(officer, "POST", `/admin/application-reviews/${id}/claim`);
    expect(claimed.status).toBe(200);
    return call(officer, "POST", `/admin/application-reviews/${id}/decision`, { outcome: "Approve", sections: [] });
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ensureAuthSessionIndexes();
    await ensureDefaultClubFields();
    await ensureAuthBootstrap({ ALLOWED_DOMAIN: "e2e.edu", BOOTSTRAP_ICPDP_EMAIL: "officer@e2e.edu" } as AuthConfig);
    const sessions = createSessionService(mongoSessionRepository(), secret);
    async function unused(): Promise<never> { throw new Error("not used in e2e"); }
    const app = buildApp({
      publicRepo: mongoPublicDiscoveryRepository(), dbReady: () => true,
      adminRepo: mongoAccountAdminRepository(), policyRepo: mongoPolicyRepository(),
      applicationRepo: mongoClubApplicationRepository(), clubFieldRepo: mongoClubFieldRepository(),
      applicationReviewRepo: mongoClubApplicationReviewRepository(),
      clubProfileRepo: mongoClubProfileRepository(), boardNominationRepo: mongoBoardNominationRepository(),
      applicationFiles: files,
      auth: { repo: mongoAuthRepository("e2e.edu"), accessRepo: mongoAccessRepository(), sessions,
        google: { begin: unused, complete: unused } as never,
        oauthFlow: { seal: unused, open: unused } as never,
        clientBaseUrl: "http://localhost:5173", secureCookies: false },
    });
    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const officerDoc = await ucmsModels.users!.findOne({ email: "officer@e2e.edu" }).lean();
    officer = await signIn("officer@e2e.edu", "Officer", String(officerDoc!._id));
    for (const [key, name] of [["an", "Nguyễn An"], ["binh", "Trần Bình"], ["chi", "Lê Chi"], ["dung", "Phạm Dũng"],
      ["em", "Võ Em"], ["giang", "Đỗ Giang"]] as const) {
      students[key] = await signIn(`${key}@e2e.edu`, name);
    }
  }, 60_000);

  afterAll(async () => {
    server?.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("1. ICPDP sets the founding policy per flow; students cannot", async () => {
    expect((await call(students.an!, "POST", "/admin/policies", policyBody())).status).toBe(403);
    // Removed settings and malformed flags are rejected at the boundary.
    expect((await call(officer, "POST", "/admin/policies", policyBody({ allowedEmailDomains: ["*"] }))).status).toBe(400);
    expect((await call(officer, "POST", "/admin/policies", policyBody({ mandatoryApplicationDocuments: [] }))).status).toBe(400);
    expect((await call(officer, "POST", "/admin/policies", policyBody({ formRequirements: {
      ...DEFAULT_FORM_REQUIREMENTS, clubFounding: { ...DEFAULT_FORM_REQUIREMENTS.clubFounding, logo: "yes" } } }))).status).toBe(400);
    const created = await call(officer, "POST", "/admin/policies", policyBody());
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ minFoundingMembers: 3, formRequirements: DEFAULT_FORM_REQUIREMENTS });
    expect(created.body.data.allowedEmailDomains).toBeUndefined();
  });

  it("2. ICPDP manages the field catalog: defaults, add, duplicate, rename, delete unused", async () => {
    expect((await call(students.an!, "GET", "/admin/club-fields")).status).toBe(403);
    const listed = await call(officer, "GET", "/admin/club-fields");
    expect(listed.body.data.map((field: { name: string }) => field.name))
      .toEqual(["Công nghệ", "Ngôn ngữ", "Kỹ năng", "Nghệ thuật", "Thể thao", "Cộng đồng"]);
    for (const field of listed.body.data) fields[field.name] = field.id;
    const added = await call(officer, "POST", "/admin/club-fields", { name: "Học thuật", sortOrder: 70 });
    expect(added.status).toBe(201);
    fields["Học thuật"] = added.body.data.id;
    expect((await call(officer, "POST", "/admin/club-fields", { name: "  học   THUẬT ", sortOrder: 1 })).status).toBe(409);
    expect((await call(officer, "POST", "/admin/club-fields", { name: " ", sortOrder: 1 })).status).toBe(400);
    expect((await call(officer, "PATCH", `/admin/club-fields/${fields["Học thuật"]}`,
      { name: "Thể thao", sortOrder: 70 })).status).toBe(409);
    const unused = await call(officer, "POST", "/admin/club-fields", { name: "Tạm thời", sortOrder: 80 });
    expect((await call(officer, "DELETE", `/admin/club-fields/${unused.body.data.id}`)).body.data)
      .toEqual({ result: "deleted" });
    expect((await call(officer, "DELETE", `/admin/club-fields/${unused.body.data.id}`)).status).toBe(404);
  });

  it("3. Student sees the form configuration: active fields, fixed roles, required fields", async () => {
    expect((await call(null, "GET", "/applications/config")).status).toBe(401);
    const config = await call(students.an!, "GET", "/applications/config");
    expect(config.status).toBe(200);
    expect(config.body.data.fields.map((field: { name: string }) => field.name)).toContain("Học thuật");
    expect(config.body.data.positions.map((position: { founderRole: string }) => position.founderRole))
      .toEqual(["LEADER", "VICE_LEADER", "MEMBER"]);
    expect(config.body.data).toMatchObject({ maxViceLeaders: 2,
      requirements: { minFoundingMembers: 3, required: DEFAULT_FORM_REQUIREMENTS.clubFounding } });
  });

  let mainId = "";

  it("4. Draft creation validates name, field, roles, links, emails and CSRF", async () => {
    const withoutCsrf = await call({ ...students.an!, csrf: "wrong" }, "POST", "/applications", draftBody());
    expect(withoutCsrf.status).toBe(403);
    for (const bad of [
      { clubName: " " }, { fieldId: "" }, { fieldId: new Types.ObjectId().toString() },
      { founders: [{ userId: students.an!.id, role: "TREASURER" }] }, { founders: [{ userId: "x", role: "LEADER" }] },
      { fanpageUrl: "javascript:alert(1)" }, { contactEmail: "not-an-email" },
      { proposedRoles: [] }, { field: "Công nghệ" },
    ]) {
      expect((await call(students.an!, "POST", "/applications", draftBody(bad))).status, JSON.stringify(bad)).toBe(400);
    }
    const created = await call(students.an!, "POST", "/applications", draftBody({ summary: "", objectives: "" }));
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ state: "Draft", draft: { field: "Công nghệ",
      founders: [{ userId: students.an!.id, role: "LEADER" }] } });
    mainId = created.body.data.id;
  });

  it("5. Founder lookup is exact-email and Active-only", async () => {
    expect((await call(students.an!, "GET", "/applications/founder-lookup?email=BINH@e2e.edu")).body.data)
      .toMatchObject({ id: students.binh!.id, displayName: "Trần Bình" });
    expect((await call(students.an!, "GET", "/applications/founder-lookup?email=binh@e2e")).status).toBe(400);
    expect((await call(students.an!, "GET", "/applications/founder-lookup?email=nobody@e2e.edu")).status).toBe(404);
    await ucmsModels.users!.updateOne({ _id: new Types.ObjectId(students.giang!.id) }, { $set: { accountState: "Locked" } });
    expect((await call(students.an!, "GET", "/applications/founder-lookup?email=giang@e2e.edu")).status).toBe(404);
    await ucmsModels.users!.updateOne({ _id: new Types.ObjectId(students.giang!.id) }, { $set: { accountState: "Active" } });
  });

  it("6. Preview and submit list every gap of an incomplete application at once", async () => {
    const preview = await call(students.an!, "GET", `/applications/${mainId}/preview`);
    expect(preview.body.data.issues).toEqual(["summary", "objectives", "proposal", "logo", "foundersTooFew",
      "viceLeaderCount"]);
    const submit = await call(students.an!, "POST", `/applications/${mainId}/submit`);
    expect(submit.status).toBe(400);
    expect(submit.body.details).toMatchObject({ required: 3, issues: preview.body.data.issues });
    expect(await ucmsModels.clubApplicationVersions!.countDocuments({ applicationId: new Types.ObjectId(mainId) })).toBe(0);
  });

  it("7. Uploads accept only PDF/DOCX proposals and PNG/JPG logos within size, replacing per type", async () => {
    const bad: [string, string, string, Buffer][] = [
      ["LOGO", "logo.svg", "image/svg+xml", svg],
      ["LOGO", "logo.pdf", "application/pdf", pdf],
      ["LOGO", "fake.png", "image/png", pdf],
      ["LOGO", "big.png", "image/png", Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)])],
      ["PROPOSAL", "de-an.png", "image/png", png],
      ["PROPOSAL", "fake.pdf", "application/pdf", png],
      ["CHARTER", "dieu-le.pdf", "application/pdf", pdf],
    ];
    for (const [type, name, mime, bytes] of bad) {
      expect((await upload(students.an!, mainId, type, name, mime, bytes)).status, `${type} ${name}`).toBe(400);
    }
    expect((await upload(students.binh!, mainId, "PROPOSAL", "x.pdf", "application/pdf", pdf)).status).toBe(404);
    expect((await upload(students.an!, mainId, "PROPOSAL", "de-an.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docx)).status).toBe(201);
    expect((await upload(students.an!, mainId, "PROPOSAL", "de-an.pdf", "application/pdf", pdf)).status).toBe(201);
    const logo = await upload(students.an!, mainId, "LOGO", "logo.jpg", "image/jpeg", jpeg);
    expect(logo.status).toBe(201);
    expect(logo.body.data.publicUrl).toMatch(/^https:\/\/cdn\.test\//);
    expect(logo.body.data.assetId).toBeUndefined();
    const detail = await call(students.an!, "GET", `/applications/${mainId}`);
    expect(detail.body.data.application.draft.documents.map((document: { documentType: string; fileName: string }) =>
      `${document.documentType}:${document.fileName}`)).toEqual(["PROPOSAL:de-an.pdf", "LOGO:logo.jpg"]);
    expect(uploads).toEqual(["PROPOSAL:private", "PROPOSAL:private", "LOGO:public"]);
  });

  it("8. Founders and board roles: counts, leader/vice rules, stale edits", async () => {
    const detail = await call(students.an!, "GET", `/applications/${mainId}`);
    const revision = detail.body.data.application.draftRevision as number;
    function save(founders: { userId: string; role: string }[], draftRevision: number) {
      return call(students.an!, "PATCH", `/applications/${mainId}/draft`, { ...draftBody({ founders }), draftRevision });
    }
    const threeVices = await save([{ userId: students.an!.id, role: "LEADER" },
      ...["binh", "chi", "dung"].map((key) => ({ userId: students[key]!.id, role: "VICE_LEADER" }))], revision);
    expect(threeVices.status).toBe(200);
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data.issues).toEqual(["viceLeaderCount"]);
    const twoLeaders = await save([{ userId: students.an!.id, role: "LEADER" },
      { userId: students.binh!.id, role: "LEADER" }, { userId: students.chi!.id, role: "VICE_LEADER" }], revision + 1);
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data.issues).toEqual(["leaderCount"]);
    const notMe = await save([{ userId: students.binh!.id, role: "LEADER" },
      { userId: students.chi!.id, role: "VICE_LEADER" }, { userId: students.dung!.id, role: "MEMBER" }], revision + 2);
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data.issues).toEqual(["applicantNotFounder"]);
    expect(twoLeaders.status).toBe(200);
    expect(notMe.status).toBe(200);
    // A stale tab cannot overwrite a newer save.
    expect((await save([{ userId: students.an!.id, role: "LEADER" }], revision)).status).toBe(409);
    // Final board: Bình president (not the applicant), An and Chi vice presidents, Dũng member.
    const final = await save([{ userId: students.an!.id, role: "VICE_LEADER" }, { userId: students.binh!.id, role: "LEADER" },
      { userId: students.chi!.id, role: "VICE_LEADER" }, { userId: students.dung!.id, role: "MEMBER" }], revision + 3);
    expect(final.status).toBe(200);
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data)
      .toMatchObject({ issues: [], activeNameConflict: false });
  });

  it("9. A field hidden by ICPDP blocks submission until the student re-picks", async () => {
    const removed = await call(officer, "DELETE", `/admin/club-fields/${fields["Công nghệ"]}`);
    expect(removed.body.data).toEqual({ result: "deactivated" });
    const config = await call(students.an!, "GET", "/applications/config");
    expect(config.body.data.fields.map((field: { name: string }) => field.name)).not.toContain("Công nghệ");
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data.issues).toEqual(["fieldUnavailable"]);
    // Another draft cannot pick the hidden field.
    expect((await call(students.em!, "POST", "/applications", draftBody({ clubName: "Khác",
      founders: [{ userId: students.em!.id, role: "LEADER" }] }))).status).toBe(400);
    // Re-adding the name restores the same field (and its id).
    const restored = await call(officer, "POST", "/admin/club-fields", { name: "Công nghệ", sortOrder: 10 });
    expect(restored.body.data).toMatchObject({ id: fields["Công nghệ"], isActive: true });
    expect((await call(students.an!, "GET", `/applications/${mainId}/preview`)).body.data.issues).toEqual([]);
  });

  it("10. Submitting creates an immutable version; edits are blocked until ICPDP returns it", async () => {
    await ucmsModels.clubs!.create({ code: "CLB-DUP", name: "clb robotics fptu", field: "Công nghệ",
      state: "Active", createdAt: new Date() });
    const submitted = await call(students.an!, "POST", `/applications/${mainId}/submit`);
    expect(submitted.status).toBe(201);
    expect(submitted.body.data).toMatchObject({ activeNameConflict: true, version: { versionNo: 1 } });
    await ucmsModels.clubs!.deleteOne({ code: "CLB-DUP" });
    expect((await call(students.an!, "PATCH", `/applications/${mainId}/draft`, { ...draftBody(), draftRevision: 99 })).status).toBe(409);
    expect((await upload(students.an!, mainId, "LOGO", "l.png", "image/png", png)).status).toBe(409);
    expect((await call(students.an!, "POST", `/applications/${mainId}/submit`)).status).toBe(409);
    const version = await ucmsModels.clubApplicationVersions!.findOne({ applicationId: new Types.ObjectId(mainId) }).lean();
    expect(version?.foundingMembers).toHaveLength(4);
    expect((version?.proposedRoleStructure as { code: string }[]).map((role) => role.code))
      .toEqual(["CLUB_LEADER", "VICE_LEADER", "MEMBERS"]);
  });

  it("11. ICPDP review: students are kept out, claiming is exclusive, decision inputs are validated", async () => {
    expect((await call(students.an!, "GET", "/admin/application-reviews")).status).toBe(403);
    const queue = await call(officer, "GET", "/admin/application-reviews");
    expect(queue.body.data.map((item: { application: { id: string } }) => item.application.id)).toContain(mainId);
    const detail = await call(officer, "GET", `/admin/application-reviews/${mainId}`);
    expect(detail.body.data.founders.map((founder: { displayName: string }) => founder.displayName))
      .toEqual(["Nguyễn An", "Trần Bình", "Lê Chi", "Phạm Dũng"]);
    expect((await call(officer, "POST", `/admin/application-reviews/${mainId}/decision`,
      { outcome: "Approve", sections: [] })).status).toBe(409);
    expect((await call(officer, "POST", `/admin/application-reviews/${mainId}/claim`)).status).toBe(200);
    for (const bad of [
      { outcome: "Reject", sections: [] },
      { outcome: "Request revision", reason: "Bổ sung", sections: [] },
      { outcome: "Request revision", reason: "Bổ sung", sections: ["documents"] },
      { outcome: "Request revision", reason: "Bổ sung", sections: ["documents"], revisionDeadlineAt: "2000-01-01T00:00:00.000Z" },
      { outcome: "Approve", sections: [], revisionDeadlineAt: "2099-01-01T00:00:00.000Z" },
    ]) {
      expect((await call(officer, "POST", `/admin/application-reviews/${mainId}/decision`, bad)).status,
        JSON.stringify(bad)).toBe(400);
    }
    const proposal = detail.body.data.versions[0].snapshot.documents[0];
    expect((await call(officer, "GET", `/admin/application-reviews/${mainId}/documents/${proposal.id}/access`)).body.data)
      .toMatchObject({ fileName: "de-an.pdf", url: expect.stringContaining("https://files.test/") });
  });

  it("12. Revision request: the student sees the reason, not the internal note, then resubmits", async () => {
    const deadline = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const decided = await call(officer, "POST", `/admin/application-reviews/${mainId}/decision`, {
      outcome: "Request revision", reason: "Mục tiêu cần cụ thể hơn", sections: ["club-information"],
      reviewNote: "Ghi chú nội bộ", revisionDeadlineAt: deadline });
    expect(decided.status).toBe(200);
    const mine = await call(students.an!, "GET", `/applications/${mainId}`);
    expect(mine.body.data.application).toMatchObject({ state: "Revision Requested", revisionDeadlineAt: deadline });
    expect(mine.body.data.decisions).toEqual([{ outcome: "Request revision", reason: "Mục tiêu cần cụ thể hơn",
      sections: ["club-information"], decidedAt: expect.any(String) }]);
    expect(JSON.stringify(mine.body.data)).not.toContain("Ghi chú nội bộ");
    const revision = mine.body.data.application.draftRevision;
    const edited = await call(students.an!, "PATCH", `/applications/${mainId}/draft`, { ...draftBody({
      objectives: "Mỗi học kỳ thi đấu 1 giải robot", founders: mine.body.data.application.draft.founders }), draftRevision: revision });
    expect(edited.status).toBe(200);
    const resubmitted = await call(students.an!, "POST", `/applications/${mainId}/submit`);
    expect(resubmitted.body.data.version.versionNo).toBe(2);
  });

  it("13. Approval activates the club with the founding board and default permissions", async () => {
    const approved = await approve(mainId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.application.state).toBe("Approved");
    const app = await ucmsModels.clubApplications!.findById(mainId).lean();
    const clubId = String(app!.createdClubId);
    const club = await ucmsModels.clubs!.findById(clubId).lean();
    expect(club).toMatchObject({ name: "CLB Robotics FPTU", field: "Công nghệ", state: "Active",
      description: "Chế tạo robot", contactEmail: "robotics@e2e.edu",
      channels: [{ label: "Fanpage", url: "https://facebook.com/robotics" }] });
    expect(club!.logoUrl).toMatch(/^https:\/\/cdn\.test\//);
    // Everyone sees the club as Active and their workspace, permissions follow the role.
    function settings(who: Actor) { return call(who, "GET", `/clubs/${clubId}/settings`); }
    function nominate(who: Actor) { return call(who, "GET", `/clubs/${clubId}/board-nomination-context`); }
    expect((await settings(students.binh!)).status).toBe(200); // president
    expect((await nominate(students.binh!)).status).toBe(200);
    expect((await settings(students.an!)).status).toBe(403); // vice president cannot open settings
    expect((await nominate(students.an!)).status).toBe(403); // leader-only permission
    expect((await settings(students.chi!)).status).toBe(403);
    expect((await settings(students.dung!)).status).toBe(403); // plain members use the read-only role directory
    expect((await call(students.dung!, "PATCH", `/clubs/${clubId}/profile`,
      { channels: [] })).status).toBe(403); // editing remains restricted
    expect((await settings(students.em!)).status).toBe(403); // outsider
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(mainId),
      eventCode: "CLUB_APPLICATION_APPROVED" })).toBe(4);
    // Public discovery lists it under its field.
    const listed = await call(null, "GET", `/public/clubs?field=${encodeURIComponent("Công nghệ")}`);
    expect(JSON.stringify(listed.body.data)).toContain("CLB Robotics FPTU");
    // A decided review cannot be decided again.
    expect((await call(officer, "POST", `/admin/application-reviews/${mainId}/decision`,
      { outcome: "Approve", sections: [] })).status).toBe(409);
  });

  it("14. Renaming a field follows the club; deleting a used field only hides it", async () => {
    const renamed = await call(officer, "PATCH", `/admin/club-fields/${fields["Công nghệ"]}`,
      { name: "Công nghệ thông tin", sortOrder: 10 });
    expect(renamed.status).toBe(200);
    expect((await ucmsModels.clubs!.findOne({ name: "CLB Robotics FPTU" }).lean())?.field).toBe("Công nghệ thông tin");
    const usage = (await call(officer, "GET", "/admin/club-fields")).body.data
      .find((field: { id: string }) => field.id === fields["Công nghệ"]);
    expect(usage).toMatchObject({ clubCount: 1, applicationCount: 1 });
    await call(officer, "PATCH", `/admin/club-fields/${fields["Công nghệ"]}`, { name: "Công nghệ", sortOrder: 10 });
  });

  it("15. A president cannot lead a second club: blocked on preview, submit and approval", async () => {
    // Bình already leads Robotics: a new application naming Bình president is blocked up front.
    const blocked = await completeApplication(students.binh!, "CLB Cờ vua", [
      { userId: students.binh!.id, role: "LEADER" }, { userId: students.em!.id, role: "VICE_LEADER" },
      { userId: students.giang!.id, role: "MEMBER" }]);
    expect((await call(students.binh!, "GET", `/applications/${blocked}/preview`)).body.data.issues)
      .toEqual(["leaderHoldsAnotherClub"]);
    expect((await call(students.binh!, "POST", `/applications/${blocked}/submit`)).body.details.issues)
      .toEqual(["leaderHoldsAnotherClub"]);
    // Two applications naming the same new president both pass submission; only the first approval wins.
    const first = await completeApplication(students.em!, "CLB Nhiếp ảnh", [
      { userId: students.em!.id, role: "LEADER" }, { userId: students.giang!.id, role: "VICE_LEADER" },
      { userId: students.dung!.id, role: "MEMBER" }]);
    const second = await completeApplication(students.giang!, "CLB Guitar", [
      { userId: students.em!.id, role: "LEADER" }, { userId: students.giang!.id, role: "VICE_LEADER" },
      { userId: students.chi!.id, role: "MEMBER" }]);
    expect((await call(students.em!, "POST", `/applications/${first}/submit`)).status).toBe(201);
    expect((await call(students.giang!, "POST", `/applications/${second}/submit`)).status).toBe(201);
    expect((await approve(first)).status).toBe(200);
    const late = await approve(second);
    expect(late.status).toBe(409);
    expect(late.body.details).toEqual({ issues: ["leaderHoldsAnotherClub"] });
    expect(await ucmsModels.clubs!.countDocuments({ name: "CLB Guitar" })).toBe(0);
    // ICPDP can still return it so the students pick another president.
    const returned = await call(officer, "POST", `/admin/application-reviews/${second}/decision`, {
      outcome: "Request revision", reason: "Chủ nhiệm đã lãnh đạo CLB khác", sections: ["founders"],
      revisionDeadlineAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(returned.status).toBe(200);
  });

  it("16. Rejection and withdrawal end the application for good", async () => {
    const rejectedId = await completeApplication(students.chi!, "CLB Bị từ chối", [
      { userId: students.chi!.id, role: "LEADER" }, { userId: students.dung!.id, role: "VICE_LEADER" },
      { userId: students.giang!.id, role: "MEMBER" }]);
    await call(students.chi!, "POST", `/applications/${rejectedId}/submit`);
    await call(officer, "POST", `/admin/application-reviews/${rejectedId}/claim`);
    expect((await call(officer, "POST", `/admin/application-reviews/${rejectedId}/decision`,
      { outcome: "Reject", reason: "Trùng hoạt động với CLB hiện có", sections: [] })).status).toBe(200);
    expect((await call(students.chi!, "GET", `/applications/${rejectedId}`)).body.data.application.state).toBe("Rejected");
    expect((await call(students.chi!, "POST", `/applications/${rejectedId}/withdraw`)).status).toBe(409);
    expect((await call(students.chi!, "PATCH", `/applications/${rejectedId}/draft`, { ...draftBody(), draftRevision: 0 })).status).toBe(409);

    const withdrawnId = await completeApplication(students.dung!, "CLB Rút hồ sơ", [
      { userId: students.dung!.id, role: "LEADER" }, { userId: students.chi!.id, role: "VICE_LEADER" },
      { userId: students.giang!.id, role: "MEMBER" }]);
    // A draft that was never submitted cannot be withdrawn; a submitted one can, and leaves the queue.
    expect((await call(students.dung!, "POST", `/applications/${withdrawnId}/withdraw`)).status).toBe(409);
    await call(students.dung!, "POST", `/applications/${withdrawnId}/submit`);
    expect((await call(students.dung!, "POST", `/applications/${withdrawnId}/withdraw`)).body.data.state).toBe("Withdrawn");
    const queue = await call(officer, "GET", "/admin/application-reviews");
    expect(queue.body.data.map((item: { application: { id: string } }) => item.application.id)).not.toContain(withdrawnId);
  });

  it("17. Policy changes apply at submission: optional fields, minimum founders", async () => {
    const relaxed = await call(officer, "POST", "/admin/policies", policyBody({ minFoundingMembers: 2,
      formRequirements: { ...DEFAULT_FORM_REQUIREMENTS, clubFounding: { ...DEFAULT_FORM_REQUIREMENTS.clubFounding,
        summary: false, objectives: false, proposal: false, logo: false } } }));
    expect(relaxed.status).toBe(201);
    const owner = await signIn("hoa@e2e.edu", "Hoa");
    const peer = await signIn("khoa@e2e.edu", "Khoa");
    const created = await call(owner, "POST", "/applications", draftBody({ clubName: "CLB Tối giản", summary: "",
      objectives: "", fanpageUrl: "", contactEmail: "", fieldId: fields["Thể thao"],
      founders: [{ userId: owner.id, role: "LEADER" }, { userId: peer.id, role: "VICE_LEADER" }] }));
    expect((await call(owner, "GET", `/applications/${created.body.data.id}/preview`)).body.data.issues).toEqual([]);
    expect((await call(owner, "POST", `/applications/${created.body.data.id}/submit`)).status).toBe(201);
    // A stricter policy makes optional fields required for the next submission.
    await call(officer, "POST", "/admin/policies", policyBody({ formRequirements: { ...DEFAULT_FORM_REQUIREMENTS,
      clubFounding: { ...DEFAULT_FORM_REQUIREMENTS.clubFounding, fanpageUrl: true, contactEmail: true } } }));
    const strict = await call(owner, "POST", "/applications", draftBody({ clubName: "CLB Khắt khe", fanpageUrl: "",
      contactEmail: "", founders: [{ userId: owner.id, role: "LEADER" }, { userId: peer.id, role: "VICE_LEADER" }] }));
    expect((await call(owner, "GET", `/applications/${strict.body.data.id}/preview`)).body.data.issues)
      .toEqual(expect.arrayContaining(["fanpageUrl", "contactEmail", "proposal", "logo", "foundersTooFew"]));
  });

  it("18. Club profile edits follow the profile requirements in policy", async () => {
    const clubId = String((await ucmsModels.clubs!.findOne({ name: "CLB Robotics FPTU" }).lean())!._id);
    await call(officer, "POST", "/admin/policies", policyBody({ formRequirements: { ...DEFAULT_FORM_REQUIREMENTS,
      clubProfile: { ...DEFAULT_FORM_REQUIREMENTS.clubProfile, contactEmail: true, channels: true } } }));
    const settings = await call(students.binh!, "GET", `/clubs/${clubId}/settings`);
    expect(settings.body.data.requiredProfileFields).toMatchObject({ contactEmail: true, channels: true, description: false });
    const missing = await call(students.binh!, "PATCH", `/clubs/${clubId}/profile`, { description: "Robot", channels: [] });
    expect(missing.status).toBe(400);
    expect(missing.body.details).toEqual({ missing: ["contactEmail", "channels"] });
    const saved = await call(students.an!, "PATCH", `/clubs/${clubId}/profile`, { description: "Robot",
      contactEmail: "robot@e2e.edu", channels: [{ label: "Fanpage", url: "https://facebook.com/robotics" }] });
    expect(saved.status).toBe(200); // the vice president may edit the profile
  });
});
