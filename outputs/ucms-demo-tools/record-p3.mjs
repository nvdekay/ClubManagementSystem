// Presenter 3: flow 5 (club events, UC25-UC34, UC48-UC49).
// Run after `stack.sh 3 reset`, `stack.sh 3 up` and `npm run seed:defense:p3`.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, openRecorder } from "./rec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "outputs/ucms-demo-flow-5");
const DB = "ucms_video_p3";
const BASE = "http://localhost:5183";
const CLUB = "CLB Sáng tạo Công nghệ FPTU";
const E = {
  git: "Workshop Git & GitHub cho người mới bắt đầu",
  mentoring: "Mentoring 1-1 cùng kỹ sư phần mềm",
  talk: "Talkshow: AI trong học tập và nghiên cứu",
  docker: "Workshop Docker cơ bản",
};

function mongo(expr) {
  return execFileSync("docker", ["exec", "clubmanagementsystem-mongo-1", "mongosh", "--quiet", DB, "--eval", expr]).toString().trim();
}
const clubId = mongo(`print(String(db.clubs.findOne({ name: ${JSON.stringify(CLUB)} })._id))`);
const gitId = mongo(`print(String(db.events.findOne({ title: ${JSON.stringify(E.git)} })._id))`);
const cookies = JSON.parse(execFileSync("node", ["--env-file=../.env", "--import", "tsx", "../outputs/ucms-demo-tools/mint-session.ts",
  "officer.demo@fpt.edu.vn", "an.demo@fpt.edu.vn", "chi.demo@fpt.edu.vn", "duy.demo@fpt.edu.vn"],
{ cwd: path.join(root, "server"), env: { ...process.env, MONGO_URI: `mongodb://127.0.0.1:27017/${DB}` } }).toString());
const officer = cookies["officer.demo@fpt.edu.vn"], leader = cookies["an.demo@fpt.edu.vn"];
const member = cookies["chi.demo@fpt.edu.vn"], student = cookies["duy.demo@fpt.edu.vn"];

const TOTAL = 9;
const rec = await openRecorder({ baseURL: BASE, outDir });
const chapters = { proposal: [], attend: [], report: [] };
let n = 0;
async function scene(chapter, meta, run) {
  n += 1;
  const badge = `${String(n).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")} · ${meta.role}`;
  // Captions hold ~38 ms per character: long enough to read, short enough to keep the flow near four minutes.
  chapters[chapter].push(await rec.scene({ ...meta, id: `${String(n).padStart(2, "0")}-${meta.id}`, badge }, (tools) =>
    run({ ...tools, say: (text, options = {}) => tools.say(text, { ms: Math.min(6000, 900 + text.length * 38), ...options }) })));
}
/** Scrolls an element to the upper part of the app frame, the way a presenter would. */
async function show(locator, pause) {
  await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  await pause(900);
}
let checkInCode = "";

