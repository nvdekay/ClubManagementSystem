# Handoff dự án UCMS — cập nhật 2026-10-11

> **Snapshot lịch sử.** UC23/RBAC động đã bị thay thế ngày 13/10/2026. Không dùng file này để
> kết luận trạng thái hiện tại; xem [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

Ảnh chụp trạng thái để mở session mới. Đây là handoff hiện hành theo `docs/05-implementation/README.md`.
Nguồn chân lý: `.rules/`, `docs/SRS.md`, `.sdd/specs/feat-*/SPEC.md`, checklist của feature và source.
Nếu tài liệu tổng quan cũ khác source/SPEC/TASKS của feature mới nhất, ưu tiên source/SPEC/TASKS.

## Bắt đầu session mới

1. Đọc `.rules/README.md`, rồi quy tắc tầng liên quan (`.rules/backend.md` / `.rules/frontend.md`).
2. Chạy `git status --short`; không reset/checkout/dọn thay đổi chưa rõ nguồn gốc. Đọc diff trước khi sửa file đang đổi.
3. Đọc handoff này, `docs/05-implementation/README.md`, sau đó SPEC/TASKS trong `.sdd/specs/feat-*/` của luồng nhận tiếp.
4. `docs/05-implementation/TASKS.md` và `IMPLEMENTATION_BACKLOG.md` là phân rã/backlog ban đầu, chưa được đồng bộ hết với các UC ICPDP mới. Dùng checklist feature và source để xác minh trạng thái thực.
5. Không chỉnh sơ đồ. Thay schema (`server/src/infra/db/**`), thêm dependency hoặc sửa `.env*` phải tuân thủ `.rules/` và hỏi người dùng trước khi cần thiết.
6. Trao đổi với người dùng bằng tiếng Việt; code, commit message, comment bằng tiếng Anh. Chỉ commit/push khi được yêu cầu; không thêm `Co-Authored-By`/logo Claude.

## Trạng thái repo và môi trường

- Nhánh `khanhnvd`, HEAD `15539ae` — UC39: báo cáo định kỳ theo kỳ, số liệu hệ thống, yêu cầu bổ sung và báo cáo thiếu.
- Nhánh đang đồng bộ `origin/khanhnvd`; worktree sạch tại thời điểm cập nhật. `main`/`origin/main` cũ hơn, không tự merge/push.
- Backend `:3000` và Vite `:5173` hiện không chạy (kết nối bị từ chối khi kiểm tra). Không xác minh trạng thái Mongo/dữ liệu local trong lần cập nhật này. Có thể khởi động app qua `npm run dev`; xem `server/src/infra/db/README.md` trước thao tác DB/seed.
- Không chạy test trong lần cập nhật handoff này. Các checklist feature được nêu dưới đây ghi trạng thái kiểm tra từ lần triển khai tương ứng; chưa có một lượt `npm run check` tổng thể mới trong lần này.

## Quyết định sản phẩm đã chốt

- ICPDP là role `ICPDP_OFFICER`; UC08/UC11 xử lý một review task và một quyết định mỗi lượt.
- UC10: người được đề cử cần membership `Active`; không để nhiệm kỳ Chủ nhiệm chồng lấn.
- Recruitment campaign nằm trong một kỳ `academicCalendar`; campaign trùng chỉ cảnh báo.
- UC21: ngày hiệu lực đổi trạng thái là hôm nay theo `Asia/Ho_Chi_Minh`, không hồi tố.
- Membership unique từng phần `(clubId,userId)` khi `Active`/`Inactive`; `Left` quay lại bằng membership mới; `Banned` không được nhận lại. Xin rời (UC22) không tự đổi trạng thái membership; người đang giữ ghế BCN khiến request ở trạng thái `Held`.
- Google OAuth chấp nhận mọi email đã xác minh (`allowedEmailDomains: ["*"]`); tài khoản ICPDP demo mặc định `icpdp.admin@gmail.com`.
- UC48: một tiêu chí `overall`, 1–5 sao và nhận xét bắt buộc, có thể ẩn danh.
- UC50 là góp ý một chiều cho CLB hoặc ICPDP, có thể ẩn danh; sinh viên chỉ xem danh sách đã gửi. UC51/UC52 tạm hoãn sau khi đổi phạm vi UC50.
- UI dùng Be Vietnam Pro, tông cyan/sky/mint; workspace có sidebar trái. ICPDP “Khám phá CLB” hiển thị danh sách ngay tại `/icpdp/clubs` trong workspace.
- Màn khám phá CLB public dùng card cho từng CLB và hiển thị trạng thái “Tuyển thành viên” khi đang mở tuyển.

## Tình trạng use case

“Đã triển khai” nghĩa là feature có luồng code chính và checklist triển khai tương ứng đã đánh dấu; không đồng nghĩa toàn bộ tổ hợp E2E/visual QA đã được nghiệm thu lại trong session này.

### Student / Club member

- Đã triển khai các luồng chính: UC01/02 (đăng nhập và workspace/dashboard), UC06/07 (khám phá CLB/sự kiện, hồ sơ thành lập/upload), UC17/18 (ứng tuyển và sàng lọc), UC20 (onboarding phía sinh viên), UC22/24 (xin rời và không gian thành viên), UC29 (đăng ký/hủy/waitlist cơ bản), UC31 (sinh viên tự check-in), UC48 (gửi đánh giá), UC50 (góp ý một chiều).
- Còn thiếu/hạn chế cần lưu ý:
  - UC01: chưa nghiệm thu browser E2E bằng Google OAuth thật; trước đây QA có dùng session tạo sẵn.
  - UC07: xử lý dọn asset Cloudinary mồ côi nếu ghi Mongo thất bại còn thiếu.
  - UC18: checklist còn test tập trung cho capacity/bulk/waitlist promotion.
  - UC21: scheduler A2 quét trạng thái đầu học kỳ chưa có.
  - UC31: phía CLB chưa có check-in thủ công A1 và màn tạo/hiển thị QR hoàn chỉnh; luồng tự check-in của student đã có. UC32 chốt điểm danh chưa có.
  - UC49: phía CLB chưa có màn xem tổng hợp feedback; `summarizeFeedback` đã có test. Chốt ngưỡng `feedbackMinRespondents` trước khi hoàn thiện chính sách.
  - UC50: sự kiện liên quan chưa bao gồm sự kiện đang diễn ra.

### ICPDP và các luồng quản trị đã được bổ sung

- Đã triển khai: UC03/04/08/11/13/15 (quản trị ICPDP, policy, thành lập/duyệt, đề cử-xác nhận BCN, vòng đời CLB); UC26 (duyệt đề xuất sự kiện); UC34/35/37/39 (báo cáo sau sự kiện, giải ngân, đối soát, báo cáo định kỳ); UC40 (vi phạm); UC41/42/43 (thang đánh giá và đánh giá CLB); UC44 (danh mục tài sản); UC46 (duyệt booking); UC53/54 (sự kiện cấp trường và lời mời CLB); UC55 (xuất dữ liệu).
- UC05 đã rút; UC51/52 đang hoãn theo quyết định đổi phạm vi UC50.
- Nhiều luồng ICPDP đã có UI/API/test nhưng phần visual QA vẫn còn trong checklist feature; kiểm tra `.sdd/specs/feat-*/TASKS.md` trước khi tuyên bố hoàn tất nghiệm thu.
- Một số luồng ICPDP hiện có màn xử lý/duyệt nhưng thiếu luồng đầu vào tương ứng phía CLB (xem danh sách dưới). Có thể demo bằng dữ liệu seed nhưng không nên coi đó là E2E hoàn chỉnh từ đầu đến cuối.

### Workflow phía CLB còn thiếu hoặc chưa hoàn chỉnh

- UC12 tạo kế hoạch chuyển giao; UC14 yêu cầu tạm ngưng.
- UC19 rubric đánh giá ứng viên; UC23 quản lý role.
- UC25 gửi đề xuất sự kiện; UC27 công bố sự kiện; UC28 hủy/đổi lịch; UC30 quản trị/promote waitlist; UC31 A1 check-in thủ công/QR phía CLB; UC32 chốt điểm danh.
- UC33 gửi báo cáo sau sự kiện; UC36 gửi khoản chi/đối soát; UC38 gửi báo cáo định kỳ.
- UC45 tạo booking; UC47 hủy/giải phóng booking.
- UC49 xem tổng hợp phản hồi.
- UC15 đã có luồng ICPDP tạm ngưng/kích hoạt lại/giải thể; cần phân biệt với UC14 là yêu cầu từ phía CLB.
- UC25/26/27, UC33/34, UC36/37, UC38/39 và UC45/46/47 là các chuỗi liên quan: phần duyệt ICPDP có thể đã code trong khi khởi tạo/gửi yêu cầu phía CLB chưa có.

## Checklist feature nên xem trước khi nhận việc

- Đã có implementation và các kiểm tra feature ghi hoàn tất, nhưng visual QA còn mở ở một số feature: `feat-data-export` (UC55), `feat-evaluation-schemes` (UC41), `feat-property-catalog` (UC44), `feat-school-events` (UC53/54), `feat-club-evaluations` (UC42/43), `feat-violations` (UC40), `feat-event-proposal-review` (UC26), `feat-budget-disbursements` (UC35), `feat-club-lifecycle` (UC15), `feat-recruitment-onboarding` (UC20), `feat-budget-reconciliation` (UC37), `feat-booking-review` (UC46), `feat-periodic-reports` (UC39).
- `feat-recruitment-screening` (UC18): bổ sung test capacity/bulk/waitlist.
- `feat-student-event-registration` (UC29) ghi đã hoàn tất check/build/DB/visual QA.
- Trạng thái này được đọc từ các checklist liên quan; hãy mở file TASKS hiện hành vì có thể đã được cập nhật sau handoff.

## Dữ liệu demo và lệnh thường dùng

- Lệnh repo: `npm run dev`, `npm run check`, `npm run seed`, `npm run seed:demo -- --owner=<email> [--owner-name="Tên"]`, `npm run db:init`, `npm run db:verify`.
- Seed demo có thể dựng lại trên DB phù hợp bằng `npm run db:init && npm run seed && npm run seed:demo -- --owner=<Google email> --owner-name="Tên"`. Thao tác này tác động dữ liệu DB; xác nhận đúng môi trường trước khi chạy, không chạy trên production.
- Thời gian sự kiện/demo phụ thuộc thời điểm chạy seed. Vì backend/Mongo không được xác minh lần này, không giả định fixture cũ vẫn tồn tại.

## Gợi ý thứ tự triển khai tiếp

1. Hoàn thành chuỗi event phía CLB: UC25 → ICPDP UC26 → UC27/28; tiếp đó UC31 A1 + UC32 và UC30.
2. Hoàn thành các workflow nguồn để khép chuỗi ICPDP đã có: UC33, UC36, UC38, UC45/47; sau đó UC49 và chốt chính sách ngưỡng feedback.
3. Bổ sung UC19, test còn thiếu UC18, UC23, UC12/14; xử lý các phần UC07/21/31/50 đã ghi ở trên.
4. Lên lịch nghiệm thu Google OAuth thật và visual QA các feature ICPDP mới trên browser (desktop/mobile, vi/en, light/dark theo phạm vi dự án).
