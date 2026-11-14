// Presenter 2: flow 4 (board nomination + leadership transition) then flow 10 (club lifecycle).
// Run after `stack.sh 2 reset && stack.sh 2 up` and `npm run seed:defense:p2`.
//   node outputs/ucms-demo-tools/record-p2.mjs [sceneId…]   (no ids: every scene + the videos)
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, openRecorder } from "./rec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "outputs/ucms-demo-flow-4-10");
const BASE = "http://localhost:5182", API = "http://localhost:3102";
const MONGO_URI = "mongodb://127.0.0.1:27017/ucms_video_p2";
const CLUB = "CLB Sáng tạo Công nghệ FPTU";
const emails = { officer: "officer.demo@fpt.edu.vn", an: "an.demo@fpt.edu.vn", bao: "bao.demo@fpt.edu.vn" };

const cookies = JSON.parse(execFileSync("node", ["--env-file=../.env", "--import", "tsx",
  "../outputs/ucms-demo-tools/mint-session.ts", ...Object.values(emails)],
{ cwd: path.join(root, "server"), env: { ...process.env, MONGO_URI } }).toString());
const cookie = (key) => cookies[emails[key]];
const me = await (await fetch(`${API}/api/v1/auth/me`, { headers: { cookie: `ucms_session=${cookie("an")}` } })).json();
const clubId = me.data.workspaces.find((w) => w.clubName === CLUB)?.clubId;
if (!clubId) throw new Error(`${CLUB} not found in An's workspaces; run the seed`);

