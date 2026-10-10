# Kế hoạch triển khai các UC còn lại

> Lập ngày 2026-10-10. Đối chiếu `docs/02-use-cases/UCMS_UseCase_Specification_v2.md` với route ở
> `server/src/interface/http/` và các spec ở `.sdd/specs/`. Cập nhật sau review Wave 1 ngày 2026-10-10; trạng thái triển khai và nghiệm thu được ghi riêng.

## 1. Hiện trạng

### Baseline đã làm và phần bổ sung Wave 1 (24 UC)

| Nhóm | UC |
|---|---|
| Xác thực, tài khoản, chính sách | UC01, UC02, UC03, UC04 |
| Thành lập CLB | UC06, UC07, UC08, UC09, UC10, UC11, UC13 |
| Tuyển và quản lý thành viên | UC16, UC17, UC18, **UC19**, UC20, UC21 (trừ A2), UC22, **UC23**, UC24 |
| Sự kiện (phía sinh viên) và góp ý | UC29, UC31, UC48, UC50 |

Không triển khai: UC05 (đã rút khỏi baseline), UC51/UC52 (bỏ khi UC50 chuyển thành góp ý một chiều —
`feat-student-feedback`).

### Phạm vi sau Wave 1 (25 UC/nhánh cần đối chiếu tiếp)

UC12, UC14, UC15, UC21 A2, UC25–28, UC30, UC32–47, UC49.

Danh sách này là phạm vi của các wave tiếp theo, không đồng nghĩa tất cả chưa có code.
Source hiện đã có phần ICPDP cho UC26 (`feat-event-proposal-review`), UC35
(`feat-budget-disbursements`), UC44 (`feat-property-catalog`), UC15 (`feat-club-lifecycle`),
UC41–43 (`feat-evaluation-schemes`, `feat-club-evaluations`) và route hồ sơ vi phạm.
Cần đọc SPEC/TASKS tương ứng trước khi nhận việc; không triển khai lại phần đã có. Các phần
ngoài Wave 1 chưa được review đầy đủ trong lượt này.

Schema đã có đủ collection cho mọi UC còn lại (`clubSuspensionRequests`, `transitionPlans`,
`candidateEvaluations`, `events`, `eventProposalVersions`, `eventBudgets`, `properties`,
`propertyBookings`, `violations`, `evaluations`, …). Phần việc chủ yếu là repository, usecase,
route, UI — gần như không thêm collection.

## 2. Thứ tự phụ thuộc

```
UC23 (role/quyền) ──► mọi UC cần permission riêng (thủ quỹ, ban sự kiện, ...)
UC44–46 (cơ sở vật chất) ──► UC25 (đề xuất sự kiện có đặt phòng)
UC25 ► UC26 ► UC27 ► UC28 / UC30 / UC32 ► UC33 ► UC34
                          └► ngân sách UC35 ► UC36 ► UC37
Sự kiện + ngân sách + báo cáo ──► UC12 (nạp nghĩa vụ tồn đọng)
UC28 + UC47 (huỷ) ──► UC15 (cascade khi tạm ngừng / giải thể)
UC40 ──► UC15 A1
Toàn bộ dữ liệu vận hành ──► UC41–43 (đánh giá CLB)
```

## 3. Các wave

### Wave 1 — Quản trị nội bộ CLB: đã triển khai, còn nghiệm thu UI

Đã merge tại `06b68d9`; bản sửa race tại `38203f5`. Review source xác nhận domain, usecase,
Mongo repository, route/OpenAPI, UI, i18n và test của UC19/UC23 đã có. Test bao gồm quyền truy
cập, các ngoại lệ nghiệp vụ, gán role đồng thời và khoá đánh giá khi đơn/campaign đổi trạng thái.

- UC19: đã triển khai các AC1–AC8; TASKS không còn task code mở.
- UC23: đã triển khai nghiệp vụ; SPEC/TASKS còn mục nghiệm thu trực quan tab “Vai trò” với
  `en`/`vi`, sáng/tối. Chưa đánh dấu Wave 1 hoàn tất nghiệm thu.
- Kiểm chứng ngày 2026-10-10: `npm run check` xanh (constitution, lint, typecheck; 79 test files / 335 tests, gồm integration Mongo). Lượt đầu thiếu dependency local `exceljs`/`pdfkit`; chạy `npm ci` theo lockfile rồi kiểm tra lại thành công, không đổi dependency khai báo.


