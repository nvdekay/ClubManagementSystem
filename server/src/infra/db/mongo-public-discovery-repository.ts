import { Types } from "mongoose";
import type {
  ClubSearch, Page, PublicBoardSeat, PublicCampaign, PublicClub,
  PublicDiscoveryRepository, PublicEvent,
} from "../../domain/public-discovery.js";
import { ucmsModels } from "./ucms-models.js";

const clubStates = ["Active", "Suspended"];
const campaignStates = ["Published", "Accepting Applications"];
const historyStates = ["Completed", "Report Submitted", "Closed"];

// Chuyển id thành chuỗi
function id(value: unknown): string { return String(value); }
// Ép giá trị đọc từ DB về Date, lỗi nếu không phải ngày hợp lệ
function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid public date in database");
  return value;
}
// Lấy giá trị nếu là chuỗi, ngược lại undefined
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
// Lấy giá trị nếu là Date, ngược lại undefined
function optionalDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}
// Escape ký tự đặc biệt của regex trong từ khoá tìm kiếm
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}
// Ánh xạ document CLB sang PublicClub
function mapClub(doc: Record<string, unknown>): PublicClub {
  return {
    id: id(doc._id), code: String(doc.code), name: String(doc.name),
    field: String(doc.field), state: String(doc.state),
    description: optionalString(doc.description),
    contactEmail: optionalString(doc.contactEmail),
    contactPhone: optionalString(doc.contactPhone),
    operatingScope: optionalString(doc.operatingScope),
    logoUrl: optionalString(doc.logoUrl),
  };
}
// Ánh xạ document sự kiện sang PublicEvent
function mapEvent(doc: Record<string, unknown>): PublicEvent {
  return {
    id: id(doc._id), ...(doc.clubId ? { clubId: id(doc.clubId) } : {}), clubName: String(doc.clubName ?? ""),
    title: String(doc.title), startAt: date(doc.startAt), endAt: date(doc.endAt),
    venueText: optionalString(doc.venueText), objective: optionalString(doc.objective),
    coverImageUrl: optionalString(doc.coverImageUrl), capacity: Number(doc.capacity),
    state: String(doc.state), audienceScope: String(doc.audienceScope),
    publishedAt: optionalDate(doc.publishedAt),
  };
}
// Ánh xạ document đợt tuyển sang PublicCampaign
function mapCampaign(doc: Record<string, unknown>): PublicCampaign {
  return {
    id: id(doc._id), title: String(doc.title), state: String(doc.state),
    windowStart: date(doc.windowStart), windowEnd: date(doc.windowEnd),
    capacity: Number(doc.capacity),
  };
}
// Ánh xạ đợt tuyển kèm các bước tuyển chọn và form ứng tuyển
function mapCampaignDetail(doc: Record<string, unknown>): PublicCampaign {
  const item = mapCampaign(doc);
  const steps = Array.isArray(doc.selectionSteps) ? doc.selectionSteps : [];
  const fields = Array.isArray(doc.formSchema) ? doc.formSchema : [];
  const rubric = Array.isArray(doc.rubric) ? doc.rubric : [];
  return {
    ...item, clubId: id(doc.clubId),
    positions: Array.isArray(doc.positions) ? doc.positions.filter((value): value is string =>
      typeof value === "string") : [],
    ...(typeof doc.criteria === "string" ? { criteria: doc.criteria } : {}),
    selectionSteps: steps.flatMap((value) => value && typeof value === "object"
      && typeof (value as { name?: unknown }).name === "string" ? [value as {
        name: string; description?: string; startsAt?: Date; endsAt?: Date;
      }] : []),
    formSchema: fields.flatMap((value) => value && typeof value === "object"
      && typeof (value as { key?: unknown }).key === "string"
      && typeof (value as { label?: unknown }).label === "string"
      && typeof (value as { type?: unknown }).type === "string" ? [value as {
        key: string; label: string; type: string; required: boolean; options?: string[];
      }] : []),
    rubric: rubric.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const criterion = value as { key?: unknown; label?: unknown; maxScore?: unknown };
      return typeof criterion.key === "string" && typeof criterion.label === "string"
        && typeof criterion.maxScore === "number"
        ? [{ key: criterion.key, label: criterion.label, maxScore: criterion.maxScore }] : [];
    }),
  };
}

