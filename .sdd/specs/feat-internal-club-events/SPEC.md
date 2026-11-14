# SPEC: feat-internal-club-events

> Nguồn: [`docs/05-implementation/INTERNAL_CLUB_EVENT_PLAN.md`](../../../docs/05-implementation/INTERNAL_CLUB_EVENT_PLAN.md)
> (quy tắc nghiệp vụ đã chốt ngày 2026-11-14). SPEC này là hợp đồng giữa server và client; chỗ nào
> plan lệch với code hiện có thì mục "Điều chỉnh so với plan" bên dưới là bản được áp dụng.

## Vấn đề
Sự kiện nội bộ CLB tự túc (`MEMBERS_ONLY`, không xin ngân sách trường) đang đi chung form và vòng
đời đề xuất ICPDP (nhánh `direct` → `Approved`), chịu hạn báo trước 7 ngày và lẫn validation với
đề xuất. CLB cần một luồng riêng, nhẹ hơn: tự tạo, tự công bố cho thành viên, báo trước 24 giờ.

## Hành vi

### Hai luồng tách biệt
- **Sự kiện nội bộ** (luồng mới): luôn `audienceScope = "MEMBERS_ONLY"`, không có `budgetLines`,
  không tạo `eventProposalVersions` / `approvalTasks` / `eventBudgets` / `eventDefenseSessions`,
  `currentRevisionNo = 0`.
- **Đề xuất ICPDP** (luồng cũ, Phương án B): `PUBLIC`, hoặc `MEMBERS_ONLY` với
  `budgetLines.length >= 1`. `MEMBERS_ONLY` mà `budgetLines` rỗng bị từ chối ở cả `save` lẫn
  `submit` (và `create`) với lỗi `validation`:
  `internal events without university budget must use the internal event flow`.

### Vòng đời sự kiện nội bộ
`DRAFT → CREATED → PUBLIC → ONGOING → FINISH`, và `CANCELLED`.

| Trạng thái | Ai thấy | Được làm |
|---|---|---|
| `DRAFT` | người có `club.event.manage` | sửa, tạo chính thức, huỷ |
| `CREATED` | thêm ICPDP (UC02) | sửa nội dung + lịch (lịch mới `>= now + 24h`), công bố, đổi lịch, huỷ |
| `PUBLIC` | thêm thành viên CLB (UC24); **không** lên cổng công khai UC06 | đăng ký, tăng sức chứa, huỷ; **khoá lịch/địa điểm** |
| `ONGOING` | như `PUBLIC` | check-in, huỷ (khi chưa chốt điểm danh) |
| `FINISH` | như `PUBLIC` | sửa/chốt/mở khoá điểm danh — luôn giữ nguyên `FINISH` |
| `CANCELLED` | — | — |

- Scheduler: `PUBLIC → ONGOING` khi `startAt <= now < endAt`; `PUBLIC|ONGOING → FINISH` khi
  `endAt <= now`.
- `FINISH` không sinh nghĩa vụ báo cáo hậu sự kiện (UC33/UC34), không chặn tạo sự kiện mới; được
  tính vào UC38 và UC42.
- Tương ứng trạng thái khi mở rộng các bộ lọc có sẵn: `PUBLIC ↔ Upcoming`, `ONGOING ↔ Ongoing`,
  `FINISH ↔ Completed`, `CANCELLED ↔ Cancelled`, `CREATED ↔ Approved` (giữ chỗ phòng/tài sản).

### Quy tắc 24 giờ (`INTERNAL_EVENT_NOTICE_HOURS = 24`)
- `DRAFT` lưu nháp: không kiểm tra 24h (vẫn kiểm tra lịch ở tương lai, học kỳ hợp lệ).
- Sang `CREATED` (tạo trực tiếp, `DRAFT → CREATED`, hoặc tạo & công bố): `startAt - now >= 24h`,
  không ngoại lệ → lỗi `validation`.
- Sửa/đổi lịch ở `CREATED`: nếu `startAt`/`endAt` thay đổi thì `newStartAt - now >= 24h`.
- `PUBLIC`/`ONGOING`: `reschedule` và sửa → lỗi `conflict`
  (`published internal event schedule is locked; only cancellation is allowed`).

### Địa điểm và phòng UC58
- Nhận đồng thời `venueText`, `propertyId`, `bookingIds`; cần ít nhất `venueText` hoặc `propertyId`.
- Trong kiểm tra xung đột (áp dụng cho mọi sự kiện CLB): booking `Approved`/`In Use` của **chính
  CLB** trên property loại `ROOM`, bao phủ trọn khung giờ, không bị tính là xung đột.
- `bookingIds` vẫn chỉ nhận booking không phải `ROOM` (giữ nguyên quy tắc hiện có).

### API (prefix `/api/v1`, mọi mutation cần phiên + `X-CSRF-Token`, quyền `club.event.manage`)

Thân `InternalClubEventInput`:
`{ title, objective, plan, startAt, endAt, venueText?, propertyId?, capacity, riskCategory, bookingIds }`
(ISO datetime; `strict`, gửi `audienceScope` hay `budgetLines` là lỗi `validation`).

Thân `publishInput` (giống `/events/:id/publish` trừ `expectedVersion`):
`{ registrationOpenAt?, registrationCloseAt?, checkInOpenAt, checkInCloseAt, allowWalkIn, waitlistEnabled }`.