| Feature | UC | Việc chính |
|---|---|---|
| `feat-club-roles` | UC23 | Danh sách role; tạo/sửa role, chọn permission (ẩn `LEADER_ONLY_CLUB_PERMISSIONS`); gán/thu hồi thành viên `Active`; mỗi thay đổi sinh một `clubRoleStructureVersions` mới; xem/so sánh phiên bản (A5); xử lý E1–E7. UI: tab "Vai trò" trong `ClubSettingsPage`. |
| `feat-candidate-evaluation` | UC19 | Rubric đã có trong campaign (`server/src/usecase/recruitment-campaign.ts`). Thêm chấm theo tiêu chí, nhận xét tự do khi không có rubric (E1); mỗi người chấm một bản riêng, hiện điểm tổng và độ phân tán (A1) trong `RecruitmentReviewPage`; bản đánh giá bất biến khi đơn đã có quyết định. |

### Wave 2 — Cơ sở vật chất: đã triển khai cả CLB và ICPDP

| Feature | UC | Việc chính |
|---|---|---|
| `feat-property-catalog` | UC44 | Tái sử dụng ICPDP CRUD `properties` đã có; nối FR-05 hiển thị yêu cầu vướng blackout. |
| `feat-facility-booking` | UC45, UC46, UC47 | Draft/nộp/nộp lại theo version; ICPDP nhận và quyết định có lý do/phương án thay thế; CLB theo dõi/huỷ. Khoá slot trong transaction; cascade dùng chung và job In Use/Completed. |

Đã chốt ngày 2026-10-10: booking chọn ngày + một trong bốn slot Hoà Lạc. Hạn gửi Slot 1/2
trước 07:30, Slot 3 trước 09:50, Slot 4 trước 12:20 trong ngày sử dụng; đúng mốc là quá hạn.
Hai lịch khớp slot khác nhau không dùng khoảng đệm; dữ liệu lịch cũ/sự kiện ngoài slot
giữ khoảng đệm policy. Huỷ trước giờ bắt đầu dưới 24 giờ là huỷ muộn. Không đổi schema/dependency. Xem
`.sdd/specs/feat-facility-booking/SPEC.md` và `TASKS.md`. Nghiệm thu Chrome dùng API fixture
ở en/vi, sáng/tối, 390/1440 px; test repository dùng Mongo thật.

Kiểm chứng ngày 2026-10-10: `npm run check` xanh (81 test files / 361 tests, gồm integration
Mongo); `npm run build -w client` thành công. Màn CLB ở `/club/:clubId/bookings`; ICPDP ở
`/workspace/bookings`. Snapshot nộp booking nằm trong auditLogs, không cần collection mới.
UI dùng AppSelect, AppTable/AppPagination và AppDialog cho tạo/sửa. Seed gồm DE312/DE222/DE223
và bốn booking theo slot; hướng dẫn test ở [WAVE_2_BOOKING.md](WAVE_2_BOOKING.md).

### Wave 3 — Vòng đời sự kiện phía CLB

| Feature | UC | Việc chính |
|---|---|---|
| `feat-event-proposals` | UC25, UC26 | CLB nộp đề xuất (`eventProposalVersions`, ngân sách dự kiến `eventBudgets`, liên kết booking); ICPDP thẩm định theo mô hình claim/decision giống UC08. |
| `feat-event-publishing` | UC27, UC28 | Công bố và mở đăng ký — nối với UC29 đã có (thay dữ liệu seed). Huỷ/đổi lịch, gồm A1 huỷ cascade từ hệ thống. |
| `feat-event-capacity` | UC30 | Danh sách chờ và tự động promote khi có suất trống (UC29 đã chừa chỗ). |
| `feat-event-attendance-close` | UC32 | Chốt điểm danh, khoá `attendances`. |
| `feat-event-feedback-view` | UC49 | CLB xem phản hồi tổng hợp, tôn trọng `feedbackMinRespondents`. Cần thêm permission `club.feedback.view` nếu chưa có trong danh mục. |

### Wave 4 — Sau sự kiện và tài chính

| Feature | UC | Việc chính |
|---|---|---|
| `feat-post-event-report` | UC33, UC34 | CLB nộp báo cáo theo `reportDeadlines`; ICPDP thẩm định và đóng; áp `enforceOverdueReportBlock` (báo cáo quá hạn chặn đề xuất mới). |
| `feat-event-finance` | UC35, UC36, UC37 | Ghi nhận giải ngân; khoản chi kèm chứng từ (`financialEvidences`, dùng lại upload file hiện có); nộp quyết toán; đối soát. |

### Wave 5 — Vòng đời CLB (cần dữ liệu wave 3–4)