/** YYYY-MM-DD of the Vietnam calendar day `days` from today, for <input type="date">. */
function vnDate(days) {
  return new Date(Date.now() + 7 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
}

/** Extra helpers on top of rec.mjs tools. */
function extend(t) {
  return {
    ...t,
    /** Glides the cursor ring to an element without clicking, to show what the caption talks about. */
    async point(locator, { after = 500 } = {}) {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      if (box) await t.page.mouse.move(box.x + Math.min(box.width / 2, 260), box.y + box.height / 2, { steps: 22 });
      await t.pause(after);
    },
    /** Scrolls the app so `locator` sits in the middle of the viewport. */
    async scrollTo(locator) {
      await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      await t.pause(900);
    },
    /** Scrolls the app back to the top of the page. */
    async top() {
      // The workspace scrolls inside its own container, not the window.
      await t.app.locator("body").evaluate(() => {
        for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) {
          if (el && el.scrollTop > 0) el.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      await t.pause(900);
    },
    /** Opens a combobox (AppSelect) and picks an option by its label. */
    async pick(name, option) {
      await t.click(t.app.getByRole("combobox", { name, exact: true }), { after: 500 });
      await t.click(t.app.getByRole("option", { name: option, exact: true }), { after: 600 });
    },
    /** Clicks a long field and fills it at once (the text is read from the caption, not typed). */
    async fill(locator, text) {
      await t.click(locator, { after: 200 });
      await locator.fill(text);
      await t.pause(500);
    },
  };
}

const rec = await openRecorder({ baseURL: BASE, outDir });
const only = process.argv.slice(2);
const files = {};
async function scene(meta, run) {
  if (only.length && !only.includes(meta.id)) return;
  files[meta.id] = await rec.scene(meta, (tools) => run(extend(tools)));
  console.log("recorded", meta.id);
}
const f4 = (role) => `01 / 02 · ${role}`;
const f10 = (role) => `02 / 02 · ${role}`;

try {
  // ───────────── Flow 4 — board and leadership transition ─────────────
  await scene({ id: "04-1-de-cu", title: "Flow 4 · Ban chủ nhiệm hiện hành", badge: f4("CLUB LEADER"),
    card: ["Flow 4 · Ban chủ nhiệm và chuyển giao", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/board` }, async (t) => {
    const { app } = t;
    await t.point(app.getByRole("region", { name: CLUB }));
    await t.say("Em tiếp nhận CLB vừa được duyệt. Ban sáng lập có hiệu lực ngay từ UC08, gắn với nhiệm kỳ Active hiện tại.");
    await t.point(app.getByText("Phó chủ nhiệm", { exact: false }).first());
    await t.say("Ghế Chủ nhiệm đã có người nên không được đề cử chồng. Em bổ sung một Phó chủ nhiệm, ghế cho nhiều người giữ.",
      { title: "Flow 4 · UC10 đề cử bổ sung" });
    await t.pick("Người được đề cử: Phó chủ nhiệm", "Lê Ngọc Chi");
    await t.say("Danh sách chỉ có thành viên Active chưa giữ ghế nào; một người không được chiếm hai ghế.");
    await t.click(app.getByRole("button", { name: "Nộp đề cử" }), { after: 1200 });
    await t.point(app.getByText("Chờ ICPDP xác nhận").first());
    await t.say("Đề cử chờ ICPDP xác nhận. Chi chưa có quyền gì chỉ vì đã có tên trong hồ sơ.", { ms: 5000 });
  });

  await scene({ id: "04-2-xac-nhan-ghe", title: "Flow 4 · UC11 xác nhận ghế", badge: f4("CÁN BỘ ICPDP"),
    card: ["Flow 4 · Xác nhận đề cử", "Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/board-nominations" }, async (t) => {
    const { app } = t;
    await t.say("Đề cử vào hàng đợi của ICPDP. Em mở hồ sơ của CLB Sáng tạo Công nghệ.");
    await t.click(app.getByRole("button", { name: "Xem đề cử" }).first(), { after: 1200 });
    await t.click(app.getByRole("button", { name: "Nhận quyết định" }), { after: 1200 });
    await t.say("Em nhận task trước, để hai cán bộ không cùng quyết định một hồ sơ.");
    await t.click(app.getByRole("button", { name: "Trả ghế" }), { after: 700 });
    await t.say("Mỗi ghế được xác nhận hoặc trả lại kèm lý do, nên có thể xác nhận một phần hồ sơ.");
    await t.click(app.getByRole("button", { name: "Xác nhận ghế" }), { after: 600 });
    await t.type(app.getByLabel("Ghi chú quyết định"), "Thành viên Active, đủ điều kiện giữ ghế Phó chủ nhiệm.");
    await t.click(app.getByRole("button", { name: "Ghi một quyết định" }), { after: 900 });
    await t.click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }), { after: 1500 });
    await t.point(app.getByText("Đã xác nhận").first());
    await t.say("Ghế đã Confirmed. Quyền Leader chỉ có khi membership, ghế đã xác nhận và nhiệm kỳ còn hiệu lực cùng thoả mãn.", { ms: 6500 });
  });

  await scene({ id: "04-3-ke-hoach", title: "Flow 4 · UC12 kế hoạch chuyển giao", badge: f4("CLUB LEADER"),
    card: ["Flow 4 · Kế hoạch chuyển giao", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/transition-plans` }, async (t) => {
    const { app } = t;
    await t.point(app.getByLabel("Tên nhiệm kỳ mới"));
    await t.say("Chuyển giao nhiệm kỳ là việc khác. Em đã lưu sẵn bản nháp: nhiệm kỳ mới và lý do chuyển giao sớm.");
    await t.point(app.getByRole("heading", { name: "Ban chủ nhiệm kế nhiệm" }));
    await t.say("Ban mới: Trần Gia Bảo làm Chủ nhiệm; Lê Ngọc Chi và em, Nguyễn Minh An, làm Phó chủ nhiệm.");
    await t.point(app.getByRole("heading", { name: "Nghĩa vụ còn tồn đọng" }));
    await t.say("Hệ thống tự nạp sự kiện, ngân sách còn mở. Mỗi nghĩa vụ phải có người nhận thuộc ban mới mới nộp được.");
    await t.pick("Hackathon Sáng tạo FPTU 2026", "Lê Ngọc Chi");
    await t.say("Em giao Hackathon cho Chi rồi lưu; nút nộp chỉ mở khi không còn thay đổi chưa lưu.", { ms: 4200 });
    await t.click(app.getByRole("button", { name: "Lưu thay đổi" }), { after: 1500 });
    await t.click(app.getByRole("button", { name: "Nộp kế hoạch đã lưu" }), { after: 1500 });
    await t.top();
    await t.point(app.getByRole("heading", { name: "Chờ ICPDP xác nhận" }));
    await t.say("Kế hoạch đã nộp, chờ ICPDP xác nhận. Trách nhiệm vẫn gắn với CLB khi người điều hành thay đổi.", { ms: 5000 });
  });

  await scene({ id: "04-4-duyet-chuyen-giao", title: "Flow 4 · UC13 phê duyệt chuyển giao", badge: f4("CÁN BỘ ICPDP"),
    card: ["Flow 4 · Phê duyệt chuyển giao", "Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/leadership-transitions" }, async (t) => {
    const { app } = t;
    await t.click(app.getByRole("button", { name: "Thẩm định chuyển giao" }).first(), { after: 1200 });
    await t.say("ICPDP xem nhiệm kỳ cũ, nhiệm kỳ mới, ban điều hành mới và từng nghĩa vụ kèm người nhận.");
    await t.click(app.getByRole("button", { name: "Nhận xử lý" }), { after: 1200 });
    await t.scrollTo(app.getByRole("heading", { name: "Nghĩa vụ còn tồn đọng" }));
    const budget = app.getByRole("listitem").filter({ hasText: "Kinh phí sự kiện" });
    await t.click(budget.getByRole("checkbox"), { after: 600 });
    await t.say("Em đánh dấu ngân sách chưa đối soát để tiếp tục theo dõi. Duyệt chuyển giao không tất toán nghĩa vụ đó.");
    await t.type(app.getByLabel("Ghi chú quyết định"), "Ban mới đủ điều kiện; theo dõi đối soát ngân sách Workshop.");
    await t.click(app.getByRole("button", { name: "Gửi quyết định" }), { after: 900 });
    await t.click(app.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }), { after: 1500 });
    await t.top();
    await t.point(app.getByText("Đã lưu quyết định chuyển giao."));
    await t.say("Code hiện tại cho hiệu lực ngay lúc duyệt: nhiệm kỳ cũ đóng, nhiệm kỳ mới Active, quyền được tính lại.", { ms: 6000 });
  });

  await scene({ id: "04-5-lich-su", title: "Flow 4 · Lịch sử ban chủ nhiệm", badge: f4("CLUB LEADER MỚI"),
    card: ["Flow 4 · Lịch sử ban chủ nhiệm", "Club Leader mới · Trần Gia Bảo"], cookie: cookie("bao"),
    start: `/club/${clubId}/board-history` }, async (t) => {
    const { app } = t;
    await t.say("Em vào bằng tài khoản Bảo, Chủ nhiệm mới. Lịch sử vẫn giữ ai đã giữ ghế ở nhiệm kỳ nào.");
    await t.point(app.getByText("Nhiệm kỳ 2026–2027").first());
    await t.pause(1200);
    await t.point(app.getByText("Founding term").first());
    await t.say("Nếu CLB đang tạm ngừng thì chưa duyệt được chuyển giao. Đó là điểm nối sang vòng đời CLB.", { ms: 5000 });
  });

  // ───────────── Flow 10 — suspension, reactivation, dissolution ─────────────
  await scene({ id: "10-1-xin-tam-ngung", title: "Flow 10 · UC14 xin tạm ngừng", badge: f10("CLUB LEADER"),
    card: ["Flow 10 · Vòng đời CLB", "Club Leader · Trần Gia Bảo"], cookie: cookie("bao"),
    start: `/club/${clubId}/suspension-requests` }, async (t) => {
    const { app } = t;
    await t.say("Leader xin tạm ngừng phải nêu lý do, thời hạn, cách xử lý nghĩa vụ và kế hoạch phục hồi.");
    await t.type(app.getByLabel("Lý do"), "Ban chủ nhiệm mới cần một tháng để kiện toàn nhân sự.", { delay: 22 });
    await t.fill(app.getByLabel("Ngày dự kiến kết thúc"), vnDate(30));
    await t.fill(app.getByLabel("Phương án xử lý nghĩa vụ tồn đọng"),
      "Chi hoàn tất đối soát ngân sách Workshop; An báo tin cho người quan tâm Hackathon.");
    await t.fill(app.getByLabel("Kế hoạch phục hồi"), "Họp toàn CLB, bổ sung ban chuyên môn và mở lại hoạt động sau một tháng.");
    await t.point(app.getByText("Hackathon Sáng tạo FPTU 2026"));
    await t.say("Hệ thống liệt kê sự kiện tương lai sẽ bị huỷ nếu được duyệt; em phải xác nhận đã biết trước khi nộp.");
    await t.click(app.getByRole("checkbox"), { after: 500 });
    await t.click(app.getByRole("button", { name: "Nộp yêu cầu" }), { after: 1500 });
    await t.point(app.getByText("Chờ duyệt").first());
    await t.say("Yêu cầu ở trạng thái Pending. CLB vẫn Active cho tới khi ICPDP chấp nhận.", { ms: 4500 });
  });

  await scene({ id: "10-2-duyet-tam-ngung", title: "Flow 10 · UC15 duyệt tạm ngừng", badge: f10("CÁN BỘ ICPDP"),
    card: ["Flow 10 · Quyết định tạm ngừng", "Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/suspension-requests" }, async (t) => {
    const { app } = t;
    await t.say("ICPDP đọc lý do, kế hoạch nghĩa vụ và phục hồi, rồi duyệt hoặc từ chối kèm lý do quyết định.");
    await t.type(app.getByLabel("Lý do quyết định"), "Đồng ý tạm ngừng có thời hạn để kiện toàn ban chủ nhiệm.", { delay: 22 });
    await t.click(app.getByRole("button", { name: "Duyệt và tạm ngừng" }), { after: 1800 });
    await t.point(app.getByText("Đã duyệt").first());
    await t.say("Yêu cầu Approved, CLB chuyển Suspended. Sự kiện tương lai đã duyệt bị huỷ ngay theo quyết định.", { ms: 5500 });
  });

  await scene({ id: "10-3-kich-hoat-giai-the", title: "Flow 10 · Kích hoạt lại", badge: f10("CÁN BỘ ICPDP"),
    card: ["Flow 10 · Kích hoạt lại và giải thể", "Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/icpdp/clubs" }, async (t) => {
    const { app } = t;
    await t.say("Em mở màn quản lý CLB của ICPDP để xem trạng thái và ra quyết định vòng đời.");
    await t.type(app.getByRole("searchbox"), "Sáng tạo Công nghệ");
    await t.click(app.getByRole("button", { name: "Tìm kiếm" }), { after: 1200 });
    await t.click(app.getByRole("button", { name: "Quản lý", exact: true }).first(), { after: 1500 });
    const dialog = app.getByRole("dialog");
    await t.point(dialog.getByText("Tạm ngừng từ", { exact: false }));
    await t.say("CLB đang Suspended, có lý do và hạn tạm ngừng. Đợt tuyển vẫn giữ nhưng sinh viên không ứng tuyển được.");
    await t.point(dialog.getByRole("heading", { name: "Sự kiện sắp tới" }));
    await t.say("Hackathon đã bị huỷ theo quyết định nên không còn trong sự kiện sắp tới.", { ms: 3800 });
    await t.click(dialog.getByRole("button", { name: "Kích hoạt lại" }), { after: 700 });
    await t.type(dialog.getByLabel("Lý do (bắt buộc)"), "Ban chủ nhiệm đã kiện toàn, CLB hoạt động trở lại.", { delay: 22 });
    await t.click(dialog.getByRole("button", { name: "Xác nhận", exact: true }), { after: 1800 });
    await t.say("CLB về Active, lịch sử được giữ. Sự kiện đã huỷ không tự khôi phục; muốn tổ chức phải đề xuất lại.");
    await t.click(dialog.getByRole("button", { name: "Giải thể" }), { after: 1000 });
    await t.point(dialog.getByText("Ngân sách chưa đối soát", { exact: true }));
    await t.say("Giải thể đi theo học kỳ: quyết định hôm nay chưa đổi trạng thái. Hệ thống cảnh báo ngân sách chưa đối soát.",
      { title: "Flow 10 · Lịch giải thể" });
    await t.type(dialog.getByLabel("Lý do (bắt buộc)"), "CLB đề nghị sáp nhập vào CLB khác từ học kỳ sau.", { delay: 22 });
    await t.click(dialog.getByRole("button", { name: "Xác nhận", exact: true }), { after: 1800 });
    await t.point(dialog.getByText("Đã quyết định giải thể", { exact: false }));
    await t.say("Đầu Spring 2027 CLB chuyển Dissolving, cuối kỳ mới Dissolved. Nghĩa vụ chưa xong được lưu lại, không mất.", { ms: 6500 });
  });
} finally {
  await rec.close();
}

if (!only.length) {
  const s = (id) => files[id];
  const flow4 = ["04-1-de-cu", "04-2-xac-nhan-ghe", "04-3-ke-hoach", "04-4-duyet-chuyen-giao", "04-5-lich-su"].map(s);
  const flow10 = ["10-1-xin-tam-ngung", "10-2-duyet-tam-ngung", "10-3-kich-hoat-giai-the"].map(s);
  const d4 = buildVideo(path.join(outDir, "04-ban-chu-nhiem-chuyen-giao.mp4"), [{ title: "Flow 4 — Ban chủ nhiệm và chuyển giao nhiệm kỳ", files: flow4 }]);
  const d10 = buildVideo(path.join(outDir, "10-vong-doi-clb.mp4"), [{ title: "Flow 10 — Tạm ngừng, kích hoạt lại và giải thể", files: flow10 }]);
  const all = buildVideo(path.join(outDir, "UCMS-demo-flow-4-10.mp4"), [
    { title: "Flow 4 — Ban chủ nhiệm và chuyển giao nhiệm kỳ", files: flow4 },
    { title: "Flow 10 — Tạm ngừng, kích hoạt lại và giải thể", files: flow10 }]);
  console.log(JSON.stringify({ flow4: d4.toFixed(1), flow10: d10.toFixed(1), total: all.toFixed(1) }));
  // Scene files are intermediate; the README links only the built videos.
  for (const name of readdirSync(path.join(outDir, "scenes"))) rmSync(path.join(outDir, "scenes", name), { force: true });
  rmSync(path.join(outDir, "scenes"), { recursive: true, force: true });
}