| Endpoint | Thân | Kết quả |
|---|---|---|
| `POST /clubs/:clubId/internal-events` | `InternalClubEventInput & { mode?: "draft" \| "create" \| "publish", publishInput? }` — `mode` mặc định `draft`; `publishInput` bắt buộc khi và chỉ khi `mode = "publish"` | `201 ClubEventDetail`, state `DRAFT` / `CREATED` / `PUBLIC` |
| `PUT /clubs/:clubId/internal-events/:id` | `InternalClubEventInput & { expectedVersion }` | `200 ClubEventDetail`; chỉ ở `DRAFT`, `CREATED` |
| `POST /clubs/:clubId/internal-events/:id/create` | `{ expectedVersion }` | `200 ClubEventDetail`; `DRAFT → CREATED` |
| `POST /clubs/:clubId/events/:id/publish` | như cũ | thêm `CREATED → PUBLIC` |
| `POST /clubs/:clubId/events/:id/reschedule` | như cũ | với `CREATED`: cập nhật trực tiếp, giữ `CREATED` |
| `POST /clubs/:clubId/events/:id/cancel` | như cũ | thêm `DRAFT`/`CREATED`/`PUBLIC`/`ONGOING → CANCELLED` |

`ClubEventDetail` giữ nguyên hình dạng; sự kiện nội bộ trả `audienceScope: "MEMBERS_ONLY"`,
`budgetLines: []`, `versions: []`. `GET /clubs/:clubId/events` trả cả hai loại.

### UC02 (ICPDP)
- "Sự kiện nội bộ được ghi nhận" = `MEMBERS_ONLY` ở
  `Approved, Upcoming, Ongoing, Completed, Report Submitted, Closed, CREATED, PUBLIC, ONGOING, FINISH`
  (bỏ `Cancelled` khỏi tập cũ). Ô KPI `internalEvents` và danh sách dùng chung tập này.
- `eventsByMonth[i] = { month, count, publicCount, internalCount }`, `count = publicCount + internalCount`.

### UC24 (Không gian thành viên)
Hiện sự kiện của CLB ở `Upcoming, Ongoing, Completed, Report Submitted, Closed` (mọi
`audienceScope`) và sự kiện nội bộ ở `PUBLIC, ONGOING, FINISH`. Không bao giờ trả `DRAFT`, `CREATED`.

## Điều chỉnh so với plan
1. Plan viết `DomainError("VALIDATION_ERROR", msg)`; code dùng `new DomainError(msg, "validation" | "conflict")`.
2. Plan đặt scheduler ở `mongo-club-event-repository.ts`; thực tế `advanceLifecycle()` nằm ở
   `mongo-event-proposal-review-repository.ts` — sửa ở đó.
3. Nhánh `direct` trong `submitVersion` (`MEMBERS_ONLY` không ngân sách → `Approved`,
   audit `RECORD_INTERNAL`) thành code chết sau Phương án B → xoá. Các guard phía đọc cho dữ liệu cũ
   (`finalize → Closed`, bỏ qua nghĩa vụ UC33) giữ nguyên để dữ liệu đã có không vỡ.
4. `seed-demo.ts` đang tạo sự kiện nội bộ qua nhánh `direct` → chuyển sang luồng mới.
5. Check-in thủ công hiện cho phép cả `Completed`; sự kiện nội bộ đối xứng: `PUBLIC, ONGOING, FINISH`.
6. Đổi lịch ở `CREATED` và `PUT` ở `CREATED` dùng chung một đường cập nhật.

## Tiêu chí nghiệm thu
- [ ] Tạo nội bộ `mode=create|publish` với `startAt < now + 24h` → 400; `>= 24h` → `CREATED` / `PUBLIC`.
- [ ] `mode=draft` với `startAt < now + 24h` → `DRAFT`; sau đó `/create` → 400.
- [ ] `PUT` ở `CREATED` đổi `startAt` về `< now + 24h` → 400; `>= 24h` → 200, vẫn `CREATED`.
- [ ] `reschedule` và `PUT` ở `PUBLIC`/`ONGOING` → 409; `cancel` → `CANCELLED`.
- [ ] Sự kiện nội bộ không tạo `eventProposalVersions`, `approvalTasks`, `eventBudgets`.
- [ ] Đề xuất `MEMBERS_ONLY` với `budgetLines: []` → 400 ở create/save/submit; có `>= 1` dòng → hợp lệ.
- [ ] Scheduler: `PUBLIC → ONGOING → FINISH`, và `PUBLIC → FINISH` khi trễ.
- [ ] `finalize`/`unlock` ở `FINISH` giữ `FINISH`; không phát sinh nghĩa vụ UC33.
- [ ] Phòng `ROOM` được cấp `Approved` cho chính CLB không gây `Blocking Conflict`; của CLB khác thì có.
- [ ] UC24 chỉ thấy sự kiện nội bộ từ `PUBLIC`; UC06 không bao giờ thấy.
- [ ] UC02 đếm/liệt kê nội bộ trừ `DRAFT`/`CANCELLED`; biểu đồ tháng trả 2 chuỗi.
- [ ] UC38/UC42 tính `FINISH` là hoàn thành, `CANCELLED` là huỷ.
- [ ] Route mới có trong OpenAPI; `npm run check` và `npm run build --workspaces` xanh.

## Ngoài phạm vi
- Migration dữ liệu sự kiện nội bộ cũ (đi nhánh `direct`) sang trạng thái mới.
- Thông báo cho thành viên khi sự kiện nội bộ được công bố.
- `occurrences`, `registrationForm`, `riskNote`, `facilityNeeds` trên form nội bộ.

## Changelog
- v1.0.0 (2026-11-14) — theo plan đã chốt cùng ngày.