| Feature | UC | Việc chính |
|---|---|---|
| `feat-transition-planning` | UC12 | Phía CLB lập kế hoạch: tự nạp nghĩa vụ tồn đọng (sự kiện, ngân sách, báo cáo); nêu người giữ mới từng ghế; A1 chuyển giao sớm; A2 đổi danh sách role ban điều hành; E1 chặn nộp khi nghĩa vụ chưa có người nhận. Nộp ra `ApprovalTask` cho UC13 (đã có). |
| `feat-club-suspension` | UC14, UC15 | Leader gửi yêu cầu (E1 liệt kê sự kiện/booking sẽ bị huỷ); ICPDP tạm ngừng / kích hoạt lại / giải thể; cascade gọi hàm huỷ của UC28/UC47; guard BR34 ở tuyển thành viên, đề xuất sự kiện, booking. |
| `feat-scheduler` | UC15 bước 5–6, UC21 A2 | Một scheduler dùng chung: chuyển `Dissolving` → `Dissolved` theo học kỳ; quét tái xác nhận thành viên đầu kỳ. |

### Wave 6 — Tuân thủ và đánh giá

| Feature | UC | Việc chính |
|---|---|---|
| `feat-periodic-reports` | UC38, UC39 | Báo cáo hoạt động định kỳ và thẩm định. |
| `feat-violations` | UC40 | Hồ sơ vi phạm, biện pháp khắc phục (`correctiveActions`); liên kết UC15 A1. |
| `feat-club-evaluation` | UC41, UC42, UC43 | Cấu hình scheme; sinh bản nháp từ dữ liệu thật (điểm danh, feedback, báo cáo, tài chính); xem lại, chốt và công bố. |

## 4. Phân công và thứ tự nhận việc

Theo phân công ngày 2026-10-10, người dùng phụ trách các UC phía CLB (Club Leader / Club Member).
Phần ICPDP giữ thành luồng riêng; chưa chỉ định người phụ trách trong tài liệu này.

| Luồng | Người dùng phụ trách | Phần phối hợp ICPDP |
|---|---|---|
| Booking | UC45, UC47 | UC44 danh mục; UC46 duyệt booking |
| Sự kiện | UC25, UC27, UC28, UC30, UC31 A1, UC32, UC49 | UC26 duyệt đề xuất đã có SPEC và hợp đồng UC25 |
| Báo cáo, tài chính | UC33, UC36, UC38 | UC34, UC35, UC37, UC39 |
| Vòng đời CLB | UC12, UC14, UC21 A2 (phối hợp scheduler) | UC13 đã có; UC15 và scheduler dùng chung |
| Tuân thủ, đánh giá | Phần CLB theo dõi/khắc phục vi phạm, xem kết quả hoặc phản biện theo SPEC | UC40, UC41–43; đối chiếu phần đã triển khai trước khi bổ sung |

Thứ tự đề xuất: hoàn tất nghiệm thu Wave 1 → UC45/UC47 → UC25/UC27/UC28 →
UC30/UC31 A1/UC32/UC49 → UC33/UC36/UC38 → UC12/UC14. Có thể làm nhóm điểm danh,
phản hồi song song với booking khi hợp đồng API đã chốt. UC21 A2 cần chốt scheduler trước.

Các feature chung trong bảng wave cần tách TASKS phía CLB và ICPDP, thống nhất endpoint,
permission, trạng thái và payload trước khi code. Riêng UC25 đọc
`.sdd/specs/feat-event-proposal-review/SPEC.md` để dùng đúng hợp đồng với UC26 hiện có.

## 5. Quy trình mỗi feature (theo `.rules/`)

1. Copy `.sdd/specs/_template.md` thành `.sdd/specs/feat-{name}/SPEC.md` + `TASKS.md`; chốt chỗ mơ
   hồ với nhóm trước khi code.
2. Code theo 4 tầng `domain → usecase → interface → infra`; cập nhật `openapi.ts`; chuỗi UI qua
   i18next (en/vi).
3. Bổ sung seed demo, test; `npm run check` xanh; tick `TASKS.md`.

## 6. Quyết định còn cần chốt

1. **Scheduler.** Cron chạy trong process server, hay endpoint để ICPDP bấm chạy tay? Đối chiếu job hiện có trước khi quyết định; cần cho UC21 A2 và vòng đời CLB.
2. **UC12.** Chấp nhận làm sớm với danh mục nghĩa vụ tồn đọng để trống, hay chờ dữ liệu sự kiện, tài chính và báo cáo?

Đã chốt: UC23 đầy đủ theo `feat-club-roles/SPEC.md`; cơ cấu khởi lập là phiên bản 1,
Leader tạo role thường và phân quyền theo danh mục. Phân công phía CLB đã ghi ở mục 4.