// Repository khu công khai: CLB, sự kiện, đợt tuyển cho khách
export function mongoPublicDiscoveryRepository(): PublicDiscoveryRepository {
  const clubs = ucmsModels.clubs!;
  const events = ucmsModels.events!;
  const campaigns = ucmsModels.recruitmentCampaigns!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const memberships = ucmsModels.clubMemberships!;
  const users = ucmsModels.users!;
  return {
    // Tìm kiếm và phân trang danh sách CLB công khai
    async listClubs(input: ClubSearch, now: Date): Promise<Page<PublicClub>> {
      const filter: Record<string, unknown> = { state: input.newestActive ? "Active" : { $in: clubStates } };
      if (input.field) filter.field = input.field;
      if (input.search) {
        const search = new RegExp(escapeRegex(input.search), "i");
        filter.$or = [{ name: search }, { code: search }, { description: search }];
      }
      const [docs, total] = await Promise.all([
        clubs.find(filter).sort(input.newestActive ? { createdAt: -1, _id: -1 } : { name: 1, _id: 1 })
          .skip((input.page - 1) * input.pageSize).limit(input.pageSize).lean(),
        clubs.countDocuments(filter),
      ]);
      const activeClubIds = docs.filter((club) => club.state === "Active").map((club) => club._id);
      const openCampaigns = activeClubIds.length ? await campaigns.find({
        clubId: { $in: activeClubIds }, state: { $in: campaignStates },
        windowStart: { $lte: now }, windowEnd: { $gt: now },
      }).sort({ windowStart: 1, _id: 1 }).select("_id clubId").lean() : [];
      const campaignByClub = new Map<string, string>();
      for (const campaign of openCampaigns) {
        const clubId = id(campaign.clubId);
        if (!campaignByClub.has(clubId)) campaignByClub.set(clubId, id(campaign._id));
      }
      return {
        items: docs.map((doc) => ({
          ...mapClub(doc),
          ...(campaignByClub.has(id(doc._id))
            ? { openCampaignId: campaignByClub.get(id(doc._id)) } : {}),
        })),
        total, page: input.page, pageSize: input.pageSize,
      };
    },
    // Danh sách lĩnh vực của các CLB công khai
    async fields(): Promise<string[]> {
      const values = await clubs.distinct("field", { state: { $in: clubStates } });
      return values.filter((value): value is string => typeof value === "string").sort();
    },
    // Lấy thông tin công khai của một CLB
    async getClub(clubId): Promise<PublicClub | null> {
      const doc = await clubs.findById(new Types.ObjectId(clubId)).lean();
      return doc ? mapClub(doc) : null;
    },
    // Lấy các ghế ban chủ nhiệm hiện tại của CLB
    async board(clubId, now): Promise<PublicBoardSeat[]> {
      const clubObjectId = new Types.ObjectId(clubId);
      const [termDocs, positionDocs] = await Promise.all([
        terms.find({
          clubId: clubObjectId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now },
        }).lean(),
        positions.find({ clubId: clubObjectId, isBoardSeat: true, isActive: true }).lean(),
      ]);
      if (!termDocs.length || !positionDocs.length) return [];
      const termById = new Map(termDocs.map((term) => [id(term._id), String(term.name)]));
      const positionById = new Map(positionDocs.map((position) => [id(position._id), String(position.name)]));
      const assignmentDocs = await assignments.find({
        clubId: clubObjectId,
        termId: { $in: termDocs.map((term) => term._id) },
        positionId: { $in: positionDocs.map((position) => position._id) },
        confirmedBy: { $exists: true, $ne: null },
        effectiveFrom: { $lte: now },
        $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gt: now } }],
      }).lean();
      const memberDocs = await memberships.find({
        _id: { $in: assignmentDocs.map((assignment) => assignment.membershipId) },
        clubId: clubObjectId, state: "Active",
      }).lean();
      const memberById = new Map(memberDocs.map((member) => [id(member._id), member]));
      const userDocs = await users.find({
        _id: { $in: memberDocs.map((member) => member.userId) },
      }).select("_id displayName").lean();
      const nameById = new Map(userDocs.map((user) => [id(user._id), String(user.displayName)]));
      return assignmentDocs.flatMap((assignment) => {
        const member = memberById.get(id(assignment.membershipId));
        const memberName = member ? nameById.get(id(member.userId)) : undefined;
        const positionName = positionById.get(id(assignment.positionId));
        const termName = termById.get(id(assignment.termId));
        return memberName && positionName && termName
          ? [{ memberName, positionName, termName }] : [];
      });
    },
    // Liệt kê đợt tuyển đang mở của CLB
    async campaigns(clubId, now): Promise<PublicCampaign[]> {
      const docs = await campaigns.find({
        clubId: new Types.ObjectId(clubId), state: { $in: campaignStates },
        windowStart: { $lte: now }, windowEnd: { $gt: now },
      }).sort({ windowStart: 1, _id: 1 }).limit(20).lean();
      return docs.map(mapCampaign);
    },
    // Lấy chi tiết đợt tuyển đang mở
    async getCampaign(campaignId, now): Promise<PublicCampaign | null> {
      const doc = await campaigns.findOne({ _id: new Types.ObjectId(campaignId),
        state: { $in: campaignStates }, windowStart: { $lte: now }, windowEnd: { $gt: now } }).lean();
      if (!doc) return null;
      const club = await clubs.findById(doc.clubId).select("state").lean();
      // Chiến dịch của CLB bị đình chỉ vẫn hiển thị, có đánh dấu, để sinh viên biết vì sao không thể ứng tuyển.
      if (club?.state !== "Active" && club?.state !== "Suspended") return null;
      return { ...mapCampaignDetail(doc), clubSuspended: club.state === "Suspended" };
    },
    // Liệt kê sự kiện công khai sắp diễn ra của CLB
    async clubUpcomingEvents(clubId, now): Promise<PublicEvent[]> {
      const docs = await events.find({
        clubId: new Types.ObjectId(clubId), state: "Upcoming", audienceScope: "PUBLIC",
        publishedAt: { $exists: true, $ne: null }, startAt: { $gt: now },
      }).sort({ startAt: 1, _id: 1 }).limit(20).lean();
      return docs.map(mapEvent);
    },
    // Liệt kê lịch sử sự kiện công khai của CLB
    async clubHistory(clubId, now): Promise<PublicEvent[]> {
      const docs = await events.find({
        clubId: new Types.ObjectId(clubId), state: { $in: historyStates },
        audienceScope: "PUBLIC", publishedAt: { $exists: true, $ne: null },
        endAt: { $lte: now },
      }).sort({ endAt: -1, _id: -1 }).limit(20).lean();
      return docs.map(mapEvent);
    },
    // Tìm kiếm và phân trang sự kiện công khai theo trạng thái
    async listEvents({ status, search, page, pageSize }, now): Promise<Page<PublicEvent>> {
      const activeClubs = await clubs.find({ state: "Active" }).select("_id").lean();
      // Phản chiếu publicEventStatus(): mỗi nhánh là một trạng thái hiển thị cho khách.
      const byStatus = {
        upcoming: { state: "Upcoming", startAt: { $gt: now } },
        ongoing: { state: { $in: ["Upcoming", "Ongoing"] }, startAt: { $lte: now }, endAt: { $gt: now } },
        ended: { state: { $in: historyStates }, endAt: { $lte: now } },
      };
      const text = search ? new RegExp(escapeRegex(search), "i") : null;
      const filter = {
        $or: [{ clubId: { $in: activeClubs.map((club) => club._id) } }, { organizerType: "ICPDP" }],
        audienceScope: "PUBLIC", publishedAt: { $exists: true, $ne: null },
        $and: [
          status === "all" ? { $or: Object.values(byStatus) } : byStatus[status],
          ...(text ? [{ $or: [{ title: text }, { objective: text }, { venueText: text }, { clubName: text }] }] : []),
        ],
      };
      // Sắp tới thì sớm nhất trước; mọi chế độ xem khác hiển thị sự kiện mới nhất trước, như PDP.
      const sort = status === "upcoming" ? { startAt: 1 as const, _id: 1 as const } : { startAt: -1 as const, _id: -1 as const };
      const [docs, total] = await Promise.all([
        events.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
        events.countDocuments(filter),
      ]);
      return { items: docs.map(mapEvent), total, page, pageSize };
    },
    // Lấy thông tin công khai của một sự kiện
    async getEvent(eventId): Promise<PublicEvent | null> {
      const doc = await events.findById(new Types.ObjectId(eventId)).lean();
      return doc ? mapEvent(doc) : null;
    },
  };
}
