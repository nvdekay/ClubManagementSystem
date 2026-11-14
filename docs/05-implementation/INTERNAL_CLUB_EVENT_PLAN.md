# Kế hoạch Cập nhật Diagram & Triển khai Code — Sự kiện Nội bộ CLB (`feat-internal-club-events`)

> **Ngày lập:** 2026-11-14  
> **Nhánh làm việc:** `internal-event`  
> **Trạng thái:** Đã chốt toàn bộ quy tắc nghiệp vụ & giải quyết xung đột với `main` (`feat-sponsored-item-payments`).

---

## 1. Tổng hợp Quy tắc Nghiệp vụ Đã Chốt (Baseline)

### 1.1. Tách biệt 2 Luồng Chức năng (2 Nút bấm & 2 Trang riêng)
Không dùng chung 1 form tạo sự kiện để tránh xung đột validation giữa sự kiện đề xuất và sự kiện nội bộ:

1. **Nút 1 — "Tạo sự kiện nội bộ" (`/club/:clubId/events/internal/new` & `/club/:clubId/events/:eventId/internal-edit`):**
   - Cố định `audienceScope = "MEMBERS_ONLY"` và **không có ngân sách trường** (`budgetLines` không tồn tại trên form/DTO).
   - Có **3 hành động trên form**:
     - `Lưu nháp` → lưu ở trạng thái `DRAFT` (cho phép lưu nháp chưa cần kiểm tra hạn 24h hoặc kiểm tra khi kích hoạt tạo).
     - `Tạo sự kiện nội bộ` → chuyển sang `CREATED` (sự kiện đã tạo chính thức nhưng chưa công bố cho thành viên CLB).
     - `Tạo & Công bố ngay` → tạo `CREATED` kèm cấu hình đăng ký/check-in (UC27) và chuyển thẳng sang `PUBLIC` trong 1 luồng.
   - **Cho phép sửa nội dung ở cả `DRAFT` và `CREATED`** (`title`, `objective`, `plan`, `capacity`, `riskCategory`, `venueText`, `propertyId`, `bookingIds`, `startAt`, `endAt`).
   - **Không tạo** `eventProposalVersions`, `approvalTasks`, `eventBudgets`, hay `eventDefenseSessions`.

2. **Nút 2 — "Đề xuất sự kiện với ICPDP" (`/club/:clubId/events/new` & `/club/:clubId/events/:eventId/edit`) — Phương án B:**
   - Hỗ trợ:
     - `audienceScope = "PUBLIC"` (có hoặc không xin ngân sách trường); **HOẶC**
     - `audienceScope = "MEMBERS_ONLY"` **nhưng BẮT BUỘC có ít nhất 1 hạng mục ngân sách** (`budgetLines.length >= 1`). Nếu chọn `MEMBERS_ONLY` mà `budgetLines` rỗng khi lưu/nộp đề xuất → báo lỗi rõ ràng và hướng dẫn dùng chức năng **"Tạo sự kiện nội bộ"**.
   - Đi theo **vòng đời 14 trạng thái đề xuất ICPDP** (`Draft → Pending Approval → Under Review → Approved → Upcoming → Ongoing → Completed → Report Submitted → Closed`, cùng `Revision Requested`, `Re-defense Pending`, `Rejected`, `Expired`, `Cancelled`), áp dụng báo trước 7 ngày (`proposalNoticeHours`), bảo vệ sự kiện (BR63), quyết định tài trợ từng hạng mục (UC26/UC35–UC37) và báo cáo hậu sự kiện (UC33/UC34).

### 1.2. Vòng đời 6 Trạng thái của Sự kiện Nội bộ Tự túc (`MEMBERS_ONLY`, không ngân sách)
- **`DRAFT`**: Bản nháp nội bộ; chỉ Club Leader của CLB nhìn thấy; **không** hiện ở ICPDP (`UC02`) và **không** hiện cho thành viên CLB.
- **`CREATED`**: Đã tạo chính thức nhưng chưa công bố cho thành viên CLB; cho phép sửa nội dung và đổi lịch (tuân thủ quy tắc `>= 24h`); đã hiển thị trong danh sách `Internal events` của ICPDP (`UC02`).
- **`PUBLIC`**: Ban chủ nhiệm công bố sự kiện (UC27) cho thành viên CLB; chỉ hiển thị trong Không gian thành viên CLB (`UC24`), **không** hiển thị trên Cổng sự kiện công khai (`UC06`); **khoá hoàn toàn việc đổi lịch/sửa giờ** (chỉ còn cho phép huỷ `cancel`).
- **`ONGOING`**: Scheduler tự động chuyển từ `PUBLIC → ONGOING` khi `now >= startAt` (mở check-in UC31; vẫn cho phép huỷ trước khi chốt điểm danh).
- **`FINISH`**: Trạng thái kết thúc cuối cùng khi `now >= endAt` (gồm cả `ONGOING → FINISH` và catch-up `PUBLIC → FINISH` nếu scheduler bị trễ).
  - Chốt điểm danh (`UC32 finalize`) tại `FINISH` chỉ bật `attendanceFinalized = true` và **giữ nguyên `FINISH`** (mở khoá `UC32 unlock` bởi `ATTENDANCE_UNLOCK` cũng giữ nguyên `FINISH`).
  - **Không** qua Báo cáo hậu sự kiện (`UC33`/`UC34`), **không** bị gắn cờ quá hạn báo cáo hậu sự kiện, **không** chặn tạo sự kiện mới.
  - Tự động tổng hợp vào **Báo cáo định kỳ (`UC38`)** và **Đánh giá CLB (`UC42`)**.
