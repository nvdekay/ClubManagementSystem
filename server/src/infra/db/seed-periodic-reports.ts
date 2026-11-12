// Summer 2026 periodic reports (UC38/UC39) for every Active club that has none yet, added on top of an
// existing demo database. Usage: npm run seed:periodic-reports -- --officer=<email> [--reserve=<email,email>]
// Only adds data and is safe to re-run: a club that already has a Summer 2026 report is left alone.
// The club side is written with the same operations as mongo-club-periodic-report-repository (create, save,
// submit) because these clubs have no leader who could pass its access check; the officer decision goes
// through the real UC39 use case. Both run on a past clock. No notification is queued for the submissions.
import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { normalizePeriodicDraft, type PeriodicDraftInput } from "../../domain/club-periodic-report.js";
import {
  periodicDueAt, periodicDueDays, type PeriodicAchievementEntry, type PeriodicEventEntry,
  type PeriodicMemberEntry, type ReturnSection,
} from "../../domain/periodic-report.js";
import { decidePeriodicReport } from "../../usecase/periodic-report.js";
import { loadConfig } from "../config/index.js";
import { openAccountabilityTask } from "./accountability-workflow.js";
import { mongoAuthRepository } from "./mongo-auth-repository.js";
import { findPeriodicCampaign, mongoPeriodicReportRepository, periodicLiveFigures, periodicSystemData } from "./mongo-periodic-report-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { studentEmail } from "./seed-email.js";
import { ucmsModels as m } from "./ucms-models.js";

const config = loadConfig();
const PERIOD = "Summer 2026";
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=").trim().toLowerCase()];
}));
const OFFICER_EMAIL = args.officer ?? "";
if (!OFFICER_EMAIL.includes("@")) {
  console.error("usage: npm run seed:periodic-reports -- --officer=<ICPDP officer email> [--reserve=<email,email>]");
  process.exit(1);
}
/** Accounts of real people: never recorded as the submitter of a seeded report. */
const REAL_ACCOUNTS = [OFFICER_EMAIL, ...(args.reserve ?? "").split(",").filter(Boolean)];
/** Left without a report so UC39 A1/E1 (overdue, record missing) stays demoable. */
const LEFT_OUT = ["FTTC", "FUSW"];
const DAY = 24 * 3_600_000;

type Outcome = "Accept" | "Submitted" | "Return" | "ReturnThenAccept";
interface Special {
  outcome: Outcome; late?: boolean; reason?: string; sections?: ReturnSection[];
  decidedAt?: string; resubmitDueAt?: string;
}
const specials: Record<string, Special> = {
  Chess: { outcome: "Submitted" },
  FC3: { outcome: "Submitted" },
  FTC: { outcome: "Submitted" },
  Yosakoi: { outcome: "Submitted", late: true },
  Business: { outcome: "Return", decidedAt: "2026-11-05T03:30:00Z", resubmitDueAt: "2026-11-26T16:59:59Z",
    sections: ["nextPlan", "evidence"],
    reason: "Kế hoạch kỳ Fall 2026 còn chung chung, chưa có mốc thời gian và người phụ trách từng hoạt động. "
      + "Buổi Talkshow Business #1 chưa có ảnh hoặc biên bản minh chứng. Đề nghị CLB bổ sung và nộp lại." },
  FCC: { outcome: "Return", late: true, decidedAt: "2026-11-09T02:15:00Z", resubmitDueAt: "2026-11-30T16:59:59Z",
    sections: ["members", "narrative"],
    reason: "Điểm hoạt động của thành viên chưa có căn cứ (đa số để 10/10). Báo cáo nộp sau hạn 07/09/2026 nên phần "
      + "tường thuật cần nêu rõ lý do nộp muộn. Đề nghị CLB bổ sung bảng chấm điểm hoạt động và nộp lại." },
  ESC: { outcome: "ReturnThenAccept" },
  FBC: { outcome: "ReturnThenAccept" },
  FMUC: { outcome: "Accept", late: true },
  "Soleil Crew": { outcome: "Accept", late: true },
};
const RETURN_FIRST = {
  sections: ["evidence"] as ReturnSection[],
  reason: "Thư mục Drive minh chứng đang để chế độ riêng tư nên ICPDP không mở được. Đề nghị CLB mở quyền xem và nộp lại.",
};
const observations = [
  "CLB hoạt động đều trong kỳ hè, đề nghị kỳ tới mở thêm hoạt động cho sinh viên ngoài CLB.",
  "Minh chứng đầy đủ, rõ ràng. Lưu ý quyết toán kinh phí đúng hạn trong kỳ Fall 2026.",
  "Số lượt tham gia tốt so với quy mô CLB; ghi nhận cho kỳ đánh giá.",
];

