// Presenter 4: flow 6 (facilities, UC44-UC47, UC58) then flow 11 (school events, UC53-UC54).
// Run after `stack.sh 4 reset`, `stack.sh 4 up` and `npm run seed:defense:p4`.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, openRecorder } from "./rec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "outputs/ucms-demo-flow-6-11");
const DB = "ucms_video_p4";
const BASE = "http://localhost:5184";
const CLUB = "CLB Sáng tạo Công nghệ FPTU";
const EVENT = "Ngày hội Câu lạc bộ FPTU 2026";

function mongo(expr) {
  return execFileSync("docker", ["exec", "clubmanagementsystem-mongo-1", "mongosh", "--quiet", DB, "--eval", expr]).toString().trim();
}
const clubId = mongo(`print(String(db.clubs.findOne({ name: ${JSON.stringify(CLUB)} })._id))`);
const cookies = JSON.parse(execFileSync("node", ["--env-file=../.env", "--import", "tsx", "../outputs/ucms-demo-tools/mint-session.ts",
  "officer.demo@fpt.edu.vn", "an.demo@fpt.edu.vn", "chi.demo@fpt.edu.vn"],
{ cwd: path.join(root, "server"), env: { ...process.env, MONGO_URI: `mongodb://127.0.0.1:27017/${DB}` } }).toString());
const officer = cookies["officer.demo@fpt.edu.vn"], leader = cookies["an.demo@fpt.edu.vn"], member = cookies["chi.demo@fpt.edu.vn"];

/** `datetime-local` value (Vietnam time) of the first given ISO weekday at least `minDays` ahead. */
function localAt(weekday, minDays, time) {
  for (let offset = minDays; ; offset += 1) {
    const local = new Date(Date.now() + offset * 86_400_000 + 7 * 3_600_000);
    if ((local.getUTCDay() || 7) === weekday) return `${local.toISOString().slice(0, 10)}T${time}`;
  }
}

const rec = await openRecorder({ baseURL: BASE, outDir });
const scenes = { f6: [], f11: [] };
async function scene(flow, meta, run) { scenes[flow].push(await rec.scene(meta, run)); }