- **`CANCELLED`**: Trạng thái huỷ cuối cùng khi Club Leader huỷ (`UC28` từ `DRAFT`, `CREATED`, `PUBLIC`, `ONGOING` khi chưa chốt điểm danh) hoặc khi CLB bị tạm ngừng/giải thể (`UC15`).

### 1.3. Quy tắc Báo trước `>= 24h` & Khoá Đổi lịch sau `PUBLIC`
1. **Khi tạo sự kiện nội bộ (`DRAFT → CREATED` hoặc `Tạo & Công bố ngay`):**
   - Bắt buộc `startAt - now >= 24 giờ` (`INTERNAL_EVENT_NOTICE_HOURS = 24`).
   - **Không có bất kỳ ngoại lệ nào** (kể cả khi chỉ dùng `venueText` hay dùng phòng sinh hoạt cố định `UC58`).
2. **Khi sự kiện nội bộ đang ở `CREATED` (chưa `PUBLIC`):**
   - Cho phép chỉnh sửa lịch (`startAt`, `endAt`) nhưng **thời điểm bắt đầu mới bắt buộc `newStartAt - now >= 24 giờ`**.
   - Hệ quả tự nhiên: nếu lịch cũ chỉ còn `< 24h` nữa là diễn ra, CLB không thể đẩy lịch lên sớm hơn mà chỉ có thể lùi lịch về tương lai sao cho `newStartAt >= now + 24h`.
3. **Khi sự kiện nội bộ đã `PUBLIC` (hoặc `ONGOING`):**
   - **Khoá cứng lịch trình**: cấm tuyệt đối hành động `reschedule` / sửa `startAt`, `endAt`, địa điểm.
   - Vẫn cho phép **Huỷ sự kiện (`cancel` → `CANCELLED`)** (nếu chưa chốt điểm danh; áp dụng ghi nhận `isLateCancellation` nếu huỷ sát giờ theo chính sách).

### 1.4. Địa điểm, Phòng sinh hoạt cố định (`UC58`) & Đặt cơ sở vật chất (`UC45`/`UC46`)
- Cho phép nhập đồng thời `venueText` + chọn `propertyId` + đính kèm `bookingIds`.
- **Quyền sử dụng phòng được phân bổ theo kỳ (`UC58` — `property.type === "ROOM"`):**
  - Nếu CLB chọn `propertyId` là phòng `ROOM` đã được ICPDP phân bổ `Approved` cho **chính CLB đó** trong khung giờ `[startAt, endAt]` của sự kiện:
    - Cho phép gắn trực tiếp `propertyId` vào sự kiện mà không báo lỗi "room allocation uses its own flow".
    - Trong kiểm tra xung đột `BR15`, booking `ROOM` `Approved` của **chính CLB đó** bao phủ `[startAt, endAt]` được tính là quyền sử dụng hợp lệ của CLB, **không** bị tự chặn là `Blocking Conflict`.
- **Đặt cơ sở vật chất dùng chung của trường (`HALL`, `STAGE`, `OUTDOOR`, `EQUIPMENT` — `UC45`/`UC46`):**
  - Vẫn tuân thủ đầy đủ quy định đặt cơ sở vật chất hiện hành của trường (`bookingNoticeDays` của `UC45` và duyệt `UC46` độc lập với quy tắc 24h của sự kiện nội bộ).

### 1.5. ICPDP Dashboard & Thống kê (`UC02`)
- **Ô KPI & Danh sách `Internal events` (`/workspace/internal-events`):**
  - Đếm và hiển thị mọi sự kiện có `audienceScope === "MEMBERS_ONLY"` **không** ở trạng thái nháp hoặc đã huỷ/từ chối/hết hạn (`state` thuộc `["CREATED", "PUBLIC", "ONGOING", "FINISH", "Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"]`; loại trừ `DRAFT`, `Draft`, `CANCELLED`, `Cancelled`, `Rejected`, `Expired`).
- **Biểu đồ `Events by month` trên ICPDP Dashboard (`UC02`):**
  - Nâng cấp từ 1 chuỗi (`count`) lên **2 chuỗi tách biệt**:
    - `publicCount`: Sự kiện công khai (`audienceScope === "PUBLIC"` trong tập trạng thái ghi nhận).
    - `internalCount`: Sự kiện nội bộ CLB (`audienceScope === "MEMBERS_ONLY"` trong tập trạng thái ghi nhận, gồm cả tự túc `CREATED`/`PUBLIC`/`ONGOING`/`FINISH` và nội bộ có ngân sách `Approved`..`Closed`).

---

## 2. Phần 1 — Kế hoạch Cập nhật Diagram (`docs/03-diagrams/`) & Tài liệu

> **Lưu ý:** Ở commit `673794e` và `79e4a8c`, các tài liệu và 8 file `.drawio` đã có bản cập nhật bước 1 (6 trạng thái `DRAFT → CREATED → PUBLIC → ONGOING → FINISH / CANCELLED` và tách 2 nút). Tuy nhiên, 3 quy tắc vừa chốt sau cùng (**báo trước `>= 24h` thay vì "bỏ giới hạn 7d"**, **chỉ `CREATED` được đổi lịch `>= 24h` còn `PUBLIC` khoá lịch**, và **Phương án B cho phép `MEMBERS_ONLY` có ngân sách qua đề xuất ICPDP**) cần được cập nhật đồng bộ vào các cell dưới đây.

