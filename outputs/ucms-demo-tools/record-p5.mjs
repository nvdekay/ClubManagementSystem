// Presenter 5: flow 7 (sponsored item invoices and payment) then flow 8 (periodic report and club evaluation).
// Run after `stack.sh 5 reset && stack.sh 5 up` and `npm run seed:defense:p5`.
//   node outputs/ucms-demo-tools/record-p5.mjs [sceneId…]   (no ids: every scene + the videos)
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVideo, openRecorder } from "./rec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "outputs/ucms-demo-flow-7-8");
const BASE = "http://localhost:5185", API = "http://localhost:3105";
const MONGO_URI = "mongodb://127.0.0.1:27017/ucms_video_p5";
const CLUB = "CLB Sáng tạo Công nghệ FPTU";
const EVENT = "Ngày hội Lập trình Sáng tạo FPTU 2026";
const ITEM = "In ấn banner, standee";
const emails = { officer: "officer.demo@fpt.edu.vn", an: "an.demo@fpt.edu.vn" };

const cookies = JSON.parse(execFileSync("node", ["--env-file=../.env", "--import", "tsx",
  "../outputs/ucms-demo-tools/mint-session.ts", ...Object.values(emails)],
{ cwd: path.join(root, "server"), env: { ...process.env, MONGO_URI } }).toString());
const cookie = (key) => cookies[emails[key]];
const me = await (await fetch(`${API}/api/v1/auth/me`, { headers: { cookie: `ucms_session=${cookie("an")}` } })).json();
const clubId = me.data.workspaces.find((w) => w.clubName === CLUB)?.clubId;
if (!clubId) throw new Error(`${CLUB} not found in An's workspaces; run the seed`);

