# Handoff dự án UCMS — 2026-10-09 (cập nhật cuối ngày)

Ảnh chụp trạng thái để mở session mới hoặc chia sẻ với đồng đội. Nguồn chân lý vẫn là
`docs/SRS.md`, `.sdd/specs/feat-*/SPEC.md`, source và `.rules/`; nếu khác biệt, tin source/SPEC mới
nhất. Đây là handoff duy nhất còn hiệu lực.

## Bắt đầu session mới

1. Đọc `.rules/README.md`, rồi file quy tắc của tầng sắp làm (`.rules/backend.md`, `.rules/frontend.md`).
2. Chạy `git status --short`. **Không** `reset`/`checkout`/dọn file: có thể có thay đổi chưa commit
   của người khác (xem mục “Trạng thái git” bên dưới). Trước khi sửa một file đang modified, đọc diff.
3. Đọc handoff này, `docs/05-implementation/TASKS.md`, rồi SPEC/TASKS của luồng nhận tiếp.
4. Không chỉnh các sơ đồ. Đổi schema (`server/src/infra/db/**`), thêm dependency hay động vào `.env*`
   phải hỏi người dùng trước (`.rules/backend.md` — Chính sách AI Agent).
5. Trao đổi với người dùng bằng **tiếng Việt**; code, commit message, comment bằng tiếng Anh. Commit
   **không** kèm dòng `Co-Authored-By`/logo Claude. Chỉ commit/push khi người dùng yêu cầu; chia nhỏ
   commit theo luồng và kiểm tra từng commit trước khi push.

## Trạng thái git

- Nhánh `khanhnvd`, đã push toàn bộ: phần của Claude (tới UC21 đổi trạng thái thành viên và handoff
  này) và phần giao diện của Codex (logo Trường Đại học FPT ở header/đăng nhập/sidebar, làm lại màn
  chọn workspace với token `--color-picker-*`). Worktree sạch tại thời điểm ghi handoff.

## Quyết định đã chốt với người dùng

- ICPDP chỉ có một role `ICPDP_OFFICER`; UC08/UC11 một review task và một quyết định mỗi lần duyệt.
- UC10: người được đề cử cần membership `Active`; không cho nhiệm kỳ Chủ nhiệm chồng lấn.
- Recruitment campaign nằm trọn trong một kỳ của `academicCalendar`; campaign trùng chỉ cảnh báo.
- UC21: ngày hiệu lực đổi trạng thái luôn là **hôm nay** (`Asia/Ho_Chi_Minh`), không hồi tố.
- Membership unique từng phần `(clubId,userId)` khi `Active`/`Inactive`; `Left` quay lại bằng membership
  mới, `Banned` không được nhận lại (BR46). Xin rời (UC22) không tự đổi membership; người giữ ghế BCN
  đã xác nhận → request `Held`.
- Đăng nhập: **mọi email Google đã xác minh** (`allowedEmailDomains: ["*"]`); admin là `icpdp.admin@gmail.com`.
- **UC48:** một tiêu chí duy nhất `overall`, **1–5 sao + nhận xét bắt buộc**, tuỳ chọn ẩn danh.
- **UC50 đổi phạm vi:** không phải ticket khiếu nại mà là **góp ý một chiều** — Student chọn gửi cho
  CLB hoặc ICPDP, tuỳ chọn ẩn danh, chỉ xem lại danh sách đã gửi; dùng collection `complaints` đã
  chỉnh (`recipient`, `isAnonymous`, `clubId` không bắt buộc). **UC51/UC52 tạm không làm.**
- Giao diện: tông “tươi mát” cyan/sky/mint, Be Vietnam Pro, khung quản lý có sidebar trái
  (`WorkspaceShell`), màn chọn workspace tách riêng; ít card, dùng danh sách/section phẳng.
- Dữ liệu PDP: 48 CLB + logo (Cloudinary `ucms/club-logos/`), 21 sự kiện + 8 ảnh bìa
  (`ucms/event-covers/`). Trang `/events` dựng giống PDP Event/Index (lọc trạng thái, tìm kiếm, 8/trang).

## Tình trạng theo use case

“Full-stack” = đã có UI → hook/service → API → use case/repository → Mongo cho luồng chính, có
automated test và đã QA trên trình duyệt (desktop/mobile, `vi`/`en`, sáng/tối) trừ khi ghi khác.

### Đã full-stack

| UC | Nội dung | Spec |
|---|---|---|
| UC01/UC03 | Google OAuth, session, workspace, quản lý tài khoản (`/icpdp/accounts`) | `feat-auth-access`, `feat-workspace-routing` |
| UC02 | Dashboard Student/CLB/ICPDP theo permission, lỗi cô lập từng panel | `feat-role-dashboard` |
| UC04 | Policy có phiên bản; chặn policy làm vô hiệu quyết định đã ban hành (409) | `feat-policy-management` |
| UC06 | Danh bạ/chi tiết CLB có logo; `/events` giống PDP, event detail mở cả sự kiện đã kết thúc | `feat-public-discovery` |
| UC07→UC11 | Thành lập CLB: nộp hồ sơ → ICPDP duyệt → cấu hình → đề cử BCN → xác nhận | `feat-club-*`, `feat-board-nomination-confirmation` |
| UC13 | ICPDP xác nhận chuyển giao nhiệm kỳ (queue/detail/claim/decision) | `feat-leadership-transition-confirmation` |
| UC16→UC18, UC20 | Đợt tuyển → nộp đơn → review/quyết định → onboard | `feat-recruitment-*` |
| UC21 | Trang “Thành viên” CLB: thi hành yêu cầu rời (A1), Active ⇄ Inactive, cấm có lý do, lịch sử | `feat-membership-lifecycle` |
| UC22 | Xin rời CLB từ không gian thành viên | `feat-membership-lifecycle` |
| UC24 | “CLB của tôi” → không gian thành viên chỉ đọc | `feat-member-space` |
| UC29 | Đăng ký sự kiện (form, quota nguyên tử, waitlist, huỷ, đăng ký lại) | `feat-student-event-registration` |
| UC31 | Check-in bằng mã/QR deep link, một `Attendance`, walk-in, mở feedback window | `feat-student-event-checkin` |
| UC48 | Phản hồi sự kiện 1–5 sao + nhận xét, bất biến, ẩn danh | `feat-student-event-feedback` |
| UC50 | Góp ý một chiều tới CLB/ICPDP + hộp thư CLB/ICPDP | `feat-student-feedback` |