### 2.1. Danh sách các file `.drawio` và `mxCell` cần cập nhật

1. **[`docs/03-diagrams/UCMS_State_Diagrams.drawio`](../03-diagrams/UCMS_State_Diagrams.drawio) (Diagram `06 Event`):**
   - `n2`: Cập nhật ghi chú đổi lịch: sự kiện nội bộ (`MEMBERS_ONLY` không ngân sách) **chỉ cho phép sửa/đổi lịch ở `CREATED`** (`newStartAt >= now + 24h`, cập nhật trực tiếp không qua UC26); khi đã sang `PUBLIC` thì khoá lịch (chỉ cho phép `Cancel`).
   - `int_grp`: Đổi tiêu đề khung từ `"no 7-day notice limit"` thành `"≥ 24 h advance notice, no ICPDP proposal/defense"`.
   - `int_e1` (`DRAFT → CREATED`): Ghi rõ điều kiện `"UC25 create internal [startAt ≥ now + 24 h]"`.
   - Thêm cạnh tự lặp `int_e_cr_resched` trên `int_cr` (`CREATED → CREATED`): `"UC28 reschedule / edit [newStartAt ≥ now + 24 h]"`.
   - `int_e2` (`CREATED → PUBLIC`): Ghi rõ `"UC27 publish (members only; locks schedule)"`.

2. **[`docs/03-diagrams/UCMS_Main_Workflow.drawio`](../03-diagrams/UCMS_Main_Workflow.drawio) (Diagram `mw-07-event-management`):**
   - `f7_s1`: `"2 separate actions: Propose to ICPDP (PUBLIC, or MEMBERS_ONLY w/ budget) OR Create internal (MEMBERS_ONLY, no budget)"`.
   - `f7_s2`: `"Check notice (≥ 7d proposal / ≥ 24h internal, no exception) & conflicts (venueText / room / bookings)"`.
   - `f7_d1`: Đổi `"Public proposal?"` thành `"ICPDP proposal?"`.
   - `f7_lbl_app_no`: `"No: unbudgeted internal (CREATED, ≥ 24h; in UC02 excl. DRAFT/CANCELLED)"`.

3. **[`docs/03-diagrams/UCMS_Swimlane_Flows.drawio`](../03-diagrams/UCMS_Swimlane_Flows.drawio) (Diagram `swim-04` — `04 Event Proposal`):**
   - `f04-9`: `"2 separate actions: Propose to ICPDP (PUBLIC or budgeted MEMBERS_ONLY, 7d) OR Create internal (no budget, ≥ 24h)"`.
   - `f04-11`: `"Unbudgeted internal club event?"`.
   - `f04-17`: `"Approve after all funding decisions (notify caps, windows → Approved) or CREATED (internal → PUBLIC for members; schedule locked once PUBLIC)"`.
   - `f04-35`: `"Yes - CREATED directly (≥ 24h notice; reschedule only before PUBLIC; shown in UC02)"`.

4. **[`docs/03-diagrams/UCMS_Sequence_Diagrams.drawio`](../03-diagrams/UCMS_Sequence_Diagrams.drawio) (Diagram `seq05p2` — `05 Submit event proposal (2/2)`):**
   - `c14`: Đổi nhãn nhánh `alt` từ `"[Separate internal flow (/internal-events) (no ICPDP review, no 7d limit)]"` thành `"[Separate internal flow (/events/internal) (no budget, ≥ 24h notice, no ICPDP review)]"`.

5. **[`docs/03-diagrams/UCMS_Class_Diagrams.drawio`](../03-diagrams/UCMS_Class_Diagrams.drawio):**
   - `n1206` (trang `03 Resubmit-Event-Proposal`): Ghi rõ luồng Đề xuất yêu cầu `PUBLIC` hoặc `MEMBERS_ONLY` có `budgetLines >= 1` (`proposalNoticeHours`); sự kiện nội bộ không ngân sách đi luồng riêng (`>= 24h`, `DRAFT → CREATED`).
   - `n2268` (trang `05 Publish-Event-and-Open-Registration`): Ghi rõ `CREATED → PUBLIC` khoá lịch trình của sự kiện nội bộ.
   - `n4662` (trang `10 Cancel-or-Reschedule-Event`): Cập nhật `ClubEvent.reschedule()` — chỉ áp dụng cho `{Approved, Upcoming}` (đề xuất ICPDP → tạo revision mới `Pending Approval`) hoặc `CREATED` (sự kiện nội bộ → cập nhật trực tiếp với `newStartAt >= now + 24h`); trạng thái `PUBLIC` và `ONGOING` của sự kiện nội bộ **không** được `reschedule`, chỉ được `cancel()`.

6. **[`docs/03-diagrams/README.md`](../03-diagrams/README.md) & Tài liệu Đặc tả (`docs/SRS.md`, `docs/02-use-cases/UCMS_UseCase_Specification_v2.md`, `docs/01-business-analysis/UCMS_Business_System_Analysis.md`):**
   - Đồng bộ ghi chú cập nhật ngày `2026-11-14` theo đúng 3 quy tắc vừa chốt (`>= 24h` không ngoại lệ, khoá lịch sau `PUBLIC`, Phương án B cho `MEMBERS_ONLY` có ngân sách, và biểu đồ 2 chuỗi ở `UC02`).
   - Chạy script kiểm tra cấu trúc XML, tính duy nhất của `id` và tính hợp lệ của `source`/`target` trên toàn bộ 14 file `.drawio` (`DRAWIO_TOTAL_ERRORS: 0`).