try {
  // ── Chapter 1: proposal, review, publication ─────────────────────────────────────────────────
  await scene("proposal", { id: "resubmit", role: "CLUB LEADER", title: "Flow 5 · Nộp lại đề xuất",
    card: ["Flow 5 — Sự kiện CLB", "Club Leader · nộp lại đề xuất đã sửa"], cookie: leader, start: `/club/${clubId}/events` },
  async ({ app, say, click, pause }) => {
    await say("Em trình bày vòng đời sự kiện CLB, từ đề xuất đến điểm danh, phản hồi và báo cáo.");
    await click(app.getByRole("button", { name: E.git }));
    await pause(800);
    await say("ICPDP đã trả đề xuất này về để thêm phần thực hành và báo giá; em đã sửa đúng hai phần đó.");
    await say("Khi nộp, server kiểm tra CLB Active, lịch trong học kỳ, báo trước 7 ngày và xung đột địa điểm.");
    await click(app.getByRole("button", { name: "Nộp đề xuất" }), { after: 1500 });
    await app.locator("#club-event-detail").getByText("Chờ duyệt").first().waitFor();
    await show(app.locator("#club-event-detail"), pause);
    await say("Đề xuất chuyển Pending Approval; bản 2 được lưu cạnh bản 1 và lần trả sửa.");
  });

  await scene("proposal", { id: "review", role: "ICPDP OFFICER", title: "Flow 5 · Thẩm định đề xuất",
    card: ["ICPDP Officer", "Nhận thẩm định và phê duyệt đề xuất"], cookie: officer, start: "/workspace/event-proposals" },
  async ({ app, say, click, type, pause }) => {
    await say("Phía ICPDP, em nhận hồ sơ trong hàng đợi. Nhận xong, đề xuất chuyển Under Review.");
    await click(app.getByRole("listitem").filter({ hasText: E.git }).getByRole("button", { name: /Mở/ }), { after: 1800 });
    await app.getByText("Trạng thái: Đang duyệt").waitFor();
    await say("Em thấy ngay bản 2 khác bản 1 ở đâu, cạnh các phần đã yêu cầu sửa.");
    const budget = app.getByRole("heading", { name: "Kinh phí", exact: true }).first();
    await show(budget, pause);
    await say("CLB xin 1.200.000đ; em quyết định từng khoản, số duyệt lưu riêng với số xin.");
    const funding = app.getByLabel("Quyết định tài trợ");
    await click(funding, { after: 300 });
    await funding.selectOption({ label: "Tài trợ · Trả trước" });
    await pause(700);
    await type(app.getByLabel("Điều kiện kèm theo"), "Nộp danh sách điểm danh trong báo cáo sau sự kiện");
    await say("Em có thể yêu cầu sửa, từ chối hoặc phê duyệt. Nhà trường chỉ có một cấp duyệt.");
    await click(app.getByRole("button", { name: "Lưu quyết định" }));
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Trạng thái: Đã duyệt").waitFor();
    await show(app.getByText("Trạng thái: Đã duyệt"), pause);
    await say("Đề xuất Approved; điều kiện kèm theo sẽ được đối chiếu khi CLB báo cáo.");
  });

  await scene("proposal", { id: "publish", role: "CLUB LEADER", title: "Flow 5 · Công bố sự kiện",
    card: ["Club Leader", "Công bố sự kiện đã được duyệt"], cookie: leader, start: `/club/${clubId}/events?event=${gitId}` },
  async ({ app, say, click, pause }) => {
    await app.getByRole("button", { name: "Công bố" }).waitFor();
    await show(app.locator("#club-event-detail"), pause);
    await say("Được duyệt rồi em mới công bố. Lúc này CLB đặt khung đăng ký và khung check-in.");
    await click(app.getByRole("button", { name: "Công bố" }), { after: 1200 });
    await say("Đăng ký mở đến giờ bắt đầu, check-in theo giờ diễn ra, bật danh sách chờ.");
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Mã check-in:").first().waitFor();
    await say("Sự kiện chuyển Upcoming và có mã check-in; công bố không gửi thông báo hàng loạt.");
  });

  // ── Chapter 2: registration, waitlist, check-in, feedback ────────────────────────────────────
  await scene("attend", { id: "register", role: "STUDENT", title: "Flow 5 · Đăng ký tham gia",
    card: ["Student", "Đăng ký sự kiện vừa công bố"], cookie: student, start: `/events/${gitId}` },
  async ({ app, say, click, pause }) => {
    const panel = app.locator('section[aria-labelledby="event-registration-title"]');
    await panel.getByRole("button", { name: "Đăng ký", exact: true }).waitFor();
    await say("Em là sinh viên. Trang sự kiện hiện số chỗ còn lại và thời gian đăng ký.");
    await show(panel, pause);
    await click(panel.getByRole("button", { name: "Đăng ký", exact: true }), { after: 1500 });
    await panel.getByText("Bạn đã đăng ký").waitFor();
    await say("Còn chỗ nên em nhận Confirmed; hết chỗ thì sẽ vào Waitlisted.");
    await app.goto(`${BASE}/workspace/event-registrations`);
    await app.getByRole("listitem").filter({ hasText: E.git }).waitFor();
    await pause(800);
    await say("Đăng ký chỉ là dự định; check-in tại sự kiện mới ghi nhận có mặt.");
  });

  await scene("attend", { id: "waitlist", role: "CLUB MEMBER", title: "Flow 5 · Danh sách chờ và điểm danh",
    card: ["Club Member", "Theo dõi đăng ký, danh sách chờ và check-in"], cookie: member, start: `/club/${clubId}/event-attendance` },
  async ({ app, say, click, pause }) => {
    await say("Em là thành viên Active: được quản lý đăng ký, điểm danh, nhưng không sửa đề xuất.");
    await click(app.getByRole("button", { name: E.mentoring }), { after: 1500 });
    await app.getByText("Danh sách chờ #2").waitFor();
    await say("Buổi mentoring đủ 4/4 chỗ; hai bạn sau vào danh sách chờ theo thứ tự #1, #2.");
    await say("Có suất trống thì chỉ người đầu danh sách được đẩy lên, không chọn tuỳ ý.");
    await show(app.getByRole("table").first(), pause);
    await click(app.getByRole("button", { name: E.talk }), { after: 1500 });
    const code = app.locator("p", { hasText: "Mã check-in:" }).locator("strong");
    await code.waitFor();
    checkInCode = (await code.textContent()).trim();
    await say("Talkshow đang diễn ra, 3/5 người đã check-in; mã được đưa ra tại địa điểm.");
  });

  await scene("attend", { id: "checkin-feedback", role: "STUDENT", title: "Flow 5 · Check-in và phản hồi",
    card: ["Student", "Check-in tại sự kiện và gửi phản hồi"], cookie: student, start: "/workspace/event-registrations" },
  async ({ app, say, click, type, pause }) => {
    const row = app.getByRole("listitem").filter({ hasText: E.talk });
    await say("Đến talkshow, em nhập mã check-in trong khung giờ CLB đã đặt khi công bố.");
    await click(row.getByRole("button", { name: "Check-in" }), { after: 600 });
    await type(app.getByLabel("Mã check-in"), checkInCode, { delay: 120 });
    await click(app.locator("form").getByRole("button", { name: "Check-in" }), { after: 1500 });
    await app.getByText("Bạn đã check-in. Phản hồi đã được mở.").waitFor();
    await say("Hệ thống ghi một lần có mặt; check-in lại chỉ trả về bản ghi đầu.");
    await click(app.getByRole("button", { name: /^Đã check-in/ }), { after: 1000 });
    const attended = app.getByRole("listitem").filter({ hasText: E.talk });
    await click(attended.getByRole("button", { name: "Gửi phản hồi" }), { after: 800 });
    await say("Check-in xong là mở phản hồi: điểm 1–5 sao kèm nhận xét.");
    await click(app.getByTitle("5 sao"), { after: 500 });
    await type(app.getByLabel("Nhận xét của bạn"), "Diễn giả chia sẻ thực tế, phần liêm chính học thuật rất cần thiết.", { delay: 22 });
    await click(app.locator("form").getByRole("button", { name: "Gửi phản hồi" }), { after: 1500 });
    await app.getByText("Cảm ơn bạn — phản hồi đã được gửi.").waitFor();
    await say("Phản hồi gửi một lần, không sửa hay xoá; đây là góp ý, không phải khiếu nại.");
  });

  // ── Chapter 3: attendance finalization, post-event report, feedback summary ─────────────────
  await scene("report", { id: "finalize", role: "CLUB MEMBER", title: "Flow 5 · Chốt điểm danh",
    card: ["Club Member", "Xác nhận vắng mặt và chốt điểm danh"], cookie: member, start: `/club/${clubId}/event-attendance` },
  async ({ app, say, click, type, pause }) => {
    await click(app.getByRole("button", { name: E.docker }), { after: 1500 });
    const nhi = app.getByRole("row").filter({ hasText: "Trịnh Yến Nhi" });
    await nhi.waitFor();
    await say("Workshop Docker đã kết thúc: 5/6 có mặt, bạn Nhi đăng ký nhưng không check-in.");
    await show(app.getByRole("table").last(), pause);
    await say("Vắng mặt hay bất thường phải xác nhận kèm lý do mới chốt được.");
    await click(nhi.getByRole("button", { name: "Xác nhận / hiệu chỉnh" }), { after: 900 });
    const dialog = app.getByRole("dialog");
    await type(dialog.getByLabel("Lý do"), "Bạn Nhi báo bận lịch thi, xác nhận vắng mặt");
    await click(dialog.getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Đã lưu thành công.").waitFor();
    await say("Em chốt điểm danh: số liệu bị khoá, thành căn cứ cho báo cáo.");
    await click(app.getByRole("button", { name: "Chốt điểm danh" }), { after: 900 });
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Điểm danh đã chốt.").waitFor();
    await show(app.locator("#club-event-detail"), pause);
    await say("Đã chốt, nút hiệu chỉnh biến mất; mở khoá cần vai trò riêng.");
  });

  await scene("report", { id: "report-feedback", role: "CLUB LEADER", title: "Flow 5 · Báo cáo sau sự kiện",
    card: ["Club Leader", "Nộp báo cáo và xem phản hồi tổng hợp"], cookie: leader, start: `/club/${clubId}/event-reports` },
  async ({ app, say, click, type, pause }) => {
    await say("Leader soạn báo cáo khi sự kiện Completed và điểm danh đã chốt.");
    await click(app.getByRole("combobox", { name: "Chọn sự kiện" }), { after: 500 });
    await click(app.getByRole("option", { name: new RegExp(E.docker) }), { after: 1500 });
    await app.getByText("Số liệu hiện tại").waitFor();
    await say("Số liệu nạp sẵn: 6 đăng ký, 5 có mặt, 1 vắng, điểm phản hồi; em ghi kết quả thực tế.");
    await type(app.getByLabel("Kết quả thực tế"), "25/30 sinh viên tự đóng gói và chạy được ứng dụng bằng Docker Compose.", { delay: 22 });
    await click(app.getByRole("button", { name: "Lưu bản nháp" }), { after: 1500 });
    await click(app.getByRole("button", { name: "Nộp", exact: true }), { after: 900 });
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Số liệu đóng băng khi nộp").waitFor();
    await say("Khi nộp, số liệu được chụp lại theo phiên bản để ICPDP thẩm định.");
    await app.goto(`${BASE}/club/${clubId}/event-feedback`);
    await click(app.getByRole("checkbox", { name: E.docker }), { after: 300 });
    await click(app.getByRole("checkbox", { name: E.talk }), { after: 1500 });
    await app.getByText("Điểm trung bình").waitFor();
    await say("Workshop Docker đủ ngưỡng: hiện điểm và nhận xét, không kèm tên người gửi.");
    await say("Talkshow mới có 1 phản hồi, dưới ngưỡng nên nội dung bị ẩn.");
  });

  await scene("report", { id: "close", role: "ICPDP OFFICER", title: "Flow 5 · Thẩm định báo cáo",
    card: ["ICPDP Officer", "Thẩm định báo cáo, đóng sự kiện"], cookie: officer, start: "/workspace/event-reports" },
  async ({ app, say, click, type, pause }) => {
    await say("ICPDP đối chiếu kế hoạch đã duyệt với số liệu thực tế.");
    await click(app.getByRole("combobox", { name: "Chọn sự kiện" }), { after: 500 });
    await click(app.getByRole("option", { name: new RegExp(E.docker) }), { after: 1500 });
    await click(app.getByRole("button", { name: "Nhận thẩm định" }), { after: 1500 });
    await type(app.getByLabel("Lý do quyết định"), "Số liệu tham dự khớp điểm danh đã chốt; đạt mục tiêu đề ra.");
    await click(app.getByRole("button", { name: "Chấp nhận" }), { after: 900 });
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Đã chấp nhận").first().waitFor();
    await show(app.getByText("Đã chấp nhận").first(), pause);
    await say("Báo cáo được chấp nhận, sự kiện Closed; chưa đạt thì ICPDP trả về để bổ sung.");
    await say("Dữ liệu này đi tiếp sang CSVC, quyết toán và đánh giá CLB.");
  });

  const files = {
    proposal: path.join(outDir, "01-de-xuat-va-phe-duyet.mp4"),
    attend: path.join(outDir, "02-dang-ky-check-in-phan-hoi.mp4"),
    report: path.join(outDir, "03-chot-diem-danh-va-bao-cao.mp4"),
  };
  const titles = { proposal: "Đề xuất, phê duyệt và công bố", attend: "Đăng ký, check-in và phản hồi",
    report: "Chốt điểm danh và báo cáo sau sự kiện" };
  for (const key of Object.keys(files)) console.log(key, buildVideo(files[key], [{ title: titles[key], files: chapters[key] }]).toFixed(1));
  const total = buildVideo(path.join(outDir, "UCMS-demo-flow-5.mp4"),
    Object.keys(files).map((key) => ({ title: titles[key], files: chapters[key] })));
  console.log("total", total.toFixed(1));
  rmSync(path.join(outDir, "scenes"), { recursive: true, force: true });
} finally {
  await rec.close();
}