// Cloudinary is off in the demo stack, so the seeded invoice images (metadata only) get a preview from here.
const invoices = {
  "5e000000-0000-4000-8000-000000000001": ["HĐ 0001248", "Công ty TNHH Âm thanh Ánh sáng Hòa Lạc",
    [["Thuê dàn âm thanh hội trường", "2.500.000"], ["Thuê hệ thống đèn sân khấu", "1.500.000"]], "4.000.000"],
  "5e000000-0000-4000-8000-000000000002": ["HĐ 0000731", "Cơ sở In nhanh Thạch Thất",
    [["Banner 3m x 1.5m (2 tấm)", "1.400.000"], ["Backdrop sân khấu", "600.000"]], "2.000.000"],
  "5e000000-0000-4000-8000-000000000003": ["HĐ 0000732", "Cơ sở In nhanh Thạch Thất",
    [["Standee cuốn 80 x 200 (4 cái)", "800.000"]], "800.000"],
};
function invoiceSvg([number, seller, rows, total]) {
  const line = (y, a, b) => `<text x="40" y="${y}" font-size="22">${a}</text><text x="560" y="${y}" font-size="22" text-anchor="end">${b}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" font-family="Arial">
<rect width="600" height="420" fill="#fffdf6" stroke="#c9c2a8" stroke-width="4"/>
<text x="300" y="58" font-size="30" font-weight="700" text-anchor="middle" fill="#b03a2e">HÓA ĐƠN BÁN HÀNG</text>
<text x="300" y="92" font-size="20" text-anchor="middle" fill="#555">${number}</text>
<text x="40" y="140" font-size="20" fill="#333">Đơn vị bán: ${seller}</text>
<text x="40" y="170" font-size="20" fill="#333">Khách hàng: ${CLUB}</text>
<line x1="40" y1="190" x2="560" y2="190" stroke="#999"/>
${rows.map(([a, b], i) => line(230 + i * 40, a, b)).join("")}
<line x1="40" y1="330" x2="560" y2="330" stroke="#999"/>
${line(370, "<tspan font-weight='700'>Tổng cộng (VNĐ)</tspan>", `<tspan font-weight='700'>${total}</tspan>`)}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function extend(t) {
  return {
    ...t,
    /** Serves invoice previews; call before the budget page loads. */
    async invoices() {
      await t.page.route(/\/api\/v1\/.*\/items\/[^/]+\/images\/[^/?]+$/, (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const id = route.request().url().split("/").pop();
        return route.fulfill({ contentType: "application/json",
          body: JSON.stringify({ statusCode: 200, message: "OK", data: { url: invoiceSvg(invoices[id] ?? Object.values(invoices)[0]) },
            timestamp: new Date().toISOString() }) });
      });
    },
    /** Glides the cursor ring to an element without clicking. */
    async point(locator, { after = 500 } = {}) {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      if (box) await t.page.mouse.move(box.x + Math.min(box.width / 2, 260), box.y + box.height / 2, { steps: 22 });
      await t.pause(after);
    },
    /** Scrolls the app so `locator` sits near the top of the viewport. */
    async scrollTo(locator, offset = 110) {
      await locator.evaluate((el, top) => {
        let box = el.parentElement;
        while (box && !(box.scrollHeight > box.clientHeight && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
        const scroller = box ?? document.scrollingElement;
        const y = el.getBoundingClientRect().top - (box ? box.getBoundingClientRect().top : 0) + scroller.scrollTop - top;
        scroller.scrollTo({ top: y, behavior: "smooth" });
      }, offset);
      await t.pause(1000);
    },
    /** Answers the app's confirm dialog. */
    async confirm() {
      await t.click(t.app.getByRole("alertdialog").getByRole("button", { name: "Xác nhận", exact: true })
        .or(t.app.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true })), { after: 1500 });
    },
    /** Picks the demo event in the club budget select. */
    async pickBudget() {
      await t.click(t.app.getByRole("combobox", { name: "Chọn sự kiện" }), { after: 500 });
      await t.click(t.app.getByRole("option").filter({ hasText: EVENT }), { after: 1800 });
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
const f7 = (role) => `01 / 02 · ${role}`;
const f8 = (role) => `02 / 02 · ${role}`;
const card = (t) => t.app.locator("article").filter({ has: t.app.getByRole("heading", { name: ITEM, exact: true }) });

try {
  // ───────────── Flow 7 — sponsored items: invoices, review, payment ─────────────
  await scene({ id: "07-1-ngan-sach", title: "Flow 7 · Ngân sách đã duyệt", badge: f7("ICPDP OFFICER"),
    card: ["Flow 7 · Kinh phí và quyết toán", "ICPDP · Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/budgets" }, async (t) => {
    const { app } = t;
    await t.invoices();
    await t.say("Em mở trang Giải ngân kinh phí. Ngân sách của sự kiện đã được ICPDP duyệt ở bước UC26.");
    await t.click(app.getByRole("link").filter({ hasText: EVENT }), { after: 2000 });
    await t.say("Khi duyệt, ICPDP quyết định từng hạng mục: tài trợ trả trước, trả sau, hoặc không tài trợ.");
    const first = app.locator("article").first();
    await t.point(first.getByText("Tài trợ · Trả trước"));
    await t.say("Mỗi hạng mục có trần tài trợ và hạn nộp chứng từ là 14 ngày sau khi sự kiện kết thúc.");
    await t.scrollTo(app.getByText("Số tiền được duyệt thanh toán").first(), 330);
    await t.say("Hạng mục âm thanh đã đi hết vòng: chứng từ được đối soát và CLB đã xác nhận nhận tiền.");
    await t.scrollTo(card(t), 90);
    await t.say("Hạng mục in ấn là khoản trả sau. Em chuyển sang Leader để nộp bộ chứng từ cho khoản này.", { ms: 3500 });
  });

  await scene({ id: "07-2-nop-chung-tu", title: "Flow 7 · Ghi chi và nộp chứng từ", badge: f7("CLUB LEADER"),
    card: ["Flow 7 · Ghi chi và nộp chứng từ", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/budgets` }, async (t) => {
    const { app } = t;
    await t.invoices();
    await t.say("Leader vào Khoản chi và quyết toán, chọn sự kiện đã kết thúc của CLB.");
    await t.pickBudget();
    const item = card(t);
    await t.scrollTo(item, 90);
    await t.say("Ảnh hóa đơn in banner và standee đã được tải lên sẵn. Em nhập tổng giá trị hóa đơn và nội dung chi.");
    await t.type(item.getByLabel("Tổng giá trị hóa đơn"), "2800000", { delay: 70 });
    await t.type(item.getByLabel("Nội dung khoản chi"), "In 2 banner, 1 backdrop và 4 standee cho ngày hội");
    await t.say("Tổng hóa đơn 2,8 triệu, cao hơn trần 2,5 triệu. Hệ thống vẫn cho ghi để ICPDP xem xét.");
    await t.click(item.getByRole("button", { name: "Lưu khoản chi" }), { after: 1500 });
    await t.say("Khi đủ chứng từ, em nộp. Sau khi nộp, bộ ảnh bị khóa để ICPDP đối soát.");
    await t.click(item.getByRole("button", { name: "Nộp bộ chứng từ đầy đủ" }), { after: 900 });
    await t.confirm();
    await t.scrollTo(item, 90);
    await t.point(item.getByText("Chờ đối soát", { exact: true }));
    await t.say("Hạng mục chuyển sang Chờ đối soát, ô nhập và nút thêm ảnh không còn sửa được.", { ms: 4500 });
  });

  await scene({ id: "07-3-doi-soat", title: "Flow 7 · Đối soát hạng mục", badge: f7("ICPDP OFFICER"),
    card: ["Flow 7 · Đối soát chứng từ", "ICPDP · Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/budgets" }, async (t) => {
    const { app } = t;
    await t.invoices();
    await t.say("Phía ICPDP, em mở lại ngân sách để đối soát bộ chứng từ CLB vừa nộp.");
    await t.click(app.getByRole("link").filter({ hasText: EVENT }), { after: 2000 });
    const item = card(t);
    await t.scrollTo(item, 90);
    await t.say("Em xem từng ảnh hóa đơn, ghi giá trị hợp lệ và lý do cho quyết định.");
    await t.point(item.getByRole("img").first(), { after: 1500 });
    await t.scrollTo(item.getByLabel("Giá trị hóa đơn hợp lệ"), 260);
    await t.type(item.getByLabel("Lý do / nhận xét"), "Hai hóa đơn hợp lệ, đúng hạng mục in ấn đã duyệt.");
    await t.say("Chi hợp lệ 2,8 triệu, nhưng số được thanh toán bị giới hạn ở trần 2,5 triệu.");
    await t.click(item.getByRole("button", { name: "Duyệt đối soát" }), { after: 2000 });
    await t.scrollTo(item, 70);
    await t.point(item.getByText("Đã duyệt", { exact: true }));
    await t.say("Hạng mục chuyển Đã duyệt với số được thanh toán 2,5 triệu. Kế toán chuyển tiền ngoài hệ thống.", { ms: 5500 });
  });

  await scene({ id: "07-4-nhan-tien", title: "Flow 7 · Xác nhận nhận tiền", badge: f7("CLUB LEADER"),
    card: ["Flow 7 · Xác nhận nhận tiền", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/budgets` }, async (t) => {
    const { app } = t;
    await t.invoices();
    await t.say("Phía Leader, em mở lại ngân sách của sự kiện.", { ms: 1500 });
    await t.pickBudget();
    const item = card(t);
    await t.scrollTo(item.getByText("Số tiền được duyệt thanh toán"), 380);
    await t.say("Leader nhận tiền từ kế toán rồi xác nhận trên hệ thống. Mỗi hạng mục chỉ được thanh toán một lần.");
    await t.click(item.getByRole("button", { name: "Xác nhận đã nhận tiền" }), { after: 900 });
    await t.confirm();
    await t.point(item.getByText("Đã thanh toán", { exact: true }));
    await t.say("Hạng mục chuyển Đã thanh toán. Tiệc liên hoan không được tài trợ nên không cần quyết toán.");
    await t.scrollTo(app.getByRole("combobox", { name: "Chọn sự kiện" }), 140);
    await t.point(app.getByText("Đã chuyển", { exact: true }));
    await t.say("Tổng đã chuyển là 6,5 triệu, ngân sách chuyển Đã đóng. Kết quả tài chính này đi vào đánh giá CLB.", { ms: 6000 });
  });

  // ───────────── Flow 8 — periodic report and club evaluation ─────────────
  await scene({ id: "08-1-nop-bao-cao", title: "Flow 8 · Nộp báo cáo định kỳ", badge: f8("CLUB LEADER"),
    card: ["Flow 8 · Báo cáo định kỳ và đánh giá", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/periodic-reports` }, async (t) => {
    const { app } = t;
    await t.say("Sang báo cáo định kỳ Fall 2026. Hệ thống điền sẵn thành viên, CLB chấm điểm phong trào.", { ms: 5000 });
    await t.scrollTo(app.getByText(/^2\. Thông tin sự kiện/), 110);
    await t.say("Sự kiện trong kỳ cũng được điền sẵn; CLB bổ sung mô tả và link minh chứng cho từng sự kiện.");
    // The custom field's <label> is not tied to its textarea, so find the textarea in the same box.
    const plan = app.locator("div.rounded-xl").filter({ hasText: "Kế hoạch hoạt động kỳ tới" }).locator("textarea");
    await t.scrollTo(plan, 300);
    await t.say("ICPDP yêu cầu thêm mục kế hoạch kỳ tới. Em điền mục này rồi nộp báo cáo.");
    await t.type(plan, "Tháng 1: tuyển thành viên K22. Tháng 3: Workshop AI cơ bản, phụ trách: Trần Gia Bảo.", { delay: 18 });
    await t.click(app.getByRole("button", { name: "Nộp báo cáo đã lưu" }), { after: 2200 });
    await t.scrollTo(app.getByRole("heading", { name: "Fall 2026" }).last(), 120);
    await t.point(app.getByText("Đã nộp", { exact: true }).first());
    await t.say("Báo cáo chuyển Đã nộp. Hệ thống giữ snapshot số liệu của lần nộp này để ICPDP thẩm định.", { ms: 5500 });
  });

  await scene({ id: "08-2-tham-dinh", title: "Flow 8 · Thẩm định báo cáo", badge: f8("ICPDP OFFICER"),
    card: ["Flow 8 · Thẩm định báo cáo", "ICPDP · Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/periodic-reports" }, async (t) => {
    const { app } = t;
    await t.say("ICPDP lọc các báo cáo đang chờ thẩm định trong đợt Fall 2026.", { ms: 3000 });
    await t.click(app.getByRole("button", { name: /^Chờ thẩm định/ }), { after: 1200 });
    await t.click(app.getByRole("listitem").filter({ hasText: CLUB }).getByRole("link"), { after: 2200 });
    await t.say("Em đối chiếu số liệu lúc nộp với dữ liệu hệ thống, thành viên, sự kiện và minh chứng.", { ms: 4500 });
    await t.say("Báo cáo đầy đủ nên em chấp nhận. Nếu thiếu, em trả sửa kèm lý do và mục cần sửa.");
    await t.type(app.getByLabel("Ghi nhận cho kỳ đánh giá"), "Báo cáo đầy đủ, minh chứng rõ ràng.");
    await t.click(app.getByRole("button", { name: "Xác nhận quyết định" }), { after: 900 });
    await t.confirm();
    await t.point(app.getByText("Đã chấp nhận", { exact: true }).first());
    await t.say("Báo cáo chuyển Đã chấp nhận và trở thành đầu vào cho kỳ đánh giá.", { ms: 4500 });
  });

  await scene({ id: "08-3-danh-gia", title: "Flow 8 · Sinh, chốt và công bố đánh giá", badge: f8("ICPDP OFFICER"),
    card: ["Flow 8 · Đánh giá CLB", "ICPDP · Cán bộ ICPDP"], cookie: cookie("officer"),
    start: "/workspace/evaluation-schemes" }, async (t) => {
    const { app } = t;
    await t.point(app.getByText("Đang áp dụng"));
    await t.say("Kỳ Fall 2026 dùng một scheme chung, tổng trọng số 100%, D1 đến D3 là ba nhóm bắt buộc.");
    await t.click(app.getByRole("link", { name: "Đánh giá CLB", exact: true }), { after: 300 });
    await app.getByRole("button", { name: /^Sinh bản nháp/ }).waitFor();
    await t.pause(800);
    await t.say("Các CLB khác đã được chốt. Em sinh bản nháp cho CLB còn lại từ dữ liệu hệ thống.");
    await t.click(app.getByRole("button", { name: /^Sinh bản nháp/ }), { after: 2500 });
    const row = app.getByRole("row").filter({ hasText: CLUB });
    await t.scrollTo(row, 300);
    await t.click(row.getByRole("link", { name: "Mở" }), { after: 2200 });
    await t.say("Mỗi tiêu chí có điểm và dữ liệu nguồn. Tài chính ở flow 7 là đầu vào của D6.");
    const d6 = app.getByRole("listitem").filter({ hasText: "D6" });
    await t.click(d6.getByRole("button", { name: "Xem dữ liệu" }), { after: 1500 });
    const d3 = app.getByRole("listitem").filter({ hasText: "D3" });
    await t.point(d3.getByText("Thiếu dữ liệu"));
    await t.say("D3 chưa đủ phản hồi nên được đánh dấu thiếu dữ liệu, không bị tính là 0 điểm.");
    await t.scrollTo(app.getByRole("listitem").filter({ hasText: "D8" }), 420);
    await t.point(app.getByRole("listitem").filter({ hasText: "D8" }).getByText("100"));
    await t.say("D8 lấy từ hồ sơ vi phạm UC40; CLB không có vi phạm nên đạt 100 điểm.", { ms: 4000 });
    await t.click(app.getByRole("button", { name: "Chốt kết quả" }), { after: 900 });
    await t.confirm();
    await t.point(app.getByText("Xuất sắc", { exact: true }).first());
    await t.say("Sau khi chốt, hệ thống tính tổng điểm trên các tiêu chí có dữ liệu và xếp loại.", { ms: 4500 });
    await t.click(app.getByRole("link", { name: /Về/ }).first(), { after: 2000 });
    await t.say("Toàn bộ CLB trong kỳ đã chốt, nên em công bố kết quả cho cả kỳ.");
    await t.click(app.getByRole("button", { name: "Công bố kết quả" }), { after: 900 });
    await t.confirm();
    await t.scrollTo(app.getByRole("row").filter({ hasText: CLUB }), 300);
    await t.point(app.getByRole("row").filter({ hasText: CLUB }).getByText("Đã công bố"));
    await t.say("Kết quả chuyển Đã công bố. Điều chỉnh sau này phải tạo bản sửa mới.", { ms: 4500 });
  });

  await scene({ id: "08-4-xem-ket-qua", title: "Flow 8 · Leader xem kết quả", badge: f8("CLUB LEADER"),
    card: ["Flow 8 · Kết quả đánh giá", "Club Leader · Nguyễn Minh An"], cookie: cookie("an"),
    start: `/club/${clubId}/evaluations` }, async (t) => {
    const { app } = t;
    await t.point(app.getByText(/^Tổng điểm/));
    await t.say("Leader chỉ thấy kết quả đã công bố, gồm tổng điểm, xếp loại và điểm từng tiêu chí.");
    await t.click(app.locator("article").filter({ hasText: "Tuân thủ tài chính" }).getByText("Nguồn tính điểm"), { after: 1200 });
    await t.say("Mỗi tiêu chí mở được nguồn tính điểm, ví dụ tuân thủ tài chính lấy từ ngân sách ở flow 7.");
    await t.say("Phiên bản hiện tại chưa có chức năng CLB phản biện kết quả đánh giá.", { ms: 4500 });
  });
} finally {
  await rec.close();
}

if (!only.length) {
  const flow7 = ["07-1-ngan-sach", "07-2-nop-chung-tu", "07-3-doi-soat", "07-4-nhan-tien"].map((id) => files[id]);
  const flow8 = ["08-1-nop-bao-cao", "08-2-tham-dinh", "08-3-danh-gia", "08-4-xem-ket-qua"].map((id) => files[id]);
  buildVideo(path.join(outDir, "07-kinh-phi-quyet-toan.mp4"), [{ title: "Flow 7 · Kinh phí và quyết toán", files: flow7 }]);
  buildVideo(path.join(outDir, "08-bao-cao-danh-gia.mp4"), [{ title: "Flow 8 · Báo cáo định kỳ và đánh giá CLB", files: flow8 }]);
  const total = buildVideo(path.join(outDir, "UCMS-demo-flow-7-8.mp4"), [
    { title: "Flow 7 · Kinh phí và quyết toán", files: flow7 },
    { title: "Flow 8 · Báo cáo định kỳ và đánh giá CLB", files: flow8 }]);
  console.log("total seconds", total.toFixed(1));
}