---

## 3. Phần 2 — Kế hoạch Coding Chi tiết theo Từng Tầng Kiến trúc

### Bước 0: Khởi tạo SDD Spec (`.sdd/specs/feat-internal-club-events/`)
Theo quy tắc tại [`.rules/README.md`](../../.rules/README.md), tạo thư mục `.sdd/specs/feat-internal-club-events/` gồm:
- `SPEC.md`: Tóm tắt vấn đề, hành vi chi tiết (tách 2 luồng, 6 trạng thái nội bộ, hạn 24h, khoá lịch sau `PUBLIC`, ngoại lệ phòng `UC58`, thống kê 2 chuỗi `UC02`), tiêu chí nghiệm thu (`[ ]`) và ngoài phạm vi.
- `TASKS.md`: Checklist từng bước triển khai và kết quả kiểm chứng.

---

### Bước 1: Database Schema (`DBML` & Generated Mongoose Schema)
> **Lưu ý tuân thủ [`.rules/backend.md`](../../.rules/backend.md):** Trước khi chạy lệnh cập nhật `server/src/infra/db/ucms-schema.generated.ts`, cần xác nhận duyệt thay đổi schema.

1. **[`docs/05-implementation/UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml):**
   - Cập nhật `Enum eventState` bổ sung 6 giá trị trạng thái của sự kiện nội bộ bên cạnh 14 giá trị hiện hữu:
     `"DRAFT"`, `"CREATED"`, `"PUBLIC"`, `"ONGOING"`, `"FINISH"`, `"CANCELLED"`.
   - Tổng số bảng giữ nguyên `54`, tổng số enum giữ nguyên `28`.
2. **[`server/src/infra/db/ucms-schema.generated.ts`](../../server/src/infra/db/ucms-schema.generated.ts):**
   - Chạy `python server/src/infra/db/generate-ucms-schema.py` để tái sinh `ENUMS.eventState` trong `ucms-schema.generated.ts`.

---

### Bước 2: Tầng Domain (`server/src/domain/`)
Không phụ thuộc `infra` hay `interface`, đảm bảo strict typing (không dùng `any`):

1. **[`server/src/domain/club-event.ts`](../../server/src/domain/club-event.ts):**
   - Mở rộng `ClubEventState` thêm `"DRAFT" | "CREATED" | "PUBLIC" | "ONGOING" | "FINISH" | "CANCELLED"`.
   - Thêm helper nhận diện sự kiện:
     - `INTERNAL_CLUB_EVENT_STATES = ["DRAFT", "CREATED", "PUBLIC", "ONGOING", "FINISH", "CANCELLED"] as const`
     - `isInternalClubEventState(state: string): boolean`
   - Tách DTO đầu vào cho sự kiện nội bộ:
     - `InternalClubEventInput`: gồm `title`, `objective`, `plan`, `startAt`, `endAt`, `venueText?`, `propertyId?`, `capacity`, `riskCategory`, `bookingIds` (không có `audienceScope` và không có `budgetLines`).
   - Mở rộng `ClubEventAction` (hoặc thêm action nội bộ rõ ràng):
     - Hỗ trợ tạo nháp nội bộ (`createInternalDraft`), tạo chính thức (`createInternal` → `CREATED`), tạo và công bố ngay (`createAndPublishInternal` → `PUBLIC`), lưu sửa sự kiện nội bộ ở cả `DRAFT` và `CREATED` (`saveInternal`).
2. **[`server/src/domain/club-event-rules.ts`](../../server/src/domain/club-event-rules.ts):**
   - Khai báo hằng số `INTERNAL_EVENT_NOTICE_HOURS = 24`.
   - **Rule Phương án B cho Đề xuất ICPDP (`validateClubEventProposalInput` / `validateClubEventInput`):**
     - Nếu đi luồng đề xuất ICPDP mà `input.audienceScope === "MEMBERS_ONLY"` và `input.budgetLines.length === 0` → ném `DomainError("VALIDATION_ERROR", "internal events without university budget must use the internal event flow")`.
   - **Rule tạo & sửa sự kiện nội bộ (`validateInternalClubEventInput` & `assertInternalEventNotice`):**
     - Kiểm tra các trường bắt buộc, `endAt > startAt`, học kỳ hợp lệ trong lịch học vụ, `capacity` nguyên dương, ít nhất `venueText` hoặc `propertyId`.
     - Khi chuyển sang `CREATED` (hoặc tạo `CREATED`/`PUBLIC` trực tiếp): bắt buộc `startAt.getTime() - now.getTime() >= 24 * 3_600_000` (`"internal event must be created at least 24 hours before start time"`).
   - **Rule đổi lịch sự kiện nội bộ (`assertInternalEventReschedule`):**
     - Chỉ cho phép khi `state === "CREATED"` (nếu `state === "PUBLIC"` hoặc `"ONGOING"` → ném `DomainError("CONFLICT", "published internal event schedule cannot be modified; only cancellation is allowed")`).
     - Bắt buộc `newStartAt.getTime() - now.getTime() >= 24 * 3_600_000` (`"rescheduled internal event start time must be at least 24 hours from now"`).
3. **[`server/src/domain/dashboard.ts`](../../server/src/domain/dashboard.ts):**
   - Cập nhật `RECORDED_EVENT_STATES`:
     `["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed", "CREATED", "PUBLIC", "ONGOING", "FINISH"] as const` (bao gồm các trạng thái sự kiện nội bộ trừ `DRAFT` và `CANCELLED`).
   - Nâng cấp kiểu dữ liệu biểu đồ tháng trên `IcpdpDashboardCharts`:
     - `DashboardMonthEventCount`: `{ month: string; count: number; publicCount: number; internalCount: number }` (giữ `count = publicCount + internalCount` để tương thích ngược, đồng thời cung cấp `publicCount` và `internalCount` cho biểu đồ 2 chuỗi).
4. **[`server/src/domain/event-checkin.ts`](../../server/src/domain/event-checkin.ts):**
   - Cho phép check-in khi `eventState` thuộc `["Upcoming", "Ongoing", "PUBLIC", "ONGOING"]`.
5. **[`server/src/domain/post-event-report.ts`](../../server/src/domain/post-event-report.ts):**
   - Giữ `assertReportSubmission` chỉ cho phép sự kiện công khai/đề xuất ở `Completed` (sự kiện nội bộ tự túc kết thúc ở `FINISH` không nộp báo cáo hậu sự kiện UC33).
6. **[`server/src/domain/data-export.ts`](../../server/src/domain/data-export.ts):**
   - Bổ sung nhãn trạng thái tiếng Việt/Anh cho `DRAFT`, `CREATED`, `PUBLIC`, `ONGOING`, `FINISH`, `CANCELLED` khi xuất báo cáo.

---

### Bước 3: Tầng Use Case (`server/src/usecase/`)

1. **[`server/src/usecase/club-event.ts`](../../server/src/usecase/club-event.ts):**
   - Bổ sung các use case tách biệt cho sự kiện nội bộ:
     - `createInternalClubEvent(deps, actor, clubId, input, mode: "draft" | "create" | "publish", publishInput?, now)`: kiểm tra quyền `club.event.manage`, gọi repository tạo sự kiện nội bộ ở `DRAFT`, `CREATED` hoặc `PUBLIC`.
     - Trong `actOnClubEvent`: hỗ trợ `save-internal` (ở `DRAFT` và `CREATED`), `submit-internal` (`DRAFT → CREATED`, kiểm tra `>= 24h`), `publish` (`CREATED → PUBLIC` hoặc `Approved → Upcoming`), `reschedule` (chặn `PUBLIC`/`ONGOING` nội bộ, kiểm tra `>= 24h` cho `CREATED`), `cancel` (`DRAFT`/`CREATED`/`PUBLIC`/`ONGOING` → `CANCELLED`).
2. **[`server/src/usecase/event-registration.ts`](../../server/src/usecase/event-registration.ts):**
   - Trong `assertOpen(ctx, now)`: chấp nhận `ctx.state === "Upcoming" || ctx.state === "PUBLIC"`.

---

### Bước 4: Tầng Infrastructure (`server/src/infra/db/`)

1. **[`server/src/infra/db/mongo-club-event-repository.ts`](../../server/src/infra/db/mongo-club-event-repository.ts):**
   - **Tách luồng tạo sự kiện nội bộ (`createInternal` / `saveInternal` / `submitInternal`):**
     - Lưu document vào `events` với `audienceScope: "MEMBERS_ONLY"`, `state: "DRAFT" | "CREATED" | "PUBLIC"`, `currentRevisionNo: 0`, không tạo `eventProposalVersions` hay `approvalTasks`.
     - Khi chuyển sang `CREATED` hoặc `PUBLIC`: kiểm tra `assertInternalEventNotice(input.startAt, now)` (`>= 24h` không ngoại lệ), kiểm tra xung đột `assess()`, gắn `propertyBookings.eventId` cho `bookingIds` hợp lệ, ghi `auditLogs` (`INTERNAL_EVENT_CREATED` / `EVENT_PUBLISHED`).
   - **Xử lý Phòng sinh hoạt cố định `UC58` (`property.type === "ROOM"`):**
     - Trong `assess()`:
       - Nếu `input.propertyId` trỏ tới một tài sản có `type === "ROOM"`: kiểm tra xem CLB có booking `ROOM` ở trạng thái `Approved` trong bảng `propertyBookings` bao phủ `[startAt, endAt]` hay không.
       - Khi truy vấn `bookingConflicts` trên `propertyId`: loại trừ các booking `Approved` có `clubId === event.clubId` và `property.type === "ROOM"` bao phủ khung giờ sự kiện (để CLB không tự xung đột với phòng được cấp của chính mình).
       - Các `bookingIds` đính kèm thêm vẫn chỉ dành cho cơ sở vật chất dùng chung (`HALL`, `STAGE`, `OUTDOOR`, `EQUIPMENT`) thuộc cùng CLB.
   - **Xử lý `act()` cho sự kiện nội bộ:**
     - `save` / `save-internal`: cho phép khi `state === "DRAFT"` hoặc `state === "CREATED"`. Nếu đang ở `CREATED` mà thay đổi `startAt`/`endAt`, bắt buộc `newStartAt >= now + 24h` và chạy lại `assess()`.
     - `publish`: cho phép từ `Approved → Upcoming` (đề xuất ICPDP) hoặc từ `CREATED → PUBLIC` (sự kiện nội bộ).
     - `reschedule`:
       - Nếu là sự kiện nội bộ (`isInternalClubEventState(event.state)`): chỉ cho phép khi `event.state === "CREATED"`, kiểm tra `newStartAt >= now + 24h`, chạy `assess()`, cập nhật trực tiếp trên `events` và giữ nguyên `state: "CREATED"`. Nếu `event.state === "PUBLIC"` hoặc `"ONGOING"` → ném `DomainError("CONFLICT", "published internal event schedule is locked")`.
       - Nếu là sự kiện đề xuất (`Approved` / `Upcoming`): giữ nguyên luồng tạo revision mới chuyển về `Pending Approval` (UC26).
     - `cancel`:
       - Nếu `event.state === "DRAFT"`: chuyển sang `CANCELLED`, giải phóng `bookingIds` nếu có, ghi audit.
       - Nếu `event.state` thuộc `["CREATED", "PUBLIC", "ONGOING"]`: gọi `cancelEventInSession()` chuyển sang `"CANCELLED"` (thay vì `"Cancelled"`).
2. **[`server/src/infra/db/event-cancellation.ts`](../../server/src/infra/db/event-cancellation.ts):**
   - Xác định trạng thái đích khi huỷ: `const targetState = isInternalClubEventState(String(event.state)) ? "CANCELLED" : "Cancelled";` và ghi đúng `targetState` vào `events` + `auditLogs`.
3. **[`server/src/infra/db/event-attendance-actions.ts`](../../server/src/infra/db/event-attendance-actions.ts):**
   - Mở rộng điều kiện trạng thái kết thúc sự kiện cho `correct`, `finalize`, `unlock`: chấp nhận `event.state === "Completed" || event.state === "FINISH"`.
   - Khi `finalize` hoặc `unlock` trên sự kiện `FINISH`: giữ nguyên `state: "FINISH"` (không đổi sang `Closed` hay `Completed`).
4. **[`server/src/infra/db/event-waitlist.ts`](../../server/src/infra/db/event-waitlist.ts) & [`mongo-event-registration-repository.ts`](../../server/src/infra/db/mongo-event-registration-repository.ts):**
   - Trong `increaseCapacity`: chấp nhận `["Approved", "Upcoming", "CREATED", "PUBLIC"]`.
   - Trong truy vấn đăng ký của sinh viên: giữ hoạt động với cả `Upcoming`/`Ongoing`/`Completed` và `PUBLIC`/`ONGOING`/`FINISH`/`CANCELLED`.
5. **[`server/src/infra/db/mongo-member-space-repository.ts`](../../server/src/infra/db/mongo-member-space-repository.ts):**
   - Danh sách sự kiện trong Không gian thành viên CLB (`UC24`): lấy các sự kiện của CLB có:
     - `audienceScope === "PUBLIC"` ở `["Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"]`, **HOẶC**
     - `audienceScope === "MEMBERS_ONLY"` ở `["PUBLIC", "ONGOING", "FINISH"]` (cho sự kiện nội bộ tự túc đã công bố) hoặc `["Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"]` (cho sự kiện nội bộ có ngân sách đã công bố).
     - Tuyệt đối không trả về `DRAFT` và `CREATED`.
6. **Báo cáo định kỳ (`UC38`), Đánh giá CLB (`UC42`) & Nhắc hạn báo cáo hậu sự kiện (`UC33`):**
   - [`mongo-periodic-report-repository.ts`](../../server/src/infra/db/mongo-periodic-report-repository.ts) & [`mongo-club-periodic-report-repository.ts`](../../server/src/infra/db/mongo-club-periodic-report-repository.ts): Mở rộng bộ lọc sự kiện hoàn thành trong kỳ gồm `["Completed", "Report Submitted", "Closed", "FINISH"]` và sự kiện huỷ gồm `["Cancelled", "CANCELLED"]`.
   - [`mongo-evaluation-repository.ts`](../../server/src/infra/db/mongo-evaluation-repository.ts): Mở rộng bộ lọc sự kiện kế hoạch/hoàn thành/huỷ trong kỳ để bao gồm `CREATED`, `PUBLIC`, `ONGOING`, `FINISH`, `CANCELLED`.
   - [`post-event-report-deadlines.ts`](../../server/src/infra/db/post-event-report-deadlines.ts), [`mongo-post-event-report-repository.ts`](../../server/src/infra/db/mongo-post-event-report-repository.ts), [`mongo-accountability-reminder-repository.ts`](../../server/src/infra/db/mongo-accountability-reminder-repository.ts): Chỉ truy vấn `state: "Completed"` (sự kiện nội bộ tự túc ở `FINISH` không phát sinh nghĩa vụ nộp báo cáo hậu sự kiện UC33).
7. **ICPDP Dashboard & Internal Events (`UC02`):**
   - [`mongo-dashboard-repository.ts`](../../server/src/infra/db/mongo-dashboard-repository.ts):
     - Truy vấn danh sách/bộ đếm `internalEvents`: lọc `organizerType: "CLUB"`, `audienceScope: "MEMBERS_ONLY"`, `state: { $in: [...RECORDED_EVENT_STATES] }` (tức loại trừ `DRAFT`, `Draft`, `CANCELLED`, `Cancelled`, `Rejected`, `Expired`).
   - [`dashboard-charts.ts`](../../server/src/infra/db/dashboard-charts.ts):
     - Trong aggregation `eventsByMonth`: tính đồng thời `publicCount` (`audienceScope !== "MEMBERS_ONLY"`) và `internalCount` (`audienceScope === "MEMBERS_ONLY"`), trả về `{ month, count, publicCount, internalCount }`.
   - [`dashboard-drilldown.ts`](../../server/src/infra/db/dashboard-drilldown.ts):
     - Cập nhật bộ lọc trạng thái đang hoạt động/đã ghi nhận bao gồm cả trạng thái nội bộ (`CREATED`, `PUBLIC`, `ONGOING`, `FINISH`).
8. **Scheduler chuyển trạng thái tự động & Các repository liên quan:**
   - [`interface/jobs/event-lifecycle-job.ts`](../../server/src/interface/jobs/event-lifecycle-job.ts) & `advanceLifecycle()` trong `mongo-club-event-repository.ts`:
     - Bổ sung chuyển tự động:
       - `PUBLIC → ONGOING` khi `startAt <= now < endAt`.
       - `PUBLIC → FINISH` và `ONGOING → FINISH` khi `endAt <= now`.
   - [`mongo-facility-booking-repository.ts`](../../server/src/infra/db/mongo-facility-booking-repository.ts), [`mongo-room-allocation-repository.ts`](../../server/src/infra/db/mongo-room-allocation-repository.ts), [`mongo-club-lifecycle-repository.ts`](../../server/src/infra/db/mongo-club-lifecycle-repository.ts), [`mongo-suspension-request-repository.ts`](../../server/src/infra/db/mongo-suspension-request-repository.ts), [`mongo-policy-repository.ts`](../../server/src/infra/db/mongo-policy-repository.ts), [`mongo-club-invitation-repository.ts`](../../server/src/infra/db/mongo-club-invitation-repository.ts):
     - Bổ sung `"CREATED"`, `"PUBLIC"`, `"ONGOING"` vào các danh sách trạng thái sự kiện đang hoạt động (active events) khi kiểm tra xung đột phòng/thiết bị, kiểm tra điều kiện tạm ngừng CLB (`UC14`), hoặc huỷ hàng loạt khi giải thể/tạm ngừng (`UC15`).

---

### Bước 5: Tầng Interface HTTP & OpenAPI (`server/src/interface/http/`)

1. **[`server/src/interface/http/club-event-routes.ts`](../../server/src/interface/http/club-event-routes.ts):**
   - Khai báo schema Zod `internalClubEventBody` riêng (không có `audienceScope`, không có `budgetLines`, có `mode: z.enum(["draft", "create", "publish"]).optional()`, kèm `publishInput` tuỳ chọn khi `mode === "publish"`).
   - Bổ sung các endpoint rõ ràng:
     - `POST /api/v1/clubs/:clubId/internal-events`: tạo sự kiện nội bộ (`DRAFT`, `CREATED`, hoặc `PUBLIC`).
     - `PUT /api/v1/clubs/:clubId/internal-events/:id`: cập nhật nội dung/lịch sự kiện nội bộ ở `DRAFT` hoặc `CREATED`.
     - `POST /api/v1/clubs/:clubId/internal-events/:id/create`: chuyển nháp nội bộ `DRAFT → CREATED` (kiểm tra `>= 24h`).
   - Giữ các endpoint hành động chung `/clubs/:clubId/events/:id/publish`, `/cancel`, `/reschedule`, `/capacity` hoạt động thống nhất theo rule của từng loại sự kiện.
2. **[`server/src/interface/http/openapi-club-events.ts`](../../server/src/interface/http/openapi-club-events.ts):**
   - Đăng ký đầy đủ các route mới vào OpenAPI spec để vượt qua `server/tests/unit/openapi.test.ts`.

---

### Bước 6: Tầng Frontend (`client/src/`)

1. **[`client/src/pages/club/ClubEventsPage.tsx`](../../client/src/pages/club/ClubEventsPage.tsx):**
   - Trên thanh header (khi `mode === "events"`), hiển thị **2 nút tách biệt**:
     - Nút **"Tạo sự kiện nội bộ"** → điều hướng tới `/club/${clubId}/events/internal/new`.
     - Nút **"Đề xuất sự kiện với ICPDP"** → điều hướng tới `/club/${clubId}/events/new`.
   - Trong bảng và panel chi tiết sự kiện:
     - Hiển thị badge trạng thái cho `DRAFT`, `CREATED`, `PUBLIC`, `ONGOING`, `FINISH`, `CANCELLED`.
     - Với sự kiện nội bộ ở `DRAFT` hoặc `CREATED`: hiện nút **"Chỉnh sửa"** dẫn tới `/club/${clubId}/events/${active.id}/internal-edit`.
     - Với sự kiện nội bộ ở `DRAFT`: hiện thêm nút **"Tạo sự kiện"** (`DRAFT → CREATED`).
     - Với sự kiện nội bộ ở `CREATED`: hiện nút **"Công bố cho thành viên"** (`CREATED → PUBLIC`, mở modal cấu hình đăng ký/check-in) và nút **"Đổi lịch"** (`reschedule`).
     - Với sự kiện nội bộ ở `PUBLIC` hoặc `ONGOING`: **ẩn nút "Đổi lịch"**, chỉ hiện nút **"Huỷ sự kiện"** (`cancel`).
2. **Trang mới [`client/src/pages/club/InternalClubEventPage.tsx`](../../client/src/pages/club/InternalClubEventPage.tsx) & đăng ký route trong [`client/src/main.tsx`](../../client/src/main.tsx):**
   - Route:
     - `/club/:clubId/events/internal/new`
     - `/club/:clubId/events/:eventId/internal-edit`
   - Form chuyên biệt cho sự kiện nội bộ:
     - Không có trường chọn đối tượng (mặc định hiển thị badge cố định `Nội bộ thành viên CLB`) và không có bảng hạng mục ngân sách.
     - Cho phép nhập đồng thời `venueText`, chọn `propertyId` (bao gồm cả phòng sinh hoạt được cấp `UC58` và cơ sở vật chất của trường), và đính kèm `bookingIds`.
     - Kiểm tra trực tiếp trên client: `startAt` phải cách thời điểm hiện tại ít nhất **24 giờ** (hiển thị lỗi rõ ràng ngay dưới ô `startAt` nếu `< 24h`; khi sửa sự kiện `CREATED` mà lịch cũ `< 24h`, chỉ cho phép chọn lịch mới ở tương lai `>= 24h`).
     - Khi tạo mới: có 3 nút `Lưu nháp (DRAFT)`, `Tạo sự kiện (CREATED)`, và `Tạo & Công bố ngay (PUBLIC)`.
     - Khi chỉnh sửa ở `CREATED`: lưu cập nhật trực tiếp (giữ trạng thái `CREATED`).
3. **[`client/src/pages/club/ClubEventProposalPage.tsx`](../../client/src/pages/club/ClubEventProposalPage.tsx):**
   - Cập nhật theo **Phương án B**:
     - Khi người dùng chọn `audienceScope === "MEMBERS_ONLY"`, hiển thị thông báo hướng dẫn: đề xuất sự kiện nội bộ lên ICPDP **bắt buộc có ít nhất 1 hạng mục ngân sách**; nếu sự kiện tự túc không xin ngân sách trường, cung cấp link chuyển nhanh sang trang **"Tạo sự kiện nội bộ"**.
     - Chặn submit/save trên form đề xuất nếu `audienceScope === "MEMBERS_ONLY"` và `budgetLines.length === 0`.
4. **[`client/src/components/custom/IcpdpDashboard.tsx`](../../client/src/components/custom/IcpdpDashboard.tsx) & [`client/src/pages/icpdp/InternalEventsPage.tsx`](../../client/src/pages/icpdp/InternalEventsPage.tsx):**
   - Cập nhật biểu đồ `Events by month` trên `IcpdpDashboard.tsx` để truyền 2 series (`publicCount` — Đề xuất công khai, `internalCount` — Sự kiện nội bộ CLB) vào `AppColumnChart`.
   - Cập nhật bộ lọc trạng thái trên `InternalEventsPage.tsx` hiển thị đầy đủ các trạng thái sự kiện nội bộ được ghi nhận (`CREATED`, `PUBLIC`, `ONGOING`, `FINISH`, cùng các trạng thái đề xuất có ngân sách `Approved`..`Closed`).
5. **Services, Hooks & Đa ngôn ngữ (`client/src/services/`, `client/src/hooks/`, `client/src/i18n/`):**
   - Cập nhật `services/clubEvents.ts`, `hooks/useClubEvents.ts`, `services/dashboard.ts`.
   - Bổ sung đầy đủ khoá dịch `vi` và `en` trong `client/src/i18n/clubEvents.ts` và `client/src/i18n/dashboard.ts` (tuân thủ [`.rules/frontend.md`](../../.rules/frontend.md)).

---

### Bước 7: Kế hoạch Kiểm thử & Nghiệm thu (Definition of Done)

1. **Unit Tests (`server/tests/unit/`):**
   - `club-event-rules.test.ts`:
     - Kiểm tra tạo sự kiện nội bộ `< 24h` bị từ chối (`400`), `>= 24h` hợp lệ.
     - Kiểm tra đổi lịch sự kiện nội bộ ở `CREATED` với `newStartAt < now + 24h` bị từ chối, `newStartAt >= now + 24h` hợp lệ.
     - Kiểm tra đổi lịch sự kiện nội bộ ở `PUBLIC` và `ONGOING` bị từ chối (`409`).
     - Kiểm tra Phương án B: đề xuất ICPDP có `audienceScope === "MEMBERS_ONLY"` nhưng `budgetLines: []` bị từ chối; có `budgetLines.length >= 1` hợp lệ.
   - `openapi.test.ts`: Đảm bảo các endpoint `/internal-events` khớp schema OpenAPI.
2. **Integration Tests (`server/tests/integration/`):**
   - Kiểm tra trọn vẹn vòng đời `DRAFT → CREATED → PUBLIC → ONGOING → FINISH` và `CANCELLED`.
   - Kiểm tra sử dụng phòng sinh hoạt cố định `UC58` (`ROOM` booking `Approved` của cùng CLB) không bị báo `Blocking Conflict` giả.
   - Kiểm tra `UC24` chỉ thấy sự kiện nội bộ từ lúc `PUBLIC`, `UC06` không thấy sự kiện nội bộ, `UC02` đếm đúng mọi sự kiện nội bộ trừ `DRAFT`/`CANCELLED` và trả về 2 chuỗi trên biểu đồ tháng.
   - Kiểm tra `UC32 finalize` ở `FINISH` giữ nguyên `FINISH`, không tạo nghĩa vụ báo cáo hậu sự kiện `UC33`, và tự động tổng hợp vào `UC38` / `UC42`.
3. **Kiểm tra tổng thể toàn repo:**
   - Chạy `npm run check` (constitution + lint + typecheck + unit/integration tests) và `npm run build --workspaces` đạt 100%.