### Có một phần

- **UC01:** chưa nghiệm thu E2E bằng Google OAuth thật trên trình duyệt (QA dùng session mint sẵn).
- **UC07 upload:** Cloudinary đã chạy thật; còn mở xử lý asset mồ côi khi ghi Mongo thất bại.
- **UC18:** thiếu test tập trung cho capacity/bulk/waitlist. **UC19** (rubric) chưa có.
- **UC21:** A2 (quét trạng thái đầu học kỳ, scheduler) chưa có.
- **UC31:** A1 (CMB check-in thủ công) và màn tạo/hiển thị QR phía CLB chưa có (hợp làm cùng UC32).
- **UC48→UC49:** hàm tổng hợp BR40 `summarizeFeedback` đã có test; chưa có màn CLB đọc tổng hợp.
  Giá trị ban đầu `feedbackMinRespondents` (quyết định D3) vẫn mở.
- **UC50:** danh sách “sự kiện liên quan” chỉ có sự kiện sắp tới/đã kết thúc, chưa có sự kiện đang diễn ra.

### Chưa có workflow

UC12 (tạo kế hoạch chuyển giao), UC14–UC15 (tạm ngưng/giải thể CLB), UC19, UC20 màn tiếp nhận phía
CLB, UC23 (quản lý role), UC25–UC28 (đề xuất/duyệt/công bố/huỷ sự kiện), UC30 (promote waitlist),
UC32 (chốt điểm danh), UC33+ (báo cáo, tài chính, booking, đánh giá), UC49, UC51–UC52.
Schema có collection cho các UC này nhưng **schema không có nghĩa workflow đã có**.

## Môi trường local

- MongoDB: `mongod` Homebrew, replica set `rs0` (cần cho transaction), `MONGO_URI` trong `.env`.
  `npm run db:verify` hiện báo **50/50 collection, 0 index thiếu**; schema generated 50 collection,
  **27 enum** (`python3 server/src/infra/db/generate-ucms-schema.py` chạy được trở lại).
- Đang chạy: backend `:3000`, Vite `:5173`, mongod `:27017`.
- Tài khoản Google của người phát triển có các ngữ cảnh: Student, ICPDP (`ICPDP_OFFICER`), Chủ
  nhiệm HEBE Club (đủ permission), thành viên Mây Mưa Club.
- Tài khoản QA `*@ucms.test`: `qa.student`, `qa.applicant`, `qa.applicant2`–`4`, `qa.uc13.1`–`4`.

### Fixture QA trong DB local (không có trong seed)

| Fixture | ID / ghi chú |
|---|---|
| Sự kiện sắp tới mở đăng ký `[QA] Workshop nhảy hiện đại…` (HEBE, 2 chỗ, waitlist) | `a2000000000000000000aa29` |
| Sự kiện đang diễn ra `[QA] Check-in demo — Đêm nhạc HEBE` (mã `QA-2026`, cho walk-in) | `a2000000000000000000aa31` — giờ bắt đầu/kết thúc tính theo lúc tạo, sẽ hết hạn |
| Kế hoạch chuyển giao `[QA] CLB Chuyển giao Nhiệm kỳ` | `ac130000000000000000000f` |
| Membership qa.applicant @ HEBE (đang `Active`) | `ac2400000000000000000001` |
| CLB QA cũ `CLB-6348CB00`, hồ sơ/đợt tuyển `[QA] …`, góp ý `[QA] …` | dữ liệu QA, chờ quyết định dọn |

Script QA (Playwright qua Microsoft Edge, mint session, tạo fixture) nằm trong scratchpad của
session cũ và **không** còn ở session mới; nếu cần QA lại, viết lại script hoặc tạo fixture mới.

## Kiểm chứng gần nhất (2026-10-09)

- `npm run check` (constitution, lint, typecheck, test) **xanh: 189/189 test**, gồm integration chạy
  thật với Mongo (không skip). Client build pass (cảnh báo bundle > 500 kB).
- `server/tests/global-setup.ts` tự xoá database `ucms-*-test-<pid>` của tiến trình đã chết trước mỗi
  lượt test; sau lượt chạy đầy đủ chỉ còn database `ucms` và các database không thuộc dự án.
- Mỗi commit đã push được kiểm tra riêng (typecheck/lint/test) trong worktree tạm trước khi push.

## Ưu tiên tiếp theo

1. Hoàn thiện nhóm sự kiện phía CLB: UC25–UC27 (đề xuất/duyệt/công bố, cấu hình mã check-in và
   form đăng ký), UC31 A1 + UC32 (điểm danh/chốt điểm danh), UC30 (promote waitlist), UC49 (xem phản hồi).
2. UC19 rubric + test capacity/bulk/waitlist cho UC18; UC20 màn tiếp nhận; UC23 quản lý role.
3. UC12/UC14/UC15 (tạo kế hoạch chuyển giao, tạm ngưng/giải thể CLB).
4. Nghiệm thu UC01 bằng Google OAuth thật; quyết định dọn dữ liệu QA trong DB local.