try {
  // ── Flow 6 ─────────────────────────────────────────────────────────────────────────────────
  await scene("f6", { id: "f6-1-catalogue", title: "Flow 6 · Danh mục cơ sở vật chất", badge: "01 / 04 · ICPDP OFFICER",
    card: ["Flow 6 — Cơ sở vật chất", "ICPDP Officer · danh mục tài sản"], cookie: officer, start: "/workspace/properties" },
  async ({ app, say, click, pause }) => {
    await say("Em tiếp tục với cơ sở vật chất. ICPDP quản lý danh mục: loại, vị trí, sức chứa, thiết bị và giờ được đặt.");
    await say("Hội trường, sân, sân khấu và thiết bị đi qua yêu cầu của Leader; phòng học do ICPDP phân theo học kỳ.");
    await click(app.getByRole("button", { name: "Sửa" }).first());
    const blackout = app.getByText("Giai đoạn khoá", { exact: true });
    await blackout.scrollIntoViewIfNeeded();
    await pause(600);
    await say("Hội trường này có giai đoạn khoá cho lễ tốt nghiệp: không booking nào được rơi vào khoảng đó.");
    await click(app.getByRole("button", { name: "Huỷ", exact: true }).first());
    await pause(800);
  });

  await scene("f6", { id: "f6-2-request", title: "Flow 6 · Gửi yêu cầu cơ sở vật chất", badge: "02 / 04 · CLUB LEADER",
    card: ["Club Leader", "Gửi và huỷ yêu cầu cơ sở vật chất"], cookie: leader, start: `/club/${clubId}/bookings` },
  async ({ app, say, click, type, pause }) => {
    await say("Em là Leader. Bản nháp xin hội trường đã có ngày, đúng một slot, mục đích và số người dự kiến.");
    await click(app.getByRole("button", { name: /Hội trường tầng 5 Alpha/ }));
    await app.getByRole("button", { name: "Gửi thẩm định" }).scrollIntoViewIfNeeded();
    await pause(1500);
    await say("Khi gửi, server kiểm tra lại giờ được đặt, giai đoạn khoá và xung đột lịch.", { ms: 3500 });
    await click(app.getByRole("button", { name: "Gửi thẩm định" }));
    await click(app.getByRole("dialog").getByRole("button", { name: "Đồng ý" }), { after: 1500 });
    await app.getByText("Đã gửi").first().waitFor();
    await say("Yêu cầu hợp lệ chuyển sang Requested và vào hàng đợi của ICPDP.");
    await click(app.getByRole("button", { name: /Sân bóng rổ ngoài trời/ }), { after: 300 });
    await app.getByRole("heading", { name: "Giao lưu thể thao với CLB bạn" }).waitFor();
    await say("Booking sân này đã duyệt nhưng CLB không dùng nữa; chưa tới giờ sử dụng nên em huỷ kèm lý do.");
    await type(app.getByLabel("Lý do huỷ"), "Hoạt động giao lưu đã dời sang học kỳ sau");
    await click(app.getByRole("button", { name: "Huỷ đặt" }));
    await click(app.getByRole("dialog").getByRole("button", { name: "Đồng ý" }), { after: 1500 });
    await app.getByText("Đã huỷ").first().waitFor();
    await say("Booking chuyển Cancelled, lịch sân được giải phóng cho CLB khác.");
  });

  await scene("f6", { id: "f6-3-review-allocate", title: "Flow 6 · Thẩm định yêu cầu", badge: "03 / 04 · ICPDP OFFICER",
    card: ["ICPDP Officer", "Thẩm định booking và phân phòng học"], cookie: officer, start: "/workspace/bookings" },
  async ({ app, say, click, type, pause }) => {
    await say("Phía ICPDP, em mở yêu cầu hội trường vừa gửi và nhận thẩm định.", { ms: 3500 });
    await click(app.getByRole("button", { name: /Hội trường tầng 5 Alpha/ }), { after: 300 });
    await app.getByRole("button", { name: "Nhận thẩm định" }).waitFor();
    await pause(1200);
    await click(app.getByRole("button", { name: "Nhận thẩm định" }), { after: 1500 });
    await app.getByText("Đang thẩm định").first().waitFor();
    await say("Hồ sơ sang Under Review. Em xem tình trạng CLB, lịch và xung đột rồi duyệt, luôn kèm lý do.");
    await type(app.getByLabel("Lý do quyết định"), "Hội trường trống, CLB đang hoạt động, mục đích phù hợp.");
    await click(app.getByRole("button", { name: "Ghi nhận quyết định" }));
    await click(app.getByRole("dialog").getByRole("button", { name: "Đồng ý" }), { after: 1500 });
    await app.getByText("Đã duyệt").first().waitFor();
    await say("Booking đã Approved. Duyệt sự kiện trước đó chưa có nghĩa booking cơ sở vật chất đã được duyệt.");

    await say("Phòng học thì khác: ICPDP chọn học kỳ, CLB, phòng, thứ và slot.", { title: "Flow 6 · Phân phòng theo học kỳ", ms: 3800 });
    await app.goto(`${BASE}/workspace/room-allocations`);
    await app.getByRole("button", { name: "Phân phòng" }).waitFor();
    await pause(1200);
    await click(app.getByRole("button", { name: "Phân phòng" }));
    const dialog = app.getByRole("dialog", { name: "Phân phòng" });
    await click(dialog.getByRole("combobox", { name: "Câu lạc bộ" }), { after: 500 });
    await click(app.getByRole("option", { name: CLUB }));
    await click(dialog.getByRole("combobox", { name: "Phòng", exact: true }), { after: 500 });
    await click(app.getByRole("option", { name: /Phòng BE-201/ }), { after: 1500 });
    await say("Lưới tuần cho thấy thứ 3 slot 3 đã thuộc CLB khác. Em chọn ô trống thứ 5, slot 4.");
    await click(dialog.locator("tbody tr").nth(3).locator("td").nth(3).getByRole("button"));
    await type(dialog.getByLabel("Ghi chú (không bắt buộc)"), "Sinh hoạt chuyên môn hằng tuần");
    await say("Hệ thống kiểm tra mọi buổi còn lại: ngày khoá bảo trì được bỏ qua, một ngày trùng lịch là từ chối cả đợt.");
    await click(dialog.getByRole("button", { name: "Phân phòng" }), { after: 300 });
    const row = app.getByRole("row", { name: new RegExp(CLUB) });
    await row.waitFor();
    await pause(1500);
    await click(row.locator("summary"), { after: 1200 });
    await say("Mỗi ngày có một booking Approved trong cùng transaction; phòng học không có ngoại lệ đặt trùng.");
  });

  await scene("f6", { id: "f6-4-member-rooms", title: "Flow 6 · Thành viên xem phòng", badge: "04 / 04 · CLUB MEMBER",
    card: ["Club Member", "Xem phòng CLB được phân"], cookie: member, start: `/club/${clubId}/rooms` },
  async ({ app, say, click }) => {
    await say("Em là thành viên Active của CLB. Em xem được phòng, toà nhà, thứ, slot và buổi gần nhất.");
    await click(app.locator("summary", { hasText: "Các buổi sắp tới" }), { after: 1200 });
    await say("Trang chỉ đọc; nếu cần đổi, ICPDP thu hồi các buổi chưa bắt đầu và lịch sử vẫn được giữ.");
    await say("Tiếp theo là một nhiệm vụ điều phối khác của ICPDP: sự kiện cấp trường.", { ms: 3500 });
  });

  // ── Flow 11 ────────────────────────────────────────────────────────────────────────────────
  await scene("f11", { id: "f11-1-create", title: "Flow 11 · Tạo sự kiện cấp trường", badge: "01 / 03 · ICPDP OFFICER",
    card: ["Flow 11 — Sự kiện cấp trường", "ICPDP Officer · tạo và mời CLB"], cookie: officer, start: "/workspace/school-events" },
  async ({ app, say, click, type, pause }) => {
    await say("Sự kiện do nhà trường tổ chức, ví dụ ngày hội CLB: ICPDP nhập thông tin rồi chọn các CLB muốn mời.");
    await click(app.getByRole("button", { name: "Tạo sự kiện cấp trường" }));
    await type(app.getByLabel(/^Tên sự kiện/), EVENT);
    await type(app.getByLabel("Mục tiêu"), "Giới thiệu các CLB tới tân sinh viên.", { delay: 18 });
    await type(app.getByLabel("Yêu cầu phối hợp với CLB"), "Mỗi CLB 1 gian hàng, 3–5 thành viên trực.", { delay: 18 });
    for (const [label, value] of [[/^Bắt đầu/, localAt(6, 21, "08:00")], [/^Kết thúc/, localAt(6, 21, "11:30")]]) {
      await click(app.getByLabel(label), { after: 200 });
      await app.getByLabel(label).fill(value);
    }
    await type(app.getByLabel("Nơi khác"), "Sân trung tâm Toà Alpha", { delay: 18 });
    await type(app.getByLabel(/^Số chỗ cho sinh viên/), "500");
    await say("Hạn phản hồi để trống là ba ngày trước khi sự kiện bắt đầu. Em mời ba CLB.", { ms: 3800 });
    await click(app.getByLabel("Tất cả CLB đang hoạt động"), { after: 600 });
    for (const name of [CLUB, "FPTU English Club", "FPTU Melody Club"]) await click(app.getByLabel(name, { exact: true }), { after: 400 });
    await click(app.getByRole("button", { name: "Tạo sự kiện", exact: true }), { after: 2000 });
    await app.getByText("Chưa công bố").first().waitFor();
    await pause(500);
    await say("Nhà trường là đơn vị tổ chức nên sự kiện ở Approved ngay, không đi qua đề xuất của CLB.");
    await say("Ba lời mời đang Pending, mỗi lời mời thuộc một cặp sự kiện và CLB.", { ms: 3800 });
  });
  const eventId = mongo(`print(String(db.events.findOne({ title: ${JSON.stringify(EVENT)}, organizerType: "ICPDP" })._id))`);

  await scene("f11", { id: "f11-2-respond", title: "Flow 11 · CLB phản hồi lời mời", badge: "02 / 03 · CLUB LEADER",
    card: ["Club Leader", "Phản hồi lời mời thay CLB"], cookie: leader, start: `/club/${clubId}/invitations` },
  async ({ app, say, click, type }) => {
    await say("Em là Leader, nhận lời mời tại đây. Chấp nhận thì ghi đại diện, số người và nội dung phối hợp.");
    await type(app.getByLabel("Người đại diện"), "Nguyễn Minh An");
    await type(app.getByLabel("Số người dự kiến tham gia"), "5");
    await type(app.getByLabel("Nội dung phản hồi hoặc lý do từ chối"), "CLB nhận 1 gian hàng trải nghiệm lập trình.", { delay: 18 });
    await click(app.getByRole("button", { name: "Nhận lời" }), { after: 1500 });
    await app.getByText("Đã nhận lời").first().waitFor();
    await say("Lời mời chuyển Accepted và không sửa được nữa; hệ thống giữ người phản hồi và thời điểm.");
    await say("Nhận lời là cam kết của CLB, không tự đăng ký hay điểm danh cho các thành viên.", { ms: 4200 });
  });

  await scene("f11", { id: "f11-3-publish", title: "Flow 11 · Theo dõi và công bố", badge: "03 / 03 · ICPDP OFFICER",
    card: ["ICPDP Officer", "Theo dõi phản hồi và công bố"], cookie: officer, start: `/workspace/school-events/${eventId}` },
  async ({ app, say, click, pause }) => {
    await app.getByText("Nhận lời", { exact: true }).first().scrollIntoViewIfNeeded();
    await say("Tải lại màn ICPDP: một CLB đã nhận lời kèm nội dung, hai CLB chưa trả lời và còn thu hồi được.");
    await say("Không cần đủ mọi phản hồi mới công bố. Em công bố để sinh viên đăng ký cá nhân.", { ms: 4000 });
    await click(app.getByRole("button", { name: "Công bố cho sinh viên" }));
    await click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận" }), { after: 1500 });
    await app.getByText("Đang mở đăng ký").first().waitFor();
    await app.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await pause(800);
    await say("Sự kiện chuyển Upcoming, mở đăng ký đến giờ bắt đầu và có mã check-in.");
    await app.goto(`${BASE}/events/${eventId}`);
    await app.getByText(EVENT).first().waitFor();
    await pause(1200);
    await say("Trang công khai đã có sự kiện. Đăng ký và check-in đi theo luồng cá nhân của flow 5.");
  });
} finally {
  await rec.close();
}

const f6 = path.join(outDir, "06-co-so-vat-chat.mp4"), f11 = path.join(outDir, "11-su-kien-cap-truong.mp4");
const durations = {
  f6: buildVideo(f6, [{ title: "Flow 6 — Cơ sở vật chất", files: scenes.f6 }]),
  f11: buildVideo(f11, [{ title: "Flow 11 — Sự kiện cấp trường", files: scenes.f11 }]),
  all: buildVideo(path.join(outDir, "UCMS-demo-flow-6-11.mp4"), [
    { title: "Flow 6 — Cơ sở vật chất", files: scenes.f6 },
    { title: "Flow 11 — Sự kiện cấp trường", files: scenes.f11 },
  ]),
};
rmSync(path.join(outDir, "scenes"), { recursive: true, force: true });
console.log(JSON.stringify({ outDir, durations }, null, 2));