// ── Content: real club names and fields from the database, varied per club ──
interface Activity { title: string; description: string }
const fieldActivities: Record<string, Activity[]> = {
  "Công nghệ": [
    { title: "Workshop Git & GitHub cho người mới", description: "Hướng dẫn quản lý mã nguồn, tạo pull request và làm việc nhóm trên GitHub." },
    { title: "Coding Dojo mùa hè", description: "Các nhóm giải bài toán lập trình theo cặp trong 3 giờ, mentor là thành viên khóa trên." },
    { title: "Tech Talk: Lộ trình thực tập ngành IT", description: "Cựu thành viên chia sẻ kinh nghiệm phỏng vấn và thực tập tại doanh nghiệp phần mềm." },
    { title: "Mini Hackathon 12 giờ", description: "Các đội xây dựng sản phẩm nhỏ phục vụ sinh viên trong 12 giờ, ban giám khảo là giảng viên bộ môn." },
  ],
  "Thể thao": [
    { title: "Giải giao hữu mùa hè", description: "Giải đấu nội bộ mở rộng cho sinh viên toàn trường, thi đấu vòng tròn tính điểm." },
    { title: "Buổi tập kỹ thuật cho thành viên mới", description: "Huấn luyện kỹ thuật cơ bản, khởi động và phòng tránh chấn thương." },
    { title: "Giao lưu với CLB trường bạn", description: "Buổi tập và thi đấu giao lưu cùng CLB của một trường đại học trong khu vực Hòa Lạc." },
  ],
  "Nghệ thuật": [
    { title: "Workshop nghệ thuật cho tân thành viên", description: "Buổi hướng dẫn kỹ năng cơ bản và giới thiệu các ban chuyên môn của CLB." },
    { title: "Showcase cuối kỳ hè", description: "Đêm trình diễn các tiết mục thành viên tập luyện trong kỳ, mở cửa cho sinh viên toàn trường." },
    { title: "Buổi sinh hoạt chuyên môn", description: "Các nhóm luyện tập, góp ý chéo và chuẩn bị tiết mục cho Ngày hội chào tân sinh viên." },
  ],
  "Ngôn ngữ": [
    { title: "Góc luyện nói hằng tuần", description: "Sinh hoạt theo chủ đề, mỗi nhóm 6–8 người luyện phản xạ giao tiếp cùng thành viên khóa trên." },
    { title: "Buổi ôn thi chứng chỉ", description: "Giải đề mẫu và chia sẻ kinh nghiệm làm bài thi chứng chỉ ngoại ngữ." },
    { title: "Ngày hội văn hóa", description: "Gian hàng ẩm thực, trò chơi dân gian và giới thiệu văn hóa bản xứ cho sinh viên." },
  ],
  "Kỹ năng": [
    { title: "Workshop kỹ năng thuyết trình", description: "Thực hành trình bày 3 phút trước nhóm và nhận góp ý từ diễn giả khách mời." },
    { title: "Talkshow định hướng nghề nghiệp", description: "Khách mời từ doanh nghiệp chia sẻ về kỹ năng cần có khi đi thực tập." },
    { title: "Training nội bộ: Quản lý dự án sự kiện", description: "Hướng dẫn lập kế hoạch, phân công và theo dõi tiến độ một sự kiện CLB." },
  ],
  "Cộng đồng": [
    { title: "Chủ nhật xanh", description: "Thu gom rác và trồng cây quanh khuôn viên trường cùng sinh viên tình nguyện." },
    { title: "Quyên góp sách vở cho trẻ em vùng cao", description: "Thu gom sách, vở và đồ dùng học tập, trao tặng điểm trường tại Hòa Bình." },
    { title: "Hiến máu nhân đạo mùa hè", description: "Phối hợp Viện Huyết học tổ chức điểm hiến máu tại sảnh tòa Alpha." },
  ],
};
/** Club-specific activities for the clubs whose PDP name says what they do. */
const clubActivities: Record<string, Activity[]> = {
  Blazie: [
    { title: "Workshop Hip-hop cơ bản", description: "4 buổi workshop vũ đạo Hip-hop cho sinh viên chưa từng nhảy, mỗi buổi 2 giờ." },
    { title: "Blazie Summer Showcase", description: "Đêm trình diễn các tiết mục dance cover và choreography của thành viên tại sảnh tòa Beta." },
  ],
  "Branché": [
    { title: "Buổi chụp lookbook Hè 2026", description: "Thành viên tự lên concept, phối đồ và chụp bộ ảnh thời trang mùa hè." },
    { title: "Workshop catwalk và tạo dáng", description: "Hướng dẫn kỹ năng catwalk, tạo dáng trước ống kính cho mẫu mới." },
  ],
  FBC: [
    { title: "Giải cầu lông giao hữu mùa hè", description: "Giải đơn và đôi nam nữ mở cho sinh viên toàn trường tại nhà thi đấu đa năng." },
    { title: "Lớp kỹ thuật cầu lông cho thành viên mới", description: "6 buổi tập cầm vợt, di chuyển và phát cầu do thành viên ban chuyên môn hướng dẫn." },
  ],
  FC3: [
    { title: "Workshop AWS Cloud Practitioner", description: "Giới thiệu các dịch vụ AWS cơ bản và ôn tập cho kỳ thi Cloud Practitioner." },
    { title: "Lab Docker & Kubernetes", description: "Thực hành đóng gói ứng dụng bằng Docker và triển khai lên cụm Kubernetes thử nghiệm." },
  ],
  FCC: [
    { title: "Góc luyện nói tiếng Trung", description: "Sinh hoạt hằng tuần theo chủ đề đời sống, luyện phát âm và phản xạ giao tiếp." },
    { title: "Lớp ôn thi HSK 3–4", description: "8 buổi ôn ngữ pháp và giải đề HSK cấp 3, 4 cho thành viên chuẩn bị thi chứng chỉ." },
  ],
  FPBC: [
    { title: "Lớp nhập môn Pickleball", description: "Giới thiệu luật chơi, cách cầm vợt và các cú đánh cơ bản cho người mới." },
    { title: "Giải Pickleball đôi nam nữ mùa hè", description: "Giải đấu mở rộng 16 cặp, thi đấu loại trực tiếp tại sân thể thao ngoài trời." },
  ],
  FRC: [
    { title: "Workshop lập trình Arduino", description: "Lập trình cảm biến và động cơ với Arduino Uno cho thành viên mới." },
    { title: "Chạy thử robot dò line", description: "Các nhóm hoàn thiện và chạy thử robot dò line trên sa bàn chuẩn bị cho mùa giải mới." },
  ],
  FTC: [
    { title: "Kiểm tra lên đai Taekwondo hè 2026", description: "Kỳ kiểm tra lên đai cho võ sinh từ đai trắng đến đai xanh, có HLV liên đoàn chấm thi." },
    { title: "Buổi tập quyền và đối kháng", description: "Tập bài quyền Taegeuk và đối kháng có giáp bảo hộ." },
  ],
  FUGym: [
    { title: "Lớp thể hình cơ bản cho tân sinh viên", description: "Hướng dẫn kỹ thuật squat, deadlift, bench press an toàn cho người mới tập." },
  ],
  HLRC: [
    { title: "Đêm nhạc Rock mùa hè", description: "4 ban nhạc của CLB biểu diễn các ca khúc rock Việt và quốc tế tại sân khấu ngoài trời." },
    { title: "Jam session hằng tuần", description: "Các thành viên ghép ban, tập luyện và góp ý cho nhau tại phòng tập nhạc." },
  ],
  JS: [
    { title: "Workshop tiếng Nhật chuyên ngành IT", description: "Từ vựng và mẫu câu thường dùng trong dự án phần mềm với khách hàng Nhật Bản." },
    { title: "Chia sẻ kinh nghiệm thực tập tại Nhật", description: "Hai cựu thành viên chia sẻ quá trình thực tập 6 tháng tại công ty phần mềm ở Tokyo." },
  ],
  MonStage: [
    { title: "Workshop dẫn chương trình sự kiện", description: "Kỹ năng cầm micro, xử lý tình huống và tương tác khán giả cho MC mới." },
    { title: "Cuộc thi thuyết trình \"Speak to Inspire\"", description: "Vòng chung kết 10 thí sinh, mỗi bài thuyết trình 5 phút trước hội đồng giám khảo." },
  ],
  iGo: [
    { title: "Mùa hè xanh tại Ba Vì", description: "Tình nguyện sửa sang lớp học và dạy hè cho học sinh tiểu học xã Ba Trại trong 5 ngày." },
    { title: "Quyên góp sách cho trẻ em vùng cao", description: "Thu gom hơn 600 cuốn sách và 200 bộ đồ dùng học tập gửi điểm trường tại Hà Giang." },
  ],
  Yosakoi: [
    { title: "Luyện tập Yosakoi cho Lễ hội Nhật Bản", description: "Tập đội hình và động tác Yosakoi với naruko cho tiết mục biểu diễn tập thể." },
    { title: "Biểu diễn Yosakoi tại Japan Festival", description: "Đội Yosakoi của CLB biểu diễn tại lễ hội giao lưu văn hóa Việt – Nhật ở Hà Nội." },
  ],
  "Soleil Crew": [
    { title: "Workshop choreography", description: "Thành viên tự biên đạo và dàn dựng một tiết mục ngắn dưới sự hướng dẫn của trưởng nhóm." },
    { title: "Soleil Dance Showcase", description: "Đêm trình diễn các tiết mục cover K-pop và hiện đại của các nhóm trong CLB." },
  ],
};
const achievementsByClub: Record<string, Activity[]> = {
  Blazie: [{ title: "Giải ba Vũ điệu tuổi trẻ Hà Nội 2026", description: "Tiết mục hiện đại của Blazie đạt giải ba trong 22 đội tham dự." }],
  FBC: [{ title: "Huy chương bạc đôi nam Giải cầu lông sinh viên Hòa Lạc", description: "Cặp đôi của CLB giành huy chương bạc nội dung đôi nam." }],
  FC3: [{ title: "8 thành viên đạt chứng chỉ AWS Cloud Practitioner", description: "Kết quả sau khóa ôn luyện 6 tuần do CLB tổ chức." }],
  FRC: [{ title: "Vào vòng chung kết Robocon Việt Nam 2026", description: "Đội robot của CLB lọt vào nhóm 16 đội mạnh nhất toàn quốc." }],
  FTC: [{ title: "2 huy chương đồng Giải Taekwondo sinh viên Hà Nội", description: "Hai võ sinh của CLB đạt huy chương đồng nội dung đối kháng." }],
  iGo: [{ title: "Bằng khen của Thành đoàn cho chiến dịch Mùa hè xanh", description: "Ghi nhận 5 ngày tình nguyện tại Ba Vì với 40 tình nguyện viên." }],
  MonStage: [{ title: "Quán quân MC tài năng sinh viên 2026", description: "Thành viên của CLB giành giải nhất cuộc thi MC dành cho sinh viên khu vực phía Bắc." }],
  JS: [{ title: "5 thành viên đỗ JLPT N3", description: "Kết quả kỳ thi tháng 7/2026 sau lớp ôn luyện do CLB tổ chức." }],
  FAIC: [{ title: "Giải khuyến khích AI Challenge sinh viên 2026", description: "Nhóm 3 thành viên đạt giải với mô hình nhận diện biển báo giao thông." }],
  ESC: [{ title: "Top 8 Giải tranh biện tiếng Anh sinh viên toàn quốc", description: "Đội tranh biện của CLB lọt vào tứ kết vòng chung kết." }],
  FEC: [{ title: "Giải nhì English Speaking Contest Hòa Lạc", description: "Thành viên CLB đạt giải nhì cuộc thi hùng biện tiếng Anh liên trường." }],
  Chess: [{ title: "Vô địch cờ nhanh đồng đội sinh viên Hà Nội", description: "Đội 4 kỳ thủ của CLB giành chức vô địch nội dung cờ nhanh 15 phút." }],
  Yosakoi: [{ title: "Giải Tinh thần đồng đội Japan Festival 2026", description: "Ban tổ chức trao giải cho đội Yosakoi có màn trình diễn tập thể đồng đều nhất." }],
};
const focusByField: Record<string, string> = {
  "Công nghệ": "nâng cao kỹ năng lập trình cho thành viên và chuẩn bị các dự án học thuật cho kỳ mới",
  "Thể thao": "duy trì lịch tập đều đặn, nâng cao thể lực và chuẩn bị lực lượng cho các giải đấu sinh viên",
  "Nghệ thuật": "luyện tập chuyên môn và dàn dựng tiết mục cho Ngày hội chào tân sinh viên K22",
  "Ngôn ngữ": "duy trì môi trường luyện ngoại ngữ cho thành viên và hỗ trợ ôn thi chứng chỉ",
  "Kỹ năng": "phát triển kỹ năng mềm cho thành viên và kết nối với doanh nghiệp",
  "Cộng đồng": "các hoạt động tình nguyện trong kỳ nghỉ hè và lan tỏa tinh thần sẻ chia trong sinh viên",
};
const difficulties = [
  "Do trùng lịch thi cuối kỳ, số buổi sinh hoạt trong tháng 8 giảm còn hai buổi.",
  "Phòng sinh hoạt thường kín lịch vào buổi tối nên CLB phải chuyển một số buổi sang cuối tuần.",
  "Nhiều thành viên đi thực tập trong kỳ hè nên ban chủ nhiệm phải phân công lại công việc.",
  "Kinh phí còn hạn chế nên CLB tự túc một phần đạo cụ và chi phí in ấn.",
  "Thời tiết mưa nhiều trong tháng 7 khiến hai buổi hoạt động ngoài trời phải dời lịch.",
];
const nextPlans: Record<string, string[]> = {
  "Công nghệ": ["Tuyển thành viên K22 (tháng 9–10)", "Mở lớp lập trình cơ bản 8 buổi cho tân thành viên", "Tham gia ít nhất một cuộc thi học thuật cấp thành phố"],
  "Thể thao": ["Tuyển thành viên K22 và tổ chức buổi tập thử", "Tổ chức giải đấu mở rộng chào tân sinh viên", "Cử đội tham dự giải thể thao sinh viên Hà Nội"],
  "Nghệ thuật": ["Tuyển thành viên K22 qua vòng casting", "Biểu diễn tại Ngày hội chào tân sinh viên", "Tổ chức showcase cuối kỳ Fall 2026"],
  "Ngôn ngữ": ["Tuyển thành viên K22", "Duy trì góc luyện nói hằng tuần", "Tổ chức ngày hội văn hóa vào tháng 11"],
  "Kỹ năng": ["Tuyển thành viên K22", "Tổ chức chuỗi 3 workshop kỹ năng cho tân sinh viên", "Kết nối 2 doanh nghiệp đồng hành"],
  "Cộng đồng": ["Tuyển tình nguyện viên K22", "Chương trình Trung thu cho trẻ em xã Thạch Hòa", "Chiến dịch Áo ấm mùa đông vào tháng 12"],
};
const surnames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương", "Lý"];
const middles = ["Văn", "Thị", "Minh", "Đức", "Thu", "Ngọc", "Quang", "Thanh", "Hải", "Khánh", "Phương", "Tuấn", "Gia", "Hoài"];
const givens = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hiếu", "Hùng", "Khoa", "Linh", "Long", "Mai", "Nam", "Ngân",
  "Phúc", "Quân", "Sơn", "Tâm", "Thảo", "Trang", "Tú", "Vy", "Yến", "Huyền", "Đạt", "Nhung"];

/** Deterministic per-club randomness, so a re-run would produce the same content. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)]!;
}
function between(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}
function driveId(r: () => number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  return `1${Array.from({ length: 32 }, () => pick(r, [...chars])).join("")}`;
}
function vnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} đồng`;
}
function at(day: string, r: () => number): Date {
  return new Date(`${day}T${String(between(r, 1, 11)).padStart(2, "0")}:${String(between(r, 0, 59)).padStart(2, "0")}:00Z`);
}
function addDays(date: Date, days: number, r: () => number): Date {
  return new Date(date.getTime() + days * DAY + between(r, 0, 5) * 3_600_000);
}

interface ClubInfo { id: Types.ObjectId; code: string; name: string; field: string; pdpUrl?: string }

function label(club: ClubInfo): string {
  return club.name === club.code ? `CLB ${club.name}` : club.name;
}

function manualMembers(club: ClubInfo, r: () => number, index: number): PeriodicMemberEntry[] {
  const count = between(r, 8, 14);
  const used = new Set<string>();
  const members: PeriodicMemberEntry[] = [];
  while (members.length < count) {
    const fullName = `${pick(r, surnames)} ${pick(r, middles)} ${pick(r, givens)}`;
    if (used.has(fullName)) continue;
    used.add(fullName);
    // 19xxxx: K19 student numbers, a range no seeded account uses.
    const studentNo = 190_000 + index * 100 + members.length + 1;
    members.push({ fullName, studentCode: `HE${studentNo}`, email: studentEmail(fullName, studentNo),
      activityScore: Math.round((6 + r() * 4) * 10) / 10, source: "MANUAL" });
  }
  return members.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
}

function manualEvents(club: ClubInfo, r: () => number): PeriodicEventEntry[] {
  const pool = [...(clubActivities[club.code] ?? []), ...(fieldActivities[club.field] ?? fieldActivities["Kỹ năng"]!)];
  const count = between(r, 2, 3);
  const days = ["2026-05-16", "2026-06-06", "2026-06-27", "2026-07-11", "2026-07-25", "2026-08-08"];
  const start = between(r, 0, days.length - count);
  return pool.slice(0, count).map((activity, i) => ({
    title: activity.title, description: activity.description, heldAt: days[start + i]!,
    participantCount: between(r, 18, 85), evidenceUrl: `https://drive.google.com/drive/folders/${driveId(r)}`,
    ...(r() < 0.5 ? { evidenceNote: "Ảnh hoạt động và danh sách điểm danh" } : {}), source: "MANUAL" as const,
  }));
}

function content(club: ClubInfo, r: () => number, members: PeriodicMemberEntry[], events: PeriodicEventEntry[],
  finance: { approvedTotal: number; disbursedTotal: number }): PeriodicDraftInput {
  const total = events.reduce((sum, event) => sum + event.participantCount, 0);
  const top = [...events].sort((a, b) => b.participantCount - a.participantCount)[0];
  const achievements: PeriodicAchievementEntry[] = (achievementsByClub[club.code] ?? []).map((item) => ({
    ...item, evidenceUrl: `https://drive.google.com/file/d/${driveId(r)}/view`, evidenceNote: "Giấy chứng nhận / quyết định khen thưởng",
  }));
  const financeText = finance.approvedTotal
    ? `Trong kỳ CLB được duyệt ${vnd(finance.approvedTotal)} kinh phí hoạt động, đã giải ngân ${vnd(finance.disbursedTotal)}; phần còn lại sẽ quyết toán trong tháng 9.`
    : "CLB không sử dụng kinh phí từ Nhà trường trong kỳ này; chi phí nhỏ do thành viên tự đóng góp.";
  const narrative = [
    `Trong học kỳ ${PERIOD}, ${label(club)} tập trung vào ${focusByField[club.field] ?? focusByField["Kỹ năng"]}.`,
    `CLB tổ chức ${events.length} hoạt động với tổng cộng ${total} lượt sinh viên tham gia`
      + (top ? `, nổi bật là "${top.title}" với ${top.participantCount} người tham dự.` : "."),
    `Hiện CLB có ${members.length} thành viên hoạt động thường xuyên.`,
    achievements.length ? `CLB đạt thành tích: ${achievements.map((item) => item.title).join("; ")}.` : "",
    pick(r, difficulties),
    financeText,
  ].filter(Boolean).join(" ");
  const plans = nextPlans[club.field] ?? nextPlans["Kỹ năng"]!;
  const nextPlan = `Kế hoạch kỳ Fall 2026: ${plans.map((item, i) => `(${i + 1}) ${item}`).join("; ")}.`;
  return {
    narrative, nextPlan,
    evidence: [
      ...(club.pdpUrl ? [{ note: "Trang giới thiệu CLB trên PDP", url: club.pdpUrl }] : []),
      { note: `Thư mục ảnh và biên bản các hoạt động ${PERIOD}`, url: `https://drive.google.com/drive/folders/${driveId(r)}` },
      { note: "Bảng chấm điểm hoạt động thành viên", url: `https://docs.google.com/spreadsheets/d/${driveId(r)}/edit` },
    ],
    members, events, achievements, customAnswers: [],
  };
}

// ── Writes: the same operations as mongo-club-periodic-report-repository ──
async function audit(session: ClientSession, id: Types.ObjectId, action: string, userId: Types.ObjectId | undefined,
  after: unknown, now: Date) {
  await m.auditLogs!.create([{ entityType: "PeriodicReport", entityId: id, action, ...(userId ? { actorId: userId } : {}),
    actorRole: "Club Leader", after, correlationId: randomUUID(), at: now }], { session });
}

async function createDraft(session: ClientSession, club: ClubInfo, dueAt: Date, user: Types.ObjectId | undefined, now: Date) {
  const id = new Types.ObjectId();
  const systemData = await periodicSystemData(club.id, PERIOD, session);
  await m.periodicReports!.create([{ _id: id, clubId: club.id, periodCode: PERIOD, periodType: "SEMESTER", dueAt,
    state: "Draft", versionNo: 1, preloadedFigures: { systemData }, narrative: "", nextPlan: "", evidence: [] }], { session });
  await audit(session, id, "PERIODIC_REPORT_CREATED", user, { periodCode: PERIOD }, now);
  return id;
}

async function saveDraft(session: ClientSession, id: Types.ObjectId, raw: PeriodicDraftInput, user: Types.ObjectId | undefined, now: Date) {
  const input = normalizePeriodicDraft(raw);
  const report = await m.periodicReports!.findById(id).session(session).lean();
  const revision = Number(report!.__v ?? 0);
  const existingPreloaded = (report!.preloadedFigures ?? {}) as Record<string, unknown>;
  await m.periodicReports!.updateOne({ _id: id }, {
    $set: { narrative: input.narrative ?? "", nextPlan: input.nextPlan ?? "", evidence: input.evidence ?? [],
      preloadedFigures: { ...existingPreloaded, clubData: { ...(existingPreloaded.clubData as object | undefined),
        members: input.members, events: input.events, achievements: input.achievements, customAnswers: input.customAnswers } } },
    $inc: { __v: 1 },
  }, { session });
  await audit(session, id, "PERIODIC_REPORT_DRAFT_SAVED", user, { revision: revision + 1 }, now);
}

async function submit(session: ClientSession, id: Types.ObjectId, club: ClubInfo, user: Types.ObjectId | undefined,
  finance: { budgets: number; approvedTotal: number; disbursedTotal: number }, now: Date) {
  const report = (await m.periodicReports!.findById(id).session(session).lean())!;
  const clubData = ((report.preloadedFigures ?? {}) as Record<string, PeriodicDraftInput>).clubData!;
  const input = normalizePeriodicDraft({ narrative: String(report.narrative ?? ""), nextPlan: String(report.nextPlan ?? ""),
    evidence: (report.evidence ?? []) as { note?: string; url?: string }[], members: clubData.members ?? [],
    events: clubData.events ?? [], achievements: clubData.achievements ?? [], customAnswers: clubData.customAnswers ?? [] }, true);
  const [liveFigures, systemData] = await Promise.all([
    periodicLiveFigures(club.id, PERIOD, session), periodicSystemData(club.id, PERIOD, session)]);
  // ponytail: finance is the club's declared figure, not computed from eventBudgets (no Summer 2026 budgets exist).
  const preloadedFigures = { ...liveFigures, finance, capturedAt: now, systemData,
    clubData: { members: input.members, events: input.events, achievements: input.achievements, customAnswers: input.customAnswers } };
  const versionNo = Number(report.versionNo ?? 1) + (report.submittedAt ? 1 : 0);
  await m.periodicReports!.updateOne({ _id: id }, {
    $set: { narrative: input.narrative ?? "", nextPlan: input.nextPlan ?? "", evidence: input.evidence ?? [], versionNo,
      preloadedFigures, submittedAt: now, state: "Submitted", ...(user ? { submittedBy: user } : {}),
      lateFlag: now > (report.dueAt as Date) },
    $inc: { __v: 1 },
    $unset: { decisionOutcome: "", observation: "", decidedAt: "", decidedBy: "" },
  }, { session });
  await openAccountabilityTask(session, "PERIODIC_REPORT", id, club.id, `Periodic report ${PERIOD}`, now);
  await audit(session, id, "PERIODIC_REPORT_SUBMITTED", user, { snapshot: { ...input, versionNo, preloadedFigures, submittedAt: now } }, now);
}

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  const officer = await m.users!.findOne({ email: OFFICER_EMAIL }).select("_id").lean();
  if (!officer) throw new Error(`${OFFICER_EMAIL} not found in this database`);
  const officerActor = { id: String(officer._id), accountState: "Active" as const };
  const policy = mongoPolicyRepository();
  const decisionDeps = { repo: mongoPeriodicReportRepository(), policy, auth: mongoAuthRepository("*") };

  const effective = await policy.findEffective(new Date());
  const period = effective?.academicCalendar.find((item) => item.code === PERIOD);
  if (!period) throw new Error(`${PERIOD} is not in the effective academic calendar`);
  const campaign = await findPeriodicCampaign(PERIOD);
  const dueAt = campaign?.dueAt ?? periodicDueAt(period, periodicDueDays(effective?.reportDeadlines));

  const reserved = new Set((await m.users!.find({ email: { $in: REAL_ACCOUNTS } }).select("_id").lean()).map((u) => String(u._id)));
  const reported = new Set((await m.periodicReports!.find({ periodCode: PERIOD }).select("clubId").lean()).map((r) => String(r.clubId)));
  const clubs = await m.clubs!.find({ state: "Active", code: { $nin: LEFT_OUT } }).sort({ code: 1 }).lean();
  const added: Record<string, string[]> = {};
  let index = 0;
  for (const doc of clubs) {
    index += 1;
    if (reported.has(String(doc._id))) continue;
    const channels = (doc.channels ?? {}) as { pdp?: string };
    const club: ClubInfo = { id: doc._id as Types.ObjectId, code: String(doc.code), name: String(doc.name),
      field: String(doc.field ?? "Kỹ năng"), ...(channels.pdp ? { pdpUrl: channels.pdp } : {}) };
    const r = rng(`${PERIOD}:${club.code}`);
    const special = specials[club.code] ?? { outcome: "Accept" };

    // Members and events: the system's own lists when the club has them (as the editor pre-fills), typed in otherwise.
    const system = await periodicSystemData(club.id, PERIOD);
    const submitter = system.members.find((member) => member.userId && !reserved.has(member.userId));
    const user = submitter?.userId ? new Types.ObjectId(submitter.userId) : undefined;
    const members = system.members.length
      ? system.members.map((member) => ({ ...member, activityScore: Math.round((6 + r() * 4) * 10) / 10 }))
      : manualMembers(club, r, index);
    if (club.code === "FCC") for (const member of members) member.activityScore = 10;
    const events = system.events.length
      ? system.events.map((event) => ({ ...event, participantCount: event.participantCount || between(r, 30, 60),
        evidenceUrl: `https://drive.google.com/drive/folders/${driveId(r)}` }))
      : manualEvents(club, r);
    const budgets = r() < 0.25 ? 0 : between(r, 1, 3);
    const approvedTotal = budgets * between(r, 15, 35) * 100_000;
    const finance = { budgets, approvedTotal, disbursedTotal: Math.round(approvedTotal * (0.75 + r() * 0.25) / 100_000) * 100_000 };
    const input = content(club, r, members, events, finance);

    // Clock: drafted in late August, submitted before the due date (or a few days after it when late).
    const twice = special.outcome === "ReturnThenAccept";
    const submittedAt = twice ? at("2026-08-27", r)
      : special.late ? at(`2026-09-${String(between(r, 9, 14)).padStart(2, "0")}`, r)
      : at(`2026-${pick(r, ["08-28", "08-31", "09-02", "09-04", "09-05", "09-06"])}`, r);
    const createdAt = new Date(submittedAt.getTime() - between(r, 6, 12) * DAY);
    const savedAt = new Date(submittedAt.getTime() - between(r, 1, 4) * DAY);

    let id!: Types.ObjectId;
    await mongoose.connection.transaction(async (session) => {
      id = await createDraft(session, club, dueAt, user, createdAt);
      await saveDraft(session, id, input, user, savedAt);
      await submit(session, id, club, user, finance, submittedAt);
    });
    async function decide(decision: Parameters<typeof decidePeriodicReport>[3], now: Date) {
      await decidePeriodicReport(decisionDeps, officerActor, String(id), decision, now);
    }

    if (twice) {
      await decide({ outcome: "Return", reason: RETURN_FIRST.reason, sections: RETURN_FIRST.sections }, addDays(submittedAt, 4, r));
      const resubmittedAt = at("2026-09-04", r);
      const fixed = { ...input, evidence: input.evidence!.map((item) => item.url?.includes("/folders/")
        ? { note: `${item.note} (đã mở quyền xem)`, url: `https://drive.google.com/drive/folders/${driveId(r)}` } : item) };
      await mongoose.connection.transaction(async (session) => {
        await saveDraft(session, id, fixed, user, new Date(resubmittedAt.getTime() - 3 * 3_600_000));
        await submit(session, id, club, user, finance, resubmittedAt);
      });
      await decide({ outcome: "Accept" }, addDays(resubmittedAt, 5, r));
    } else if (special.outcome === "Accept") {
      const observation = r() < 0.3 ? pick(r, observations.filter((note) => budgets || !note.includes("kinh phí"))) : undefined;
      await decide({ outcome: "Accept", ...(observation ? { observation } : {}) }, addDays(submittedAt, between(r, 3, 12), r));
    } else if (special.outcome === "Return") {
      await decide({ outcome: "Return", reason: special.reason, sections: special.sections,
        resubmitDueAt: new Date(special.resubmitDueAt!) }, new Date(special.decidedAt!));
    }
    const state = String((await m.periodicReports!.findById(id).select("state").lean())!.state);
    (added[state] ??= []).push(`${String(id)}  ${club.code}${special.late ? " (late)" : ""}${twice ? " (v2)" : ""}`);
  }

  const total = Object.values(added).reduce((sum, list) => sum + list.length, 0);
  console.log(`${PERIOD} periodic reports: ${total} added`);
  for (const [state, list] of Object.entries(added)) console.log(`  ${state} (${list.length}):\n    ${list.join("\n    ")}`);
} catch (error) {
  console.error("periodic report seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
